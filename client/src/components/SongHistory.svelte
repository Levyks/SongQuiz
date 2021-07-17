<script>
  import { _ } from '../services/i18n.js';

  export let songsHistory;

</script>

<div class="song-history-wrapper">
  <div>
    <h3>{$_('leftWindow.label')}</h3>
    <hr>
  </div>
  <ul class="list-group text-left">
    {#each songsHistory as song}
    <a href={song.href} target="_blank">
      <li class="list-group-item">
        <img src={song.albumImageUrl} alt={$_('leftWindow.thumbAlt')} class="album-image mr-2">
        <div>
          <h5>{song.name}</h5>
          <span class="artists">{song.artists}</span>
        </div> 
      </li>
    </a>
    {/each}
  </ul>
</div>

<style>

  .song-history-wrapper {
    height: 100%;
    display: flex;
    text-align: center;
    flex-direction: column;
  }

  ul {
    flex: 1 1 100px;
    overflow-y: auto;
  }

  li {
    display: flex;
    align-items: center;
  }

  a {
    color: black;
    text-decoration: none;
  }

  .album-image{
    width: 64px;
    height: 64px;
  }

</style>