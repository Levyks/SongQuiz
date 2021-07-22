const Player = require("./Player");
const Game = require("./Game");
const Spotify = require('./Spotify');

const TIME_BEFORE_DELETING_ROOM = 30
const DEFAULT_NUMBER_OF_ROUNDS = 10;
const DEFAULT_TIME_PER_ROUND = 15;
const NUMBER_OF_CHOICES = 4;
const MAX_NUM_OF_TRIES_GEN_CODE = 10000;

class Room {
  static rooms = {}

  constructor(socket, username) {
    try{
      this.deletionTimeOut = false;
      this.players = {};
      this.currentlyConnectedPlayers = 0;

      this.numberOfRounds = DEFAULT_NUMBER_OF_ROUNDS;
      this.timePerRound = DEFAULT_TIME_PER_ROUND;
      this.choicesPerRound = NUMBER_OF_CHOICES;

      this.code = Room.getUniqueRoomCode(); 
      this.ioChannel = Room.io.in(this.code);

      Room.rooms[this.code] = this;
      
      this.currentlyIn = 'lobby';

      this.game = new Game(this);

      this.leader = new Player(username, this);
      this.leader.isLeader = true;
      this.leader.sendPlayerData(socket);

      this.log(`Room created by ${this.leader.username}`);

      Room.scheduleDeleteRoomIfEmpty(this.code);

      Room.sendResponse("createRoomResponse", socket, {roomCode: this.code});
    } catch(err) {
      this.log(`Error while creating room: ${err}`);
      Room.sendResponse("createRoomResponse", socket, {}, 500);
      Room.deleteRoomIfEmpty(this.code);
    }
  }

  static sendResponse(responseName, socket, data, status = 200) {
    socket.emit(responseName, {
      status: status,
      ...data, 
    });
  }

  getPlaylistWithoutTracks() {
    const playlist = Object.assign({}, this.playlist);
    if(playlist.tracks) delete playlist.tracks;
    return playlist;
  }

  setPlaylist(playlistUrl = this.playlistUrl) {
    
    //Only run this code if it's a new playlist URL
    if(playlistUrl != this.playlistUrl) {
      this.playlistUrl = playlistUrl;
      this.playlist = undefined;

      //Only run this if the URL is not an empty string
      if(playlistUrl) {
        Spotify.getPlaylistInfo(playlistUrl).then(info => {
          this.playlist = {info};
          this.playlist.info.set = true;
          this.playlist.info.tracksLoaded = false;

          this.sendSyncEvent({
            type: 'playlistUpdate',
            data: this.getPlaylistWithoutTracks()
          });

          this.log(`Playlist info fetched, playlist: ${this.playlist.info.name}`);

          Spotify.getPlaylistTracks(playlistUrl).then(tracks => {
            this.playlist.tracks = tracks;
            this.playlist.info.numberOfValidSongs = this.playlist.tracks.length;
            this.playlist.info.tracksLoaded = true;
            this.playlist.info.tooSmall = this.playlist.info.numberOfValidSongs < this.choicesPerRound + this.numberOfRounds - 1;

            this.sendSyncEvent({
              type: 'playlistUpdate',
              data: this.getPlaylistWithoutTracks()
            });

            this.log(`Playlist tracks fetched, number of valid songs: ${this.playlist.info.numberOfValidSongs}`);
            if(this.playlist.info.tooSmall) this.log("Playlist is too small");

          });
        }).catch(error => {
          this.playlist = {
            info: {
              set: false
            }
          }
          if(error.response) {
            const status = error.response.status;
            const message = (error.response.data && error.response.data.error && error.response.data.error.message) || error.response.message || error.response.statusText;
            this.playlist.info.error = {status, message};
          } else {
            this.playlist.info.error = {
              status: 500,
              message: "Unknown Error"
            }
          }
          this.sendSyncEvent({
            type: 'playlistUpdate',
            data: this.getPlaylistWithoutTracks()
          });

          this.log(`Error while fetching playlist, ${this.playlist.info.error.status} | ${this.playlist.info.error.message}`);

        });
      } else {
        this.sendSyncEvent({
          type: 'playlistUpdate',
          data: this.getPlaylistWithoutTracks()
        });
      }

    //This code will run when this method is called without an URL (when the number of rounds update)
    } else {
      if (this.playlist && this.playlist.info.numberOfValidSongs) {
      this.playlist.info.tooSmall = this.playlist.info.numberOfValidSongs < this.choicesPerRound + this.numberOfRounds - 1; 
      
      this.log(`Number of rounds updated, the playlist is ${this.playlist.info.tooSmall ? 'too small' : 'big enough'}`);
      }

      this.sendSyncEvent({
        type: 'playlistUpdate',
        data: this.getPlaylistWithoutTracks()
      });
    }

  }

