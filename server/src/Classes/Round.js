const TIME_TO_CLOSE_OFFSET = 1;

class Round {
  constructor(number, game) {
    this.number = number;

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

    this.songToPlayUrl = this.choices[this.correctChoice].preview_url;
  }

  startRound() {
    this.room.log(`Round ${this.number} starting, the correct choice is ${this.correctChoice}`);
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

    //Remove song that was just played from the list of available songs in the game (so it does not repeat)
    this.room.game.playlistTracks.splice(this.correctChoiceIndex, 1);
    this.game.numberOfValidSongs -= 1;
    
    //Schedules next round
    this.game.scheduleNextRound();

    //Changes round current phase and sync
    this.currentPhase = 'results';
    this.room.syncRoomState();
    this.room.syncPlayersData();

    //Sends data of the song that was just played to the clients to be added to the history
    this.room.ioChannel.emit('addSongToHistory', this.choices[this.correctChoice]);
  }

  getTimeRemaining(round = true) {
    let timeRemaining = this.game.timePerRound - (Date.now() - this.startedAt)/1000;
    if(round) timeRemaining = Math.ceil(timeRemaining);

    return timeRemaining;
  }

  getTimeRemainingForNextRound(round = true) {
    let timeRemaining = this.game.timeBetweenRounds - (Date.now() - this.game.nextRoundTimerStartedAt)/1000;
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
        trackToPlay: this.songToPlayUrl,
        number: this.number,
        remainingTime: this.getTimeRemaining(),
        choosenOption: this.playersAnswers[targetPlayer.username] ? this.playersAnswers[targetPlayer.username].choosenOption : false
      }
    } else if (this.currentPhase === 'results') {
      roundState = {
        ...roundState, 
        number: this.number,
        playersThatGotItRight: this.playersThatGotItRight,
        correctChoice: this.correctChoice,
        timeRemainingForNextRound: this.getTimeRemainingForNextRound(),
        lastOne: this.number == (this.game.numberOfRounds - 1)
      }
    }
    return roundState;
  }

  handleChoice(player, choice) {
    if(this.currentPhase !== 'playing' || this.playersAnswers[player.username]) return;

    const gotItRight = choice == this.correctChoice;

    const score = gotItRight ?
      Math.max(Math.ceil((this.getTimeRemaining(false)/this.game.timePerRound) * 200 ) + 100, 100) : 0;

    this.playersAnswers[player.username] = {gotItRight, choosenOption: choice, score};

  }
}

module.exports = Round;