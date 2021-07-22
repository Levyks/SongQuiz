const crypto = require("crypto");

const TIME_TO_LEAVE_ROOM_AFTER_DISCONNECT = 30

class Player {

  constructor(username, room) {
    this.room = room;
    this.username = username;
    this.score = 0;
    this.isLeader = false;
    this.leaveRoomTimeout = false;
    this.token = Player.generateToken();
  }

  leaveRoom(disconnected = false) {

    if(!disconnected) this.room.currentlyConnectedPlayers -= 1;

    this.socket.leave(this.room.code);
    this.socket.removeAllListeners();
    
    delete this.room.players[this.username];

    if(this.isLeader) this.room.handleLeaderLeft();

    this.room.syncPlayersData();

    this.room.log(`Player ${this.username} left the room`);
    
    this.room.constructor.deleteRoomIfEmpty(this.room.code);
  }

  setSocket(socket) {
    if(this.socket) {
      this.socket.removeAllListeners('disconnect');
      this.socket.disconnect();
      delete this.socket;

      this.room.currentlyConnectedPlayers -= 1;
    }

    this.socket = socket;

    this.room.currentlyConnectedPlayers += 1;

    this.socket.on('roundChoice', choice => {
      this.room.game.currentRound.handleChoice(this, choice);
    });

    this.socket.on('leaveRoom', () => {
      this.leaveRoom();
    });

    this.socket.on('disconnect', () => {
      this.socket.removeAllListeners();
      delete this.socket;

      this.room.currentlyConnectedPlayers -= 1;

      this.room.syncPlayersData();

      this.room.log(`Player ${this.username} disconnected`);

      if(!this.room.currentlyConnectedPlayers) {
        this.room.constructor.scheduleDeleteRoomIfEmpty(this.room.code);    
      }
      
      this.room.log(`Player ${this.username} will be kicked in ${TIME_TO_LEAVE_ROOM_AFTER_DISCONNECT} seconds if he doesn't rejoin`);
      this.leaveRoomTimeout = setTimeout(() => {this.leaveRoom(true)}, TIME_TO_LEAVE_ROOM_AFTER_DISCONNECT * 1000);

    });
  }

  serialize() {
    let playerSerializedData = {
      username: this.username,
      score: this.score,
      isLeader: this.isLeader,
      isConnected: !!this.socket
    }
    return playerSerializedData;
  }

  sendPlayerData(socket = this.socket) {
    socket.emit('updatePlayerData', {
      username: this.username,
      token: this.token,
      isLeader: this.isLeader
    });
  }

  static generateToken() {
    return crypto.randomBytes(48).toString('hex');
  }

  static isTheSame(credentials, player){
    return credentials.username === player.username && credentials.token === player.token;
  }

}

module.exports = Player;