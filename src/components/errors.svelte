<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { RenderLog } from '../jianpu/index'

  export let visible = false
  export let errors: RenderLog[] = []
  export let warnings: RenderLog[] = []
  
  const dispatcher = createEventDispatcher()
  const closeDialog = () => {
    dispatcher('close')
  }
  </script>

<div class="dialog-container" class:visible={visible}>
  <div class="dialog errors-dialog">
    <header>错误/警号信息</header>
    <div class="content">
      {#each errors as err }
      <div class="log-item error">
        <div class="position">位置: {err.index}</div>
        <span class="message">{err.message}</span>
      </div>
      {/each}
      {#each warnings as warn }
      <div class="log-item warning">
        <div class="position">位置: {warn.index}</div>
        <span class="message">{warn.message}</span>
      </div>
      {/each}
    </div>
    <footer>
      <button type="button" class="gray" on:click={closeDialog}>关闭</button>
    </footer>
  </div>
</div>

<style>
  .log-item {
    padding: 0.5rem 0 0 0;
    display: flex;
  }
  .log-item .message {
    flex: 1;
    color: var(--red);
  }
  .log-item .position {
    width: 12rem;
  }
   .log-item.error .message {
    color: var(--red);
  }
  .log-item.warning .message {
    color: var(--orange);
  }
  .errors-dialog {
    min-width: 700px;
  }
</style>