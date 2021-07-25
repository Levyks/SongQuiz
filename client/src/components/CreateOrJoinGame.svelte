<script>
	import { push } from 'svelte-spa-router';
	import { _ } from '../services/i18n.js';
	import { playerData, lastRoomJoined } from '../stores.js';

	export let params = undefined;
	export let socket;

	socket.removeAllListeners();
	socket.disconnect();
	socket.connect();
	socket.on('updatePlayerData', newPlayerData => {
		$playerData = newPlayerData;
	});

	let roomCodeRequired = true;

  let username;
  let roomCode = params && params.roomCode;
	let isJoiningDefinedRoom = !!roomCode;

	function handleCreateRoomClick(e) {
		roomCodeRequired = false;
	}

	function handleFormSubmit(e) {
		roomCodeRequired = true;

		if(!$playerData) $playerData = {};
		
		$playerData.username = username;

    const action = e.submitter.getAttribute('action');

    switch(action){
      case "createRoom":
        createRoom();
        break;
      case "joinRoom":
				joinRoom(roomCode);
        break;
      default:
        break;
    }
	}

  function createRoom() {
    socket.emit('initialSetup', { action: 'createRoom', username });
  }

	socket.on('createRoomResponse', response => {
		if(response.status === 200){
			joinRoom(response.roomCode);
		} else {
			window.alert($_('misc.somethingWentWrong'));
		}
  });

	function joinRoom(code) {
		code = code.toString().padStart(4,"0");

		$lastRoomJoined = code;

		push(`/play/room/${code}`);
	}

</script>

<main>
  <div class="jumbotron">
		<h2>{$_('createOrJoinGame.title')}</h2>
		
		<hr class="my-2">

		<form on:submit|preventDefault={handleFormSubmit}>

			<div class="form-group">
				<label for="usernameInput">{$_('createOrJoinGame.username.label')}</label>
				<input class="form-control" placeholder={$_('createOrJoinGame.username.placeholder')} bind:value={username} required>
			</div>

			{#if !isJoiningDefinedRoom}
		
			<div class="w-100 text-center">
				<input on:click={handleCreateRoomClick} type="submit" class="btn btn-primary" action="createRoom" value={$_('createOrJoinGame.createRoom')}>
			</div>

			<div class="w-100 text-center mb-3">
				<strong>{$_('createOrJoinGame.or')}</strong>
			</div>

			{/if}

			<div class="input-group mb-3">
				<input type="number" class="form-control" placeholder={$_('createOrJoinGame.roomCode')} bind:value={roomCode} required={roomCodeRequired}>
				<div class="input-group-append">
					<input class="btn btn-primary" type="submit" action="joinRoom" value={$_('createOrJoinGame.joinRoom')}>
				</div>
			</div>
		</form>
	</div>
</main>

<style>
	main {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;	
	}

</style>

