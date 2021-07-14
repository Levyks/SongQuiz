const TIME_TO_CLOSE_OFFSET = 1;
const TIME_BETWEEN_ROUNDS = 4;

class Round {
  constructor(roundNumber, game) {
    this.roundNumber = roundNumber;

    this.game = game;
    this.room = this.game.room;
    this.players = this.room.players;
    this.playersAnswers = {};
  
    this.generateRoundType();
    this.generateChoices(4);
  }

  generateRoundType() {
    this.roundType = Math.random() < 0.5 ? "artist" : "song";
    this.roundType = "song"; //JUST FOR TESTS
    return this.roundType; 
  }

  generateChoices(numberOfChoices) {
    const indexes = [];
    const numberOfValidSongs = this.game.playlist.info.valid_songs;
    
    while(indexes.length < numberOfChoices) {
      const randomIndex = Math.floor(Math.random()*numberOfValidSongs);
      if(!indexes.includes(randomIndex)) indexes.push(randomIndex);
    }

    this.correctChoice = Math.floor(Math.random()*numberOfChoices);

    this.choices = []

    indexes.forEach(index => {
      this.choices.push(this.game.playlistTracks[index]);
    })
  }

  startRound() {
    this.room.log(`Round ${this.roundNumber} starting, the correct choice is ${this.correctChoice}`);
    this.game.started = true;

    this.currentPhase = 'playing';
    this.startedAt = Date.now();
    
    this.room.syncRoomState();

    setTimeout(() => {this.endRound()}, (this.game.timePerRound + TIME_TO_CLOSE_OFFSET) * 1000);
  }

  endRound() {
    this.currentPhase = 'results';

    this.playersThatGotItRight = [];

    Object.keys(this.playersAnswers).forEach(username => {
      if(this.playersAnswers[username].gotItRight) {
        this.playersThatGotItRight.push({
          username,
          score: this.playersAnswers[username].score
        });
        this.players[username].score += this.playersAnswers[username].score;
      }
    });
    this.playersThatGotItRight.sort((a, b) => a.score < b.score ? 1 : -1);

    this.nextRoundTimerStartedAt = Date.now();
    setTimeout(() => {
      if(this.room.constructor.rooms[this.room.code]){
        this.game.startRound(this.roundNumber+1);
      }
    }, TIME_BETWEEN_ROUNDS * 1000);

    this.room.syncRoomState();
    this.room.syncPlayersData();
  }

  getTimeRemaining(justStarted = false, round = true) {
    if(justStarted) return this.game.timePerRound;
    let timeRemaining = this.game.timePerRound - (Date.now() - this.startedAt)/1000;
    if(round) timeRemaining = Math.ceil(timeRemaining);

    return timeRemaining;
  }

  getTimeRemainingForNextRound(justStarted = false, round = true) {
    if(justStarted) return TIME_BETWEEN_ROUNDS;
    let timeRemaining = TIME_BETWEEN_ROUNDS - (Date.now() - this.nextRoundTimerStartedAt)/1000;
    if(round) timeRemaining = Math.ceil(timeRemaining);

    return timeRemaining;
  }

  getRoundState(justStarted = false) {
    let roundState = {
      currentPhase: this.currentPhase
    };
    if(this.currentPhase === 'playing'){
      roundState = {
        ...roundState,
        type: this.roundType,
        choices: this.choices,
        trackToPlay: this.choices[this.correctChoice].preview_url,
        number: this.roundNumber,
        remainingTime: this.getTimeRemaining(justStarted)
      }
    } else if (this.currentPhase === 'results') {
      roundState = {
        ...roundState, 
        number: this.roundNumber,
        playersThatGotItRight: this.playersThatGotItRight,
        correctChoice: this.correctChoice,
        timeRemainingForNextRound: this.getTimeRemainingForNextRound()
      }
    }
    return roundState;
  }

  handleChoice(player, choice) {
    if(this.currentPhase !== 'playing' || this.playersAnswers[player.username]) return;

    this.playersAnswers[player.username] = {
      gotItRight: choice == this.correctChoice,
      score: choice == this.correctChoice ? Math.ceil((this.getTimeRemaining(false, false)/this.game.timePerRound) * 200 ) + 100 : 0
    }
  }
}

module.exports = Round;