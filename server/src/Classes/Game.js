const Spotify = require('./Spotify');
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

    this.room.log("Starting Game");
    this.room.currentlyIn = 'game';
    this.room.syncRoomState();

    if(!this.room.playlistSet || this.room.playlistTooSmall) return;

    this.playlistUrl = this.room.playlistUrl;
    this.playlist = this.room.playlist;
    this.numberOfValidSongs = this.playlist.info.valid_songs;

    this.numberOfRounds = this.room.numberOfRounds;
    this.timePerRound = this.room.timePerRound;

    this.room.log("Starting to fetch tracks");

    Spotify.getPlaylistTracks(this.playlistUrl).then(tracks => {
      this.room.log("All tracks fetched");

      this.playlistTracks = tracks;

      this.scheduleNextRound(true);
    })
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
    }, isFirstRound ? 0 : this.timeBetweenRounds * 1000);
  }

  startNextRound() {
    this.currentRound = this.nextRound;
    this.nextRound = false;

    this.currentRound.startRound();
  }

  getGameState(targetPlayer = false){
    let gameState = {};
    if(this.room.currentlyIn == "game"){
      gameState.currentRound = this.currentRound.getRoundState(targetPlayer);
      if(this.nextRound) gameState.nextRoundSongUrl = this.nextRound.songToPlayUrl;
    } 
    else if(this.room.currentlyIn == "finalResults") gameState.results = this.room.getPlayerList();

    return gameState;
  }


}

module.exports = Game;