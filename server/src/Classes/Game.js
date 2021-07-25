const Round = require('./Round');

const TIME_BETWEEN_ROUNDS = 5;

class Game {
  constructor(room) {
    this.timeBetweenRounds = TIME_BETWEEN_ROUNDS;

    this.room = room;
    this.started = false;
    this.currentRound;
  }

  startGame() {
    if(!this.room.playlist || !this.room.playlist.info.set || this.room.playlist.info.tooSmall) return;

    if(!this.room.originalPlaylist) this.room.originalPlaylist = {
      info: this.room.playlist.info,
      tracks: this.room.playlist.tracks.slice()
    };

    this.numberOfRounds = this.room.numberOfRounds;
    this.timePerRound = this.room.timePerRound;

    this.room.log("Starting Game");

    this.scheduleNextRound(true);

    this.started = true;
    this.room.currentlyIn = 'game';

    this.room.sendSyncEvent({
      type: 'startingGame',
      data: this.getGameState()
    });
  }

  endGame() {
    this.room.log("Game has ended");
    this.room.currentlyIn = "finalResults";
    this.room.sendSyncEvent({
      type: 'endingGame',
      data: this.room.getPlayerList()
    });
  }

  scheduleNextRound(isFirstRound = false) {
    const nextRoundNumber = isFirstRound ? 0 : this.currentRound.number + 1;

    const wasThisTheLastRound = nextRoundNumber >= this.numberOfRounds;

    this.nextRound = wasThisTheLastRound ? {trackToPlay: false} : new Round(nextRoundNumber, this);

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
    if(this.currentRound) gameState.currentRound = this.currentRound.getRoundState(targetPlayer);
  
    if(this.nextRound) gameState.nextRound = this.getNextRoundState();

    return gameState;
  }

  getNextRoundState() {
    return {
      trackToPlay: this.nextRound.songToPlayUrl,
      startsIn: this.getTimeRemainingForNextRound()
    };
  }

}

module.exports = Game;