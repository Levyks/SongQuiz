<script>
  import { _ } from '../services/i18n.js';

  import Results from './Results.svelte';

  export let socket;
  export let playerData;
  export let roomState;

  function backToLobby() {
    socket.emit('backToLobby');
  }

</script>

<div class="results-wrapper">

  <div class="results-header">
    <h3>{$_('finalResults.label')}</h3>
    <hr>
  </div>
  
  <Results results={roomState.game.results} {playerData}/>

  <div>
    {#if playerData.isLeader}
      <button class="btn btn-primary" on:click={backToLobby}>{$_('finalResults.button.isLeader')}</button>
    {:else}
      <h6 class="text-secondary">{$_('finalResults.button.notLeader')}</h6>
    {/if}
  </div>

</div>

<style>
  .results-wrapper {
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

  
</style>