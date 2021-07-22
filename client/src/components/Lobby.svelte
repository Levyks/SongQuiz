<script>
  import { _ } from '../services/i18n.js';

  import MainCardHeader from './MainCardHeader.svelte';

  export let socket
  export let playerData;
  export let roomState;

  let isLoadingPlaylist = false;

  let numberOfRounds = roomState.numberOfRounds;
  let lastNumberOfRounds = numberOfRounds;

  let validPlaylistSet = roomState.playlist && roomState.playlist.info.set && !roomState.playlist.info.tooSmall;
  
  let playlistUrl = roomState.playlist && roomState.playlist.info.href;
  let lastPlaylistUrlFetched = playlistUrl;

  let timePerRound = roomState.timePerRound;
  let lastTimePerRound = timePerRound;

  let inviteFriendsUrlInput;

  $: trackRoomStateChange(roomState);

  function trackRoomStateChange(state) {
    numberOfRounds = state.numberOfRounds;
    lastNumberOfRounds = numberOfRounds;

    timePerRound = state.timePerRound;
    lastTimePerRound = timePerRound;

    validPlaylistSet = state.playlist && state.playlist.info.set && state.playlist.info.tracksLoaded && !state.playlist.info.tooSmall;

    if(isLoadingPlaylist && (!state.playlist || !state.playlist.info.set || state.playlist.info.tracksLoaded)) {
      isLoadingPlaylist = false;
    }
  }

  function handlePlaylistUrlBlur(){
    if(playlistUrl === lastPlaylistUrlFetched) return;

    isLoadingPlaylist = true;
    lastPlaylistUrlFetched = playlistUrl;

    socket.emit('setPlaylist', playlistUrl);
  }

  function handleNumberOfRoundsBlur(){
    if(numberOfRounds === lastNumberOfRounds) return;

    numberOfRounds = Math.max(1, Math.ceil(numberOfRounds));

    isLoadingPlaylist = true;

    lastNumberOfRounds = numberOfRounds;
    socket.emit('setNumberOfRounds', numberOfRounds);
  }

  function handleTimePerRoundBlur(){
    if(timePerRound === lastTimePerRound) return;

    timePerRound = Math.max(5, Math.ceil(timePerRound));

    lastTimePerRound = timePerRound;
    socket.emit('setTimePerRound', timePerRound);
  }

  function handleCopyUrlClick(){
    inviteFriendsUrlInput.select();
    document.execCommand("copy");
  }

  function startGame(){
    socket.emit('startGame');
  }


</script>

<div class="lobby-wrapper">
  
  <MainCardHeader label={$_("lobby.label")} />

  <div class="lobby-main">
    <div class="form-group">
      <label for="username-input">{$_("lobby.inputLabels.username")}</label>
      <input class="form-control" value={$playerData.username} id="username-input" readonly>
    </div>

    <div class="form-group">
      <label for="playlist-input">{$_("lobby.inputLabels.playlist")}</label>
      <div class="input-group mb-1">

        <span class="form-control playlist-label" readonly>

        {#if roomState.playlist}

          {#if roomState.playlist.info.set}

            <a href={roomState.playlist.info.href} class:text-danger={roomState.playlist.info.tooSmall} target="_blank">
              {roomState.playlist.info.name} 
              {#if roomState.playlist.info.numberOfValidSongs}
                | {$_("lobby.playlistMessages.validSongs", { values: {number: roomState.playlist.info.numberOfValidSongs} })}
              {/if}
              
              {#if roomState.playlist.info.tooSmall}
                | {$_("lobby.playlistMessages.tooSmall")}
              {/if}
            </a>  

          {:else if roomState.playlist.info.error}
            <span class="text-danger">{$_("lobby.playlistMessages.error", { values: {error: roomState.playlist.info.error.message || roomState.playlist.info.error.status} })}</span>
          {/if}

        {:else}
          {$_("lobby.playlistMessages.notSet")}
        {/if}

        </span>
        
        {#if isLoadingPlaylist}
        <div class="input-group-append">
          <span class="input-group-text">
            <div class="spinner-border" role="status">
              <span class="sr-only">{$_("misc.loading")}...</span>
            </div>
          </span>
        </div>
        {/if}
      </div>

      {#if $playerData.isLeader}
      <input class="form-control" on:blur={handlePlaylistUrlBlur} bind:value={playlistUrl} placeholder={$_("lobby.playlistUrlPlaceholder")} id="playlist-url-input">
      {/if}

    </div> 
    
    <div class="row">
      <div class="col">
        <label for="number-of-rounds-input">{$_("lobby.inputLabels.numberOfRounds")}</label>
      </div>
      <div class="col">
        <label for="time-per-round-input">{$_("lobby.inputLabels.timePerRound")}</label>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="form-group">
          <input type="number" min="1" max="30" on:blur={handleNumberOfRoundsBlur} bind:value={numberOfRounds} readonly={!$playerData.isLeader} class="form-control" id="number-of-rounds-input">
        </div>
      </div>
      <div class="col">
        <div class="form-group">
          <input type="number" min="5" on:blur={handleTimePerRoundBlur} bind:value={timePerRound} readonly={!$playerData.isLeader} class="form-control" id="time-per-round-input">
        </div>
      </div>
    </div>

    <div class="form-group">
      <label for="invite-friends-input">{$_("lobby.inputLabels.invite")}</label>
      <div class="input-group mb-1">

        <input class="form-control" value={location.href} bind:this={inviteFriendsUrlInput} id="invite-friends-input" readonly>
        
        <div class="input-group-append">
          <button class="btn btn-outline-secondary" on:click={handleCopyUrlClick}>
            <i class="fas fa-copy"></i>
          </button> 
        </div>
      </div>
    </div>

  </div>

  <div class=text-center>
  {#if $playerData.isLeader}
    <button 
      class="btn btn-primary" 
      on:click={startGame} 
      disabled={!validPlaylistSet} 
      title={ validPlaylistSet ? '' : $_("lobby.button.playlistNotSet")}>
        {$_("lobby.button.isLeader")}
      </button>
  {:else}
    <button class="btn btn-primary" disabled>{$_("lobby.button.notLeader")}</button>
  {/if}
  </div>
</div>

<style>  
  .lobby-wrapper {
    text-align: left;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

  .spinner-border {
    width: 22px;
    height: 22px;
  }

  .playlist-label {
    height: auto;
  }
</style>