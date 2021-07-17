<script>
  import { _, isLocaleLoaded } from '../services/i18n.js';
</script>

<div class="spinner-border" role="status">
  <span class="sr-only">{$isLocaleLoaded ? $_("misc.loading") : "Loading"}...</span>
</div>

<style>
  .spinner-border {
    width: 192px;
    height: 192px;
    border-width: 8px;
  }

</style>