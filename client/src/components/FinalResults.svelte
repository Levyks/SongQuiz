<script>
  import { _ } from '../services/i18n.js';

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
  
  <div class="results-main">
    <ul class="list-group">
      {#each roomState.game.results as player, i}
      <li class="list-group-item">
        {i+1}º {player.username} - {player.score} pts
        {#if [0,1,2].includes(i)}
          <i class="fas fa-medal" class:gold={i==0} class:silver={i==1} class:bronze={i==2}></i>
        {/if}
      </li>
      {/each}
    </ul>
  </div>

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

  .gold{
    color: #ffc107;
  }

  .silver{
    color: #e5e5e5;
  }

  .bronze{
    color: #cd7f32;
  }
</style>