<script lang="ts">
  import SheetPanel from './components/SheetPanel.svelte'
  import NotationPanel from './components/NotationPanel.svelte'
  import Help from './components/help.svelte'
  import Errors from './components/errors.svelte'

  import type { Jianpu, RenderError } from './jianpu/index'
  import { getContext, onMount } from 'svelte'
  const jianpu = getContext<Jianpu>('jianpu')

  let errors: RenderError[] = []
  let helpVisible = false
  let errorsVisible = false

  const showError = () => {
    if (errors.length === 0) return
    errorsVisible = true
  }
  onMount(() => {
    jianpu.listen('Rendered', (_, ev) => {
      errors = ev.errors
    })
  })
</script>

<main>
  <SheetPanel />
  <NotationPanel />
  <Help visible={helpVisible} on:close={() => helpVisible = false} />
  <Errors visible={errorsVisible} errors={errors} on:close={() => errorsVisible = false} />

  <div class="bottom">
    <button class="gray" on:click={() => helpVisible = true}>说明</button>
    <button class="red" on:click={() => showError()}>错误({errors.length})</button>
  </div>
</main>

<style>
.bottom {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
}
</style>
