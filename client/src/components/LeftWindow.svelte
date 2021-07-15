<script>
  import { _ } from '../services/i18n.js';

  export let socket;

  let songs = [];

  socket.on('addSongToHistory', addSongToHistory);

  function addSongToHistory(song) {
    const name = song.name;
   
    let artists = "";
    song.artists.forEach(artist => {
      artists+=artist.name + ', ';
    });
    artists = artists.slice(0, -2);
    if(artists.length > 40){
      artists = artists.slice(0, 40) + '...';
    }

    const albumImageUrl = song.album.images[song.album.images.length-1].url;   

    const href = song.external_urls.spotify;

    songs.unshift({name, artists, albumImageUrl, href});
    if(songs.length > 10) songs.pop();
    songs = songs;
  }

</script>

<h3>{$_('leftWindow.label')}</h3>
<hr>
<ul class="list-group text-left">
  {#each songs as song}
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

<style>
  .list-group-item {
    display: flex;
    align-items: center;
  }

  .album-image{
    width: 64px;
    height: 64px;
  }

  ul {
    overflow-y: auto;
    max-height: 500px;
  }

  a {
    color: black;
    text-decoration: none;
  }

</style>