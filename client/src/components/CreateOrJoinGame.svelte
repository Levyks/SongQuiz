<script>
	import { push } from 'svelte-spa-router';
	import { _ } from '../services/i18n.js';

	export let params = undefined;
	export let socket;

	socket.disconnect();
	socket.connect();

	let roomCodeRequired = true;

  let username;
  let roomCode = params && params.roomCode;
	let isJoiningDefinedRoom = !!roomCode;

	function handleCreateRoomClick(e) {
		roomCodeRequired = false;
	}

	function handleFormSubmit(e) {
		roomCodeRequired = true;

    const action = e.submitter.getAttribute('action');

    switch(action){
      case "createRoom":
        createRoom();
        break;
      case "joinRoom":
				joinRoom({roomCode, playerData: {username}});
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
			joinRoom(response)
		} else {
			window.alert($_('misc.somethingWentWrong'));
		}
  });

	function joinRoom(data) {
		const storedLastRoomJoined = localStorage.getItem('lastRoomJoined');
  	const storedPlayerData = JSON.parse(localStorage.getItem('playerData'));

		if(
			storedLastRoomJoined != data.roomCode || 
			storedPlayerData.username != data.playerData.username ||
			(data.playerData.token && storedPlayerData.token != data.playerData.token))
			{
			localStorage.setItem('lastRoomJoined', data.roomCode);
			localStorage.setItem('playerData', JSON.stringify(data.playerData) );
		}

		push(`/play/room/${data.roomCode}`);
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