  setNumberOfRounds(numberOfRounds) {
    if(isNaN(numberOfRounds)) return;
    this.numberOfRounds = Math.max(1, Math.ceil(numberOfRounds));
    this.sendSyncEvent({
      type: 'numberOfRoundsUpdate',
      data: this.numberOfRounds
    });
  }

  setTimePerRound(timePerRound) {
    if(isNaN(timePerRound)) return;
    this.timePerRound = Math.max(5, Math.ceil(timePerRound));
    this.sendSyncEvent({
      type: 'timePerRoundUpdate',
      data: this.timePerRound
    });
  }
  

  setLeaderListeners(socket = this.leader.socket){
    socket.on("setPlaylist", (playlistUrl) => {this.setPlaylist(playlistUrl)});
    socket.on("setNumberOfRounds", (numberOfRounds) => {this.setNumberOfRounds(numberOfRounds)});
    socket.on("setTimePerRound", (timePerRound) => {this.setTimePerRound(timePerRound)});

    socket.on("startGame", () => {this.game.startGame()});
    socket.on("backToLobby", () => {this.backToLobby()});
  }

  backToLobby() {
    this.log("Going back to the lobby");
    this.currentlyIn = 'lobby';
    this.game = new Game(this);
    Object.keys(this.players).forEach(key => {
      this.players[key].score = 0;
    });
    this.sendSyncEvent({
      type: 'backToLobby'
    });
    this.syncPlayersData();
  }

  connectPlayer(data, socket) {
    try {
      let player;

      //If player is the leader
      if(data.playerData.isLeader && Player.isTheSame(data.playerData, this.leader)) {
        player = this.leader;
        this.setLeaderListeners(socket);
        this.log(`Leader ${player.username} (re)connected`);

      //If player was previously connected  
      } else if (this.players[data.playerData.username]){
        //If we can authenticate that this user is the same a last time, reconnect it
        if(Player.isTheSame(data.playerData, this.players[data.playerData.username])) {
          player = this.players[data.playerData.username];

          this.log(`Player ${player.username} reconnected`);

        //If not, refuse it
        } else {
          Room.sendResponse("connectToRoomResponse", socket, {messageI18n: "room.playerAlreadyExists"}, 409);
          this.log(`Someone else tried to join with the username "${data.playerData.username}" and was blocked`);
          return;
        }

      //If it's a new player
      } else {
        player = new Player(data.playerData.username, this);
        this.log(`Player ${player.username} connected`);
      }

      if(player.leaveRoomTimeout){
        this.log(`Schedule kick for ${player.username} canceled`);
        clearTimeout(player.leaveRoomTimeout);
        player.leaveRoomTimeout = false;
      }

      if(this.deletionTimeOut) {
        clearTimeout(this.deletionTimeOut)
        this.deletionTimeOut = false;
        this.log("Scheduled deletion canceled");
      }

      player.setSocket(socket);

      player.socket.join(this.code);

      player.sendPlayerData();

      this.players[player.username] = player;

      this.sendSyncEvent({type: "all", data: this.getRoomState()}, player);

      this.syncPlayersData();

      Room.sendResponse("connectToRoomResponse", socket, {roomCode: this.code});
    } catch(err) {
      this.log(`Error while connecting player "${data.playerData.username}": ${err}`);
      Room.sendResponse("connectToRoomResponse", socket, {}, 500);
    }
  }

  syncPlayersData(){
    this.ioChannel.emit('syncPlayersData', this.getPlayerList());
  }

  getPlayerList(){
    let playerList = [];
    if(!this.game.started) playerList.push(this.leader.serialize());
    Object.keys(this.players).forEach(key => {
      if(!this.game.started && this.players[key].isLeader) return;
      playerList.push(this.players[key].serialize()); 
    });
    if(this.game.started) {
      playerList.sort((a,b) => a.score < b.score ? 1 : -1);
    } 
    return playerList;
  }

  handleLeaderLeft() {
    if(this.currentlyConnectedPlayers <= 0) return;
    const playersKeys = Object.keys(this.players);
    
    this.leader = this.players[playersKeys[Math.floor(Math.random() * playersKeys.length)]];

    this.leader.isLeader = true

    this.setLeaderListeners();

    Room.sendResponse("connectToRoomResponse", this.leader.socket, {roomCode: this.code, playerData: this.leader.serialize(true)});

    this.log(`The previous leader left, ${this.leader.username} was randomly picked as the new leader`);
  }

  getRoomState(targetPlayer = false) {
    let roomState = {
      currentlyIn: this.currentlyIn,
      playlist: this.playlist && {
        info: this.playlist.info
      },
      numberOfRounds: this.numberOfRounds,
      timePerRound: this.timePerRound,
      targeted: !!targetPlayer
    };

    if(this.currentlyIn === 'game' || this.currentlyIn === 'finalResults') roomState.game = this.game.getGameState(targetPlayer);

    return roomState;
  }

  sendSyncEvent(data, targetPlayer = false) {
    //If there's a targeted player, only send to him, if not, send to the entire channel
    const socket = targetPlayer ? targetPlayer.socket : this.ioChannel;

    socket.emit('syncEvent', data);
  }

  log(message) {
    console.log(`[${this.code || "No code"}] | ${new Date().toLocaleTimeString()} -> ${message}`);
  }

  static getRandomRoomCode(){
    return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  }

  static getUniqueRoomCode(){
    let generatedCode = Room.getRandomRoomCode();
    let timesTried = 1;
    while(Room.rooms[generatedCode]){
      if(timesTried > MAX_NUM_OF_TRIES_GEN_CODE) throw(`Code could not be generated after ${MAX_NUM_OF_TRIES_GEN_CODE} tries`);
      generatedCode = Room.getRandomRoomCode();
      timesTried += 1;
    } 
    return generatedCode;
  }

  static findRoomAndConnect(data, socket) {
    const room = Room.rooms[data.code];
    if(room){
      room.connectPlayer(data, socket);
    } else {
      Room.sendResponse("connectToRoomResponse", socket, {error: "not found"}, 404);
    }
  }

  static deleteRoomIfEmpty(roomCode) {
    const room = Room.rooms[roomCode];
    if(room && !room.currentlyConnectedPlayers) {
      room.log("No one left in the room, deleting it");
      room.deleted = true;
      delete Room.rooms[roomCode];
    }
  }

  static scheduleDeleteRoomIfEmpty(roomCode) {
    const room = Room.rooms[roomCode];
    room.log(`No one left in the room, deleting it in ${TIME_BEFORE_DELETING_ROOM} seconds if no one joins`)
    room.deletionTimeOut = setTimeout(() => {
      Room.deleteRoomIfEmpty(roomCode)
    }, TIME_BEFORE_DELETING_ROOM * 1000) ;
  }


}

module.exports = Room;