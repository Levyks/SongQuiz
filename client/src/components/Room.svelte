<script>
  import { push } from 'svelte-spa-router';
  import { _ } from '../services/i18n.js';

  import Lobby from './Lobby.svelte';
  import Game from './Game.svelte';
  import FinalResults from './FinalResults.svelte';
  import LeftWindow from './LeftWindow.svelte';
  import RightWindow from './RightWindow.svelte';

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
        setTimeout(() => connectToRoom(params.roomCode, playerData), 1000);
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


  socket.on('syncRoomState', data => {
    roomState = data;
  });

  socket.on('startingGame', () => {
    roomState.currentlyIn = "game";
  });

  socket.on('syncPlayersData', players => {
    playersData = players;
  });

</script>

<main>
  <div>
    <button class="btn leave-btn" on:click={handleLeaveClick}><i class="fas fa-arrow-left"></i></button>
  </div>

  <div class="room-wrapper">
    {#if lostConnection}
      <div class="app-window w-100 text-center">
        <h1>Connection problems</h1>
        <div class="spinner-border" role="status">
          <span class="sr-only">{$_("misc.loading")}...</span>
        </div>
      </div>    
    {:else if roomIsLoading}
      <div class="app-window w-100 text-center">
        <div class="spinner-border" role="status">
          <span class="sr-only">{$_("misc.loading")}...</span>
        </div>
      </div>
    {:else}
    <div class="left-window app-window">
      <LeftWindow {socket} />
    </div>
    <div class="main-window app-window">
      {#if roomState.currentlyIn == "lobby" }
      <Lobby {socket} {playerData} {roomState} />
      {:else if roomState.currentlyIn == "game"}
      <Game {socket} {roomState}/>
      {:else if roomState.currentlyIn == "finalResults"}
      <FinalResults {socket} {playerData} {roomState}/>
      {/if}
    </div>
    <div class="right-window app-window">
      <RightWindow {roomState} {playersData} roomCode={params.roomCode} />
    </div>
    {/if}
  </div>
</main>

<style>
  .room-wrapper {
    text-align: center;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
  }

  .main-window {
    min-height: 450px;
    flex-grow: 2!important;
  }

  .app-window {
    flex-basis: 0;
    flex-grow: 1;
    flex-shrink: 1;
    border-radius: 10px;
    margin: 10px 10px;
    padding: 10px;
    min-width: 300px;
    height: 600px;
    background-color: white;
  }

  .spinner-border {
    width: 192px;
    height: 192px;
    border-width: 0.5em;
  }

  .leave-btn {
    margin: 0;
    font-size: 30px;
  }

  @media only screen and (max-width: 1200px) {
    .main-window {
      order: -1;
      flex: 0 0 100%;
    }

    .left-window {
      margin-left: 0;
    }

    .right-window {
      margin-right: 0;
    }

    .app-window {
      height: auto;
    }
  }

  @media only screen and (max-width: 700px) {
    .app-window {
      flex: 0 0 100%;
    }
    .left-window {
      margin-right: 0;
    }
    .right-window {
      margin-left: 0;
    }
  }
</style>