<script>
import Router, { push } from 'svelte-spa-router';
import { wrap } from 'svelte-spa-router/wrap';
import { io } from 'socket.io-client';

import { setupI18n, isLocaleLoaded } from './services/i18n';

import CreateOrJoinGame from './components/CreateOrJoinGame.svelte';
import NotFound from './components/NotFound.svelte';
import Room from './components/Room.svelte';

setupI18n();

const socket = io(`${__songQuiz.env.SERVER_URL}`);

function handleRouteEvent(event){
	switch(event.detail.action){
		case "redirectToRoom":
			const roomCode = event.detail.roomCode;
			push(`/play/room/${roomCode}`);
			break;
		default:
			break;
	}
}

function getRoomData(){
	return roomData;
}

const createOrJoinGameRoute = wrap({
	component: CreateOrJoinGame,
	props: { socket }
});

const routes = {
	'/': createOrJoinGameRoute,
 
	'/play': createOrJoinGameRoute,

	'/play/join/:roomCode': createOrJoinGameRoute,

	'/play/room/:roomCode': wrap({
		component: Room,
		props: { socket }
	}),

	'*': NotFound
};

</script>

{#if $isLocaleLoaded}
	<Router {routes} on:routeEvent={handleRouteEvent} />
{:else}
	<main>
  	<div class="jumbotron">
			<div class="spinner-border" role="status">
				<span class="sr-only">Loading...</span>
			</div>
		</div>
	</main>
{/if}

<style>
	:global(body) {
		background-color: #39CCCC;
	}

	main {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;	
	}

	.spinner-border{
		margin: 0 10px;
		width: 192px;
		height: 192px;
		border-width: 0.5rem;
	}
</style>

