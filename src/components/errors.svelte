<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { RenderError } from '../jianpu/index'

  export let visible = false
  export let errors: RenderError[] = []
  
  const dispatcher = createEventDispatcher()
  const closeDialog = () => {
    dispatcher('close')
  }
  </script>

<div class="dialog-container" class:visible={visible}>
  <div class="dialog errors-dialog">
    <header>错误信息</header>
    <div class="content">
      {#each errors as err }
      <div class="error-item">
        <div class="position">位置: {err.index}</div>
        <span class="message">{err.message}</span>
      </div>
      {/each}
    </div>
    <footer>
      <button type="button" class="gray" on:click={closeDialog}>关闭</button>
    </footer>
  </div>
</div>

<style>
  .error-item {
    padding: 0.5rem 0 0 0;
    display: flex;
  }
  .error-item .message {
    flex: 1;
    color: var(--red);
  }
  .error-item .position {
    width: 12rem;
  }
  .errors-dialog {
    min-width: 700px;
  }
</style>