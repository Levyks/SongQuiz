const Player = require("./Player");
const Game = require("./Game");
const Spotify = require('./Spotify');

const TIME_BEFORE_DELETING_ROOM = 30
const DEFAULT_NUMBER_OF_ROUNDS = 10;
const DEFAULT_TIME_PER_ROUND = 15;
const NUMBER_OF_CHOICES = 4;

class Room {
  static rooms = {}

  constructor(socket, username) {
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

    this.log(`Room created by ${this.leader.username}`);

    Room.sendResponse("createRoomResponse", socket, {roomCode: this.code, playerData: this.leader.serialize(true)});
  }

  static sendResponse(responseName, socket, data, status = 200) {
    socket.emit(responseName, {
      status: status,
      ...data, 
    });
  }

  async setPlaylist(playlistUrl = this.playlistUrl) {
    
    if(playlistUrl != this.playlistUrl) this.playlist = playlistUrl ? await Spotify.getPlaylistInfo(playlistUrl) : undefined;
    this.playlistUrl = playlistUrl;

    this.playlistSet = this.playlist && this.playlist.status === 200;
    this.playlistTooSmall = this.playlistSet && this.playlist.info.valid_songs < this.choicesPerRound + this.numberOfRounds - 1;

    if(this.playlistSet) {
      this.log(`Playlist set succesfuly to ${this.playlist.info.name}`);
    } else if(this.playlist) {
      if (this.playlistTooSmall) {
        this.log(`Playlist is too small`);
      } else {
        this.log(`Playlist not set, reason: Error ${this.playlist.status}`);
      }
    } else {
      this.log(`Playlist unset`);
    }

    this.syncRoomState(true);

  }

  setNumberOfRounds(numberOfRounds) {
    if(isNaN(numberOfRounds)) return;
    this.numberOfRounds = Math.max(1, Math.ceil(numberOfRounds));
    this.setPlaylist();
    this.syncRoomState();
  }

  setTimePerRound(timePerRound) {
    if(isNaN(timePerRound)) return;
    this.timePerRound = Math.max(5, Math.ceil(timePerRound));
    this.syncRoomState();
  }
  

  setLeaderListeners(socket){
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
    this.syncRoomState();
    this.syncPlayersData();
  }

  connectPlayer(data, socket) {
    let player;

    //If player is the leader
    if(data.playerData.isLeader && Player.isTheSame(data.playerData, this.leader)) {
      player = this.leader;
      this.setLeaderListeners(socket);
      this.log(`Leader ${player.username} (re)connected`);

    //If player was previously connected  
    } else if (this.players[data.playerData.username] && Player.isTheSame(data.playerData, this.players[data.playerData.username])) {
      player = this.players[data.playerData.username];
      this.log(`Player ${player.username} reconnected`)

    //If it's a new player
    } else {
      player = new Player(data.playerData.username, this);
      this.log(`Player ${player.username} connected`);
    }

    if(this.deletionTimeOut) {
      clearTimeout(this.deletionTimeOut)
      this.deletionTimeOut = false;
      this.log("Scheduled deletion canceled");
    }

    player.setSocket(socket);

    this.players[player.username] = player;

    player.socket.join(this.code);

    this.syncRoomState(false, socket);

    this.syncPlayersData();

    Room.sendResponse("connectToRoomResponse", socket, {roomCode: this.code, playerData: player.serialize(true)});
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

  syncRoomState(triggeredByPlaylistChange = false, socket = this.ioChannel) {
    let roomState = {
      currentlyIn: this.currentlyIn,
      playlist: this.playlist,
      playlistTooSmall: !!this.playlistTooSmall,
      numberOfRounds: this.numberOfRounds,
      timePerRound: this.timePerRound,
      triggeredByPlaylistChange
    };
    if(this.game.started) {
      roomState.game = this.game.getGameState();
    }

    socket.emit('syncRoomState', roomState);
  }

  log(message) {
    console.log(`[${this.code}] | ${new Date().toLocaleTimeString()} -> ${message}`);
  }

  static getRandomRoomCode(){
    return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  }

  static getUniqueRoomCode(){
    let generatedCode = Room.getRandomRoomCode();
    while(Room.rooms[generatedCode]) generatedCode = this.getRandomRoomCode();
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
    if(!room.currentlyConnectedPlayers) {
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