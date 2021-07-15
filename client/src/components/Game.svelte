<script>
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  
  export let socket;
  export let roomState;

  let choicesButtonsData = [];

  let choosenChoice = false;
  let correctChoice = false;
  let wrongChoice = false;
  
  let songQueuedToPlay = false;

  let showRoundResults = false;

  let timeRemaining = 0;

  let nextRoundStartsIn;

  let volume = parseInt(localStorage.getItem('defaultVolume')) || 50;

  let audioElement;

  $: trackRoomStateChange(roomState);

  function trackRoomStateChange(state) {
    if(!state.game) return;
    switch(state.game.currentRound.currentPhase) {
      case 'playing':
        choosenChoice = false;
        correctChoice = false;
        wrongChoice = false;

        showRoundResults = false;

        if(audioElement){
          audioElement.src = state.game.currentRound.trackToPlay;
          audioElement.volume = volume/100;
          audioElement.play();
        } else {
          songQueuedToPlay = true;
        }
        

        choicesButtonsData = formatChoices(state.game.currentRound);

        timeRemaining = state.game.currentRound.remainingTime;
        const timer = setInterval(() => {
          timeRemaining-=1;
          if(timeRemaining <= 0){
            clearInterval(timer);
            timeEnded();
          } 
        }, 1000);
        break;

      case 'results':
        correctChoice = state.game.currentRound.correctChoice
        if(choosenChoice !== false && choosenChoice != correctChoice){
          wrongChoice = choosenChoice;
        }

        choosenChoice = false;

        nextRoundStartsIn = state.game.currentRound.timeRemainingForNextRound;
        const nextRoundTimer = setInterval(() => {
          nextRoundStartsIn-=1;
          if(nextRoundStartsIn <= 0){
            clearInterval(nextRoundTimer);
          } 
        }, 1000);

        setTimeout(() => {
          showRoundResults = true;
        }, 1000);

        localStorage.setItem('defaultVolume', volume);

        break;

      default:
        break;
    }
  }

  onMount(() => {
		if(songQueuedToPlay){
      audioElement.play();
      songQueuedToPlay = false;
    }
	});

  function timeEnded() {
    if(audioElement){
      audioElement.pause();
      audioElement.currentTime = 0;
    }
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
    choosenChoice = parseInt(e.target.value);
    socket.emit("roundChoice", choosenChoice);
  }

</script>

<div class="game-wrapper">
  {#if !roomState.game}
    <div class="spinner-border" role="status">
      <span class="sr-only">{$_("misc.loading")}...</span>
    </div>
  {:else if roomState.game.currentRound.currentPhase == 'playing' || !showRoundResults}

    <div class="game-header">
      <h2>{$_("game.round.label", { values: { round: roomState.game.currentRound.number+1 }})}</h2>

      {#if timeRemaining}
      <h3 class="text-secondary">{$_("game.round.remainingTime", { values: {seconds: timeRemaining} })}</h3>
      {/if}
      
      <hr>
      <h2>{roomState.game.currentRound.type == "artist" ? $_("game.round.type.artist") : $_("game.round.type.song")}</h2>
    </div>

    <div class="game-main">
      <div class="choices-wrapper">
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
      </div>
    </div>

    <input type="range" class="volume-input" value={volume} on:input={handleVolumeInput} min="0" max="100">
  {:else if roomState.game.currentRound.currentPhase == 'results'}
    <h3>Round results:</h3>
    <ul class="list-group">
      {#each roomState.game.currentRound.playersThatGotItRight as player, i}
      <li class="list-group-item">{i+1}º {player.username} - {player.score} pts</li>
      {/each}
      {#if !roomState.game.currentRound.playersThatGotItRight.length}
      <li class="list-group-item">{$_("game.round.results.noOneCorrect")}</li>
      {/if}
    </ul>
    <h4 class="text-secondary">{$_(roomState.game.currentRound.lastOne ? "game.round.results.nextRoundIn" : "game.round.results.finalResultsIn", { values: {seconds: nextRoundStartsIn} })}</h4>
  {/if}
</div>

<audio bind:this={audioElement}
 src={roomState.game && roomState.game.currentRound.trackToPlay}
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

</style>
