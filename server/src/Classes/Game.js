const Round = require('./Round');

const TIME_BETWEEN_ROUNDS = 4;

class Game {
  constructor(room) {
    this.timeBetweenRounds = TIME_BETWEEN_ROUNDS;

    this.room = room;
    this.started = false;
    this.currentRound;
  }

  startGame() {
    if(!this.room.playlist || !this.room.playlist.info.set || this.room.playlist.info.tooSmall) return;

    this.playlist = {
      info: this.room.playlist.info,
      tracks: this.room.playlist.tracks.slice()
    }

    this.numberOfRounds = this.room.numberOfRounds;
    this.timePerRound = this.room.timePerRound;

    this.scheduleNextRound(true);

    this.room.log("Starting Game");
    this.room.currentlyIn = 'game';
    this.room.syncRoomState();

  }

  endGame() {
    this.room.log("Game has ended");
    this.room.currentlyIn = "finalResults";
    this.room.syncRoomState();
  }

  scheduleNextRound(isFirstRound = false) {
    const nextRoundNumber = isFirstRound ? 0 : this.currentRound.number + 1;

    const wasThisTheLastRound = nextRoundNumber >= this.numberOfRounds;
 
    if(!wasThisTheLastRound) this.nextRound = new Round(nextRoundNumber, this);

    this.nextRoundTimerStartedAt = Date.now();
    setTimeout(() => {
      //Check if room still exists
      if(this.room.constructor.rooms[this.room.code]){
        if(wasThisTheLastRound) {
          this.endGame();
        } else {
          this.startNextRound();
        }
      }
    }, this.timeBetweenRounds * 1000);
  }

  startNextRound() {
    this.currentRound = this.nextRound;
    this.nextRound = false;
    this.nextRoundTimerStartedAt = false;

    this.currentRound.startRound();
  }

  getTimeRemainingForNextRound(round = true) {
    let timeRemaining = this.timeBetweenRounds - (Date.now() - this.nextRoundTimerStartedAt)/1000;
    if(round) timeRemaining = Math.ceil(timeRemaining);

    return timeRemaining;
  }

  getGameState(targetPlayer = false){
    let gameState = {};
    if(this.room.currentlyIn == "game"){
      if(this.started) {
        gameState.currentRound = this.currentRound.getRoundState(targetPlayer);
      }
      if(this.nextRound) {
        gameState.nextRoundSongUrl = this.nextRound.songToPlayUrl;
      } 
      if(this.nextRoundTimerStartedAt) {
        gameState.timeRemainingForNextRound = this.getTimeRemainingForNextRound();
      }
    } 
    else if(this.room.currentlyIn == "finalResults") gameState.results = this.room.getPlayerList();

    return gameState;
  }

}

module.exports = Game;