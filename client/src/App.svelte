<script>
import Router, { push } from 'svelte-spa-router';
import { wrap } from 'svelte-spa-router/wrap';
import { io } from 'socket.io-client';

import { setupI18n, isLocaleLoaded } from './services/i18n';
import { isMobile } from './stores.js';

import CreateOrJoinGame from './components/CreateOrJoinGame.svelte';
import NotFound from './components/NotFound.svelte';
import Room from './components/Room.svelte';
import Loading from './components/Loading.svelte';

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

function handleWindowResize() {
	isMobile.set(window.innerWidth < 800);
}

window.addEventListener("resize", handleWindowResize);

handleWindowResize();

</script>

{#if $isLocaleLoaded}
	<Router {routes} on:routeEvent={handleRouteEvent} />
{:else}
	<div class="loading-wrapper">
		<div class="app-card center-xy">
			<Loading />
		</div> 
	</div>
{/if}

<style>
	:global(html) {
		height: 100%;
	}

	:global(body) {
		background-color: #39CCCC;
		height: 100%;
		padding: 10px;
	}
	
	:global(main) {
		height: 100%;	
	}

	:global(.app-card) {
    border-radius: 10px;
    margin: 10px 10px;
    padding: 10px;
    background-color: white;
  }

	:global(.center-xy) {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	:global(.btn-icon) {
		padding: 4px 8px;
		font-size: 1.5rem;
	}

	:global(.highlighted-item) {
		background-color: #d2e5ff;
	}

	:global(.gold){
    color: #ffc107;
  }

  :global(.silver){
    color: #c0c0c0;
  }

  :global(.bronze){
    color: #cd7f32;
  }

	.loading-wrapper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		height: 100%;
	}

	.app-card {
		flex-grow: 1;
	}
	
	@media only screen and (min-width: 800px) {
		:global(.mobile-only) {
			display: none;
		}
	}

	@media only screen and (max-width: 799px) {
		:global(.mobile-hide) {
			display: none;
		}

		:global(.app-card) {
			border-radius: 10px;
			margin: 10px 0;
			padding: 10px;
			background-color: white;
  	}
	}
	
</style>

