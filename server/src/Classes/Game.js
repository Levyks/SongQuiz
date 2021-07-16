const Spotify = require('./Spotify');
const Round = require('./Round');

class Game {
  constructor(room) {
    this.room = room;
    this.started = false;
    this.rounds = [];
    this.currentRound;
  }

  startGame() {

    this.room.log("Starting Game");
    this.room.currentlyIn = 'game';
    this.room.syncRoomState();

    if(!this.room.playlistSet || this.room.playlistTooSmall) return;

    this.playlistUrl = this.room.playlistUrl;
    this.playlist = this.room.playlist;

    this.numberOfRounds = this.room.numberOfRounds;
    this.timePerRound = this.room.timePerRound;

    this.room.log("Starting to fetch tracks");

    Spotify.getPlaylistTracks(this.playlistUrl).then(tracks => {
      this.room.log("All tracks fetched");

      this.playlistTracks = tracks;

      this.startRound(0);
    })
  }

  endGame() {
    this.room.log("Game has ended");
    this.room.currentlyIn = "finalResults";
    this.room.syncRoomState();
  }

  startRound(roundNumber) {
    if(roundNumber >= this.numberOfRounds) {
      this.endGame();
      return;
    }
    const round = new Round(roundNumber, this);
    this.rounds.push(round);
    this.currentRound = round;
    round.startRound();
  }

  getGameState(targetPlayer = false){
    let gameState = {};
    if(this.room.currentlyIn == "game") gameState.currentRound = this.currentRound.getRoundState(targetPlayer);
    else if(this.room.currentlyIn == "finalResults") gameState.results = this.room.getPlayerList();

    return gameState;
  }


}

module.exports = Game;