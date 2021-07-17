<script>
  import { push } from 'svelte-spa-router';
  import { _ } from '../services/i18n.js';
  import Modal from "sv-bootstrap-modal";

  import { openModal, isMobile } from '../stores.js';

  import Lobby from './Lobby.svelte';
  import Game from './Game.svelte';
  import FinalResults from './FinalResults.svelte';
  import SongHistory from './SongHistory.svelte';
  import Players from './Players.svelte';
  import Loading from './Loading.svelte';

  export let params;
  export let socket;

  let roomState = {
    currentlyIn: "lobby"
  };

  let roomIsLoading = true;
  let lostConnection = false;

  let playersData = [];
  
  const lastRoomJoined = localStorage.getItem('lastRoomJoined');
  let playerData = JSON.parse(localStorage.getItem('playerData'));;

  if(params.roomCode == lastRoomJoined && playerData){
    connectToRoom(params.roomCode, playerData);
    
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      lostConnection = true;

      socket.on("connect", () => {
        console.log("Socket connected");
        socket.removeAllListeners("connect");
        connectToRoom(params.roomCode, playerData);
      });
    });
  } else {
    push(`/play/join/${params.roomCode}`);
  }

  function connectToRoom(code, playerData){
    socket.emit('initialSetup', {action:'connectToRoom', code, playerData});
  }

  socket.on('connectToRoomResponse', response => {
    lostConnection = false;
    if(response.status === 200){
      playerData = response.playerData;
      localStorage.setItem('playerData', JSON.stringify(response.playerData) );

      roomIsLoading = false;
    } else {
      if(response.status === 404) window.alert($_("room.doesNotExist", { values: {code: params.roomCode} }));
      else if(response.messageI18n) window.alert($_(response.messageI18n));
      else window.alert($_("misc.somethingWentWrong"));
      push('/play');
    } 
  });

  function handleLeaveClick(){
    if(window.confirm($_("room.leaveConfirmation"))){
      socket.emit('leaveRoom');
      push('/play');
    }
  }
  
  function handleCloseModalClick(){
    openModal.set(false);
  }

  socket.on('syncRoomState', data => {
    roomState = data;
  });

  socket.on('startingGame', () => {
    roomState.currentlyIn = "game";
  });

  socket.on('syncPlayersData', players => {
    playersData = players;
  });

  let songsHistory = [];

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

    songsHistory.unshift({name, artists, albumImageUrl, href});
    if(songsHistory.length > 10) songsHistory.pop();
    songsHistory = songsHistory;
  }

</script>

<div class="room-wrapper">
  <div>
    <button class="btn icon-btn" on:click={handleLeaveClick}><i class="fas fa-arrow-left"></i></button>
  </div>

  <div class="room-content">
    {#if lostConnection}
      <div class="app-card center-xy">
        <h3 class="mb-5">{$_("room.connectionLost")}</h3>
        <Loading />
      </div>    
    {:else if roomIsLoading}
      <div class="app-card center-xy">
        <Loading />
      </div>
    {:else}
      {#if !$isMobile}
        <div class="left-card app-card mobile-hide">
          <SongHistory {songsHistory} />
        </div>
      {/if}
      <div class="main-card app-card">
        {#if roomState.currentlyIn == "lobby" }
        <Lobby {socket} {playerData} {roomState} />
        {:else if roomState.currentlyIn == "game"}
        <Game {socket} {playerData} {roomState}/>
        {:else if roomState.currentlyIn == "finalResults"}
        <FinalResults {socket} {playerData} {roomState}/>
        {/if}
      </div>
      {#if !$isMobile}
        <div class="right-card app-card mobile-hide">
          <Players {roomState} {playersData} roomCode={params.roomCode} />
        </div>
      {/if}
    {/if}
  </div>
</div>

<div class="modal-wrapper">
  <Modal bind:open={$openModal} dialogClasses="modal-dialog-centered">
    <div class="text-right">
      <button class="btn icon-btn" on:click={handleCloseModalClick}>&#x2715;</button>
    </div>
    {#if $openModal === "history"}
      <SongHistory {songsHistory} />
    {:else if $openModal ==="players"}
      <Players {roomState} {playersData} roomCode={params.roomCode} />
    {/if}
  </Modal>
</div>

<style>
  .room-wrapper {
    display: flex;
    flex-flow: column;
    height: 100%;
  }

  .room-content {
    flex: 1 1 auto;
    text-align: center;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
  }

  .modal-wrapper :global(.modal-dialog) {
    display: flex;
    flex-flow: column; 
    height: 0;
  }

  .modal-wrapper :global(.modal-content) {
    flex-grow: 1;
    padding: 10px;  
  }

  .main-card {
    flex-grow: 2!important;
  }

  .app-card {
    flex-basis: 0;
    flex-grow: 1;
    flex-shrink: 1;
  }

  .icon-btn {
    margin: 0 5px;
    padding: 0;
    border: none;
    font-size: 30px;
  }

  @media only screen and (max-width: 1200px) {
    .main-card {
      order: -1;
      flex-basis: 100%!important;
      min-height: 400px;
    }

    .left-card {
      flex-basis: 25%!important;
      max-height: 400px;
    }

    .right-card {
      max-height: 400px;
    }

  }

  @media only screen and (max-width: 800px) {
    .main-card {
      height: auto;
    }

    .app-card {
      flex-basis: 100%;
    }

  }
</style>