<script>
	import { _ } from 'svelte-i18n';
</script>

<main>
  <div class="jumbotron">
    <h1>{$_('misc.notFound')}</h1>
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