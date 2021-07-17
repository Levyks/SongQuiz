<script>
  import { _ } from '../services/i18n.js';

  export let roomState;
  export let roomCode;
  export let playersData;
</script>

<div class="players-wrapper">
  <div>
    <h3>{$_('rightWindow.label', {values: {roomCode}})}</h3>
    <hr>
  </div>
  <div class="number-of-players-wrapper">
    <h5>{$_('rightWindow.players.label')}</h5>
    <h6 class="ml-auto">{$_('rightWindow.players.number', {values: {number: playersData.length}})}</h6>
  </div>
  <ul class="list-group text-left">
    {#each playersData as player, i}
      <li class="list-group-item">
        <div>
          <i class="fas fa-circle" class:connected={player.isConnected} class:disconnected={!player.isConnected}></i>
          {#if true || roomState.currentlyIn == "game"}<span>{i+1}.</span>{/if}
          <strong>{player.username}</strong>
          {#if player.isLeader}<i class="fas fa-crown text-warning"></i>{/if}
        </div>
        {#if true || roomState.currentlyIn == "game"}<span class="mx-1" >{$_('rightWindow.players.points', {values: {points: player.score}})}</span>{/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .players-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    text-align: center;
  }

  .number-of-players-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  ul {
    flex: 1 1 100px;
    overflow-y: auto;
    text-align: left;
  }

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .connected {
    color: green;
  }

  .disconnected {
    color: red;
  }

</style>