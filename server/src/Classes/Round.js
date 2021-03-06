const TIME_TO_CLOSE_OFFSET = 1;

class Round {
  constructor(number, game, startsIn = 0) {
    this.number = number;

    this.game = game;
    this.room = this.game.room;
    this.players = this.room.players;
    this.playersAnswers = {};

    this.startsIn = startsIn;
    this.currentPhase = 'scheduled';
  
    this.generateRoundType();
    this.generateChoices(this.room.choicesPerRound);
  }

  generateRoundType() {
    this.roundType = Math.random() < 0.5 ? "artist" : "song";
    this.roundType = "song"; //JUST FOR TESTS
    return this.roundType; 
  }

  generateChoices(numberOfChoices) {
    const numberOfValidSongs = this.room.playlist.tracks.length;
    
    //Generates an array of {numberOfChoices} unique indexes
    const choicesIndexes = [];
    while(choicesIndexes.length < numberOfChoices) {
      const randomIndex = Math.floor(Math.random()*numberOfValidSongs);
      if(!choicesIndexes.includes(randomIndex)) choicesIndexes.push(randomIndex);
    }

    //Generates the correct choice 
    this.correctChoice = Math.floor(Math.random()*numberOfChoices); //Relative index, i.e: from 0 to 3
    this.correctChoiceIndex = choicesIndexes[this.correctChoice]; //Absolute index, referent to the original tracks array

    //Generates an array with the songs with the indexes previously generated
    this.choices = [];
    choicesIndexes.forEach(choiceIndex => {
      const track = this.room.playlist.tracks[choiceIndex];

      if(this.roundType === 'song') {
        this.choices.push(track.name);
      } else {
        this.choices.push(track.artists);
      }
    });

    this.songToPlayUrl = this.room.playlist.tracks[this.correctChoiceIndex].preview_url;
  }

  startRound() {
    this.room.log(`Round ${this.number} starting, the correct choice is ${this.correctChoice}`);

    this.currentPhase = 'playing';
    this.startedAt = Date.now();

    this.room.sendSyncEvent({
      type: 'startingRound',
      data: this.game.getGameState()
    });

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

    const trackThatJustPlayed = this.room.playlist.tracks[this.correctChoiceIndex];

    //Remove song that was just played from the list of available songs in the game (so it does not repeat)
    this.room.playlist.tracks.splice(this.correctChoiceIndex, 1);
    
    //Schedules next round
    this.game.scheduleNextRound();

    //Changes round current phase and sync
    this.currentPhase = 'results';
    
    this.room.sendSyncEvent({
      type: 'endingRound',
      data: this.game.getGameState()
    });

    this.room.syncPlayersData();

    //Sends data of the song that was just played to the clients to be added to the history
    this.room.ioChannel.emit('addSongToHistory', trackThatJustPlayed);

  }

  getTimeRemaining(round = true) {
    let timeRemaining = this.game.timePerRound - (Date.now() - this.startedAt)/1000;
    if(round) timeRemaining = Math.ceil(timeRemaining);

    return timeRemaining;
  }

  getRoundState(targetPlayer = false) {
    let roundState = {
      currentPhase: this.currentPhase
    };
    switch (this.currentPhase) {
      case 'playing':
        roundState = {
          ...roundState,
          type: this.roundType,
          choices: this.choices,
          trackToPlay: this.songToPlayUrl,
          number: this.number,
          remainingTime: this.getTimeRemaining()
        }
        if(targetPlayer) roundState.choosenOption = this.playersAnswers[targetPlayer.username] ? this.playersAnswers[targetPlayer.username].choosenOption : false;
        
        break;

      case'results':
        roundState = {
          ...roundState, 
        ...roundState, 
          ...roundState, 
          number: this.number,
          playersThatGotItRight: this.playersThatGotItRight,
          correctChoice: this.correctChoice,
          lastOne: this.number == (this.game.numberOfRounds - 1)
        }
        break;

      default:
        break;
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