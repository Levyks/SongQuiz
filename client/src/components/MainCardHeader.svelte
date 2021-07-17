<script>
  export let label = "";

  import { openModal } from '../stores.js';

  function handleOpenModalClick(e) {
    openModal.set(e.currentTarget.value);
  }

</script>

<div class="header">
  <button class="btn btn-light btn-icon mobile-only" on:click={handleOpenModalClick} value="history"><i class="fas fa-history"></i></button>
  <h2>{label}</h2>
  <button class="btn btn-light btn-icon mobile-only" on:click={handleOpenModalClick} value="players"><i class="fas fa-users"></i></button>
</div>

<style>
.header {
  display: flex;
  justify-content: space-between;
}

@media only screen and (min-width: 800px) {
  .header {
    justify-content: center;
  }
}
</style>