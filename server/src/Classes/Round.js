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
    this.generateChoices(this.room.choicesPerRound);
  }

  generateRoundType() {
    this.roundType = Math.random() < 0.5 ? "artist" : "song";
    this.roundType = "song"; //JUST FOR TESTS
    return this.roundType; 
  }

  generateChoices(numberOfChoices) {
    const numberOfValidSongs = this.game.numberOfValidSongs;
    
    //Generates an array of {numberOfChoices} unique indexes
    const choicesIndexes = [];
    while(choicesIndexes.length < numberOfChoices) {
      const randomIndex = Math.floor(Math.random()*numberOfValidSongs);
      if(!choicesIndexes.includes(randomIndex)) choicesIndexes.push(randomIndex);
    }

    //Generates the correct choice 
    this.correctChoice = Math.floor(Math.random()*numberOfChoices);
    this.correctChoiceIndex = choicesIndexes[this.correctChoice];

    //Generates an array with the songs with the indexes previously generated
    this.choices = [];
    choicesIndexes.forEach(choiceIndex => {
      this.choices.push(this.game.playlistTracks[choiceIndex]);
    });
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
    if(!this.room || this.room.deleted) return;

    //Generates an array with the players that got it right [{username, score}, ...]
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

    //Sorts the array
    this.playersThatGotItRight.sort((a, b) => a.score < b.score ? 1 : -1);

    //Starts the timer for the next round to start
    this.nextRoundTimerStartedAt = Date.now();
    setTimeout(() => {
      if(this.room.constructor.rooms[this.room.code]){
        this.game.startRound(this.roundNumber+1);
      }
    }, TIME_BETWEEN_ROUNDS * 1000);

    this.currentPhase = 'results';

    //Sends data of the song that was just played to the clients to be added to the history
    this.room.ioChannel.emit('addSongToHistory', this.choices[this.correctChoice]);

    //Remove song that was just played from the list of available songs in the game (so it does not repeat)
    this.room.game.playlistTracks.splice(this.correctChoiceIndex, 1);
    this.game.numberOfValidSongs -= 1;
    
    //Changes round current phase and sync
    this.currentPhase = 'results';
    this.room.syncRoomState();
    this.room.syncPlayersData();
  }

  getTimeRemaining(round = true) {
    let timeRemaining = this.game.timePerRound - (Date.now() - this.startedAt)/1000;
    if(round) timeRemaining = Math.ceil(timeRemaining);

    return timeRemaining;
  }

  getTimeRemainingForNextRound(round = true) {
    let timeRemaining = TIME_BETWEEN_ROUNDS - (Date.now() - this.nextRoundTimerStartedAt)/1000;
    if(round) timeRemaining = Math.ceil(timeRemaining);

    return timeRemaining;
  }

  getRoundState(targetPlayer = false) {
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
        remainingTime: this.getTimeRemaining(),
        choosenOption: this.playersAnswers[targetPlayer.username] ? this.playersAnswers[targetPlayer.username].choosenOption : false
      }
    } else if (this.currentPhase === 'results') {
      roundState = {
        ...roundState, 
        number: this.roundNumber,
        playersThatGotItRight: this.playersThatGotItRight,
        correctChoice: this.correctChoice,
        timeRemainingForNextRound: this.getTimeRemainingForNextRound(),
        lastOne: this.roundNumber == (this.game.numberOfRounds - 1)
      }
    }
    return roundState;
  }

  handleChoice(player, choice) {
    if(this.currentPhase !== 'playing' || this.playersAnswers[player.username]) return;

    this.playersAnswers[player.username] = {
      gotItRight: choice == this.correctChoice,
      choosenOption: choice,
      score: choice == this.correctChoice ? Math.ceil((this.getTimeRemaining(false)/this.game.timePerRound) * 200 ) + 100 : 0
    }
  }
}

module.exports = Round;