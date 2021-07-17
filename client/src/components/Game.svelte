<script>
  import { onMount } from 'svelte';
  import { _ } from '../services/i18n.js';

  import MainCardHeader from './MainCardHeader.svelte';
  import Results from './Results.svelte';
  
  export let socket;
  export let roomState;
  export let playerData;

  let choicesButtonsData = [];

  let choosenChoice = false;
  let correctChoice = false;
  let wrongChoice = false;
  
  let showRoundResults = false;

  let showButtonToInteract = false;

  let timeRemaining = 0;

  let nextRoundTimer;
  let nextRoundStartsIn;

  let volume = parseInt(localStorage.getItem('defaultVolume')) || 50;

  let audioElement;

  $: trackRoomStateChange(roomState);

  function trackRoomStateChange(state) {

    if(!state.game.currentRound) {
      setNextRoundTimer();
      setAudioElementSrc(state.game.nextRoundSongUrl);
      return;
    }

    switch(state.game.currentRound.currentPhase) {
      case 'playing':
        choosenChoice = state.game.currentRound.choosenOption;
        correctChoice = false;
        wrongChoice = false;

        showRoundResults = false;

        startPlaying();

        choicesButtonsData = formatChoices(state.game.currentRound);

        timeRemaining = state.game.currentRound.remainingTime;
        const timer = setInterval(() => {
          timeRemaining-=1;
          if(timeRemaining <= 0){
            clearInterval(timer);
          } 
        }, 1000);
        break;

      case 'results':
        correctChoice = state.game.currentRound.correctChoice
        if(choosenChoice !== false && choosenChoice != correctChoice){
          wrongChoice = choosenChoice;
        }

        choosenChoice = false;

        setNextRoundTimer();

        if(state.targeted) {
          showRoundResults = true;
          setAudioElementSrc(state.game.nextRoundSongUrl);
        } else {
          setTimeout(() => {
            if(audioElement){
              audioElement.pause();
              audioElement.currentTime = 0;
            }
            showRoundResults = true;
            setAudioElementSrc(state.game.nextRoundSongUrl);
          }, 1000);
        } 
        
        localStorage.setItem('defaultVolume', volume);

        break;

      default:
        break;
    }
  }

  function setNextRoundTimer() {
    if(!nextRoundTimer){
      nextRoundStartsIn = roomState.game.timeRemainingForNextRound;
      nextRoundTimer = setInterval(() => {
        nextRoundStartsIn-=1;
        if(nextRoundStartsIn <= 0){
          clearInterval(nextRoundTimer);
          nextRoundTimer = false;
        } 
      }, 1000);
    }  
  }

  function setAudioElementSrc(url) {
    if(!audioElement) {
      onMount(() => {setAudioElementSrc(url)});
      return;
    }

    if(!url) return;

    if(audioElement.src != url) {
      audioElement.src = url;
    }
  }

  function startPlaying() {
    if(!audioElement) {
      onMount(startPlaying);
      return;
    }

    setAudioElementSrc(roomState.game.currentRound.trackToPlay);
    
    audioElement.volume = volume/100;

    /* play() method will throw an error if the user has not yet interacted with the page
     * so, we show a button to force the user to interact
     */
    audioElement.play().then(() => {
      showButtonToInteract = false;
    }).catch(err => {
      if(err.name == "NotAllowedError") {
        showButtonToInteract = true;
      }
    });
  }

  function formatChoices(data) {
    const output = [];
    data.choices.forEach(choice => {
      switch(data.type) {
        case "artist":
          const artistsString = choice.artists.map(e => e.name).join(', ');
          output.push(artistsString);
          break;
        case "song":
          output.push(choice.name);
          break;
        default:
          break;
      }
    });
    return output;
  }

  function handleVolumeInput(e){
    volume = e.target.value;
    audioElement.volume = e.target.value/100;
  }

  function handleChoiceClick(e) {
    if(choosenChoice) return;
    choosenChoice = parseInt(e.target.value);
    socket.emit("roundChoice", choosenChoice);
  }

</script>

<div class="game-wrapper">
  {#if !roomState.game.currentRound}
    <MainCardHeader/>
    <div>
      <h2>{$_("game.startsIn")}</h2>
      <h1>{nextRoundStartsIn}</h1>
    </div>
    <div></div>
  {:else if roomState.game.currentRound.currentPhase == 'playing' || !showRoundResults}

    <div>
      <MainCardHeader label={$_("game.round.label", { values: { round: roomState.game.currentRound.number+1 }})} />

      {#if timeRemaining}
        <h3 class="text-secondary">{$_("game.round.remainingTime", { values: {seconds: timeRemaining} })}</h3>
      {/if}

      <hr>

      <h2>{roomState.game.currentRound.type == "artist" ? $_("game.round.type.artist") : $_("game.round.type.song")}</h2>
    </div>

    <div class="game-main">
      <div class="choices-wrapper">
        {#if showButtonToInteract}
          <button class={`btn choice-btn`} on:click={startPlaying}>{$_("game.round.clickToPlaySong")}</button>
        {:else}
          {#each choicesButtonsData as choiceButtonText, i}
            <button 
              class={`btn choice-btn ${
                i === correctChoice ? 'btn-success' : 
                i === wrongChoice ? 'btn-danger' : 
                i === choosenChoice ? 'btn-secondary' : 
                'btn-light'}`} 
                
              value={i} 
              on:click={handleChoiceClick}
              disabled={!!choosenChoice || roomState.game.currentRound.currentPhase == 'results'}>
                {choiceButtonText}
              </button>
          {/each}
        {/if}
      </div>
    </div>

    <input type="range" class="volume-input" value={volume} on:input={handleVolumeInput} min="0" max="100">
  {:else if roomState.game.currentRound.currentPhase == 'results'}
    <MainCardHeader label={$_("game.round.results.label")}/>
    <Results results={roomState.game.currentRound.playersThatGotItRight} {playerData}/>
    <h4 class="text-secondary">{$_(roomState.game.currentRound.lastOne ? "game.round.results.finalResultsIn" : "game.round.results.nextRoundIn", { values: {seconds: nextRoundStartsIn} })}</h4>
  {/if}
</div>

<audio bind:this={audioElement}
 src={roomState.game.currentRound && roomState.game.currentRound.trackToPlay}
 volume={volume/100}>
  <track kind="captions">
</audio>

<style>
  .game-wrapper {
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

  .choice-btn {
    width: 100%;
    border-color: rgb(0 0 0 / 50%);
    min-height: 60px;
    margin-bottom: 10px;
  }

  .spinner-border {
    width: 192px;
    height: 192px;
    border-width: 0.5em;
    margin: auto;
  }

  .volume-input {
    width: 100%;
  }

  @media only screen and (max-width: 800px) {
    .choice-btn {
      min-height: 80px;
    }
  }

</style>
