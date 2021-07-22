<script>
  import { _ } from '../services/i18n.js';
  export let results;
  export let playerData;
</script>

<ul class="list-group">
  {#if results.length}
    {#each results as player, i}
      <li class="list-group-item" class:highlighted-item={$playerData.username === player.username}>
        <span>{i+1}º</span>
        <strong>
          {player.username}
          {#if [0,1,2].includes(i)}
            <i class="fas fa-medal" class:gold={i==0} class:silver={i==1} class:bronze={i==2}></i>
          {/if}
        </strong>  
        <span>{player.score} pts</span>
      </li>
    {/each}    
  {:else}
    <li class="list-group-item justify-content-center">{$_("game.round.results.noOneCorrect")}</li>
  {/if}
</ul>

<style>
ul {
  margin: 20px 0;
  flex: 1 1 0px;
  overflow-y: auto;
}

li {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>