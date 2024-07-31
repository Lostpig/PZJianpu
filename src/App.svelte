<script lang="ts">
  import SheetPanel from './components/SheetPanel.svelte'
  import NotationPanel from './components/NotationPanel.svelte'
  import Help from './components/help.svelte'
  import Errors from './components/errors.svelte'

  import type { Jianpu, RenderLog } from './jianpu/index'
  import { getContext, onMount } from 'svelte'
  const jianpu = getContext<Jianpu>('jianpu')

  let errors: RenderLog[] = []
  let warnings: RenderLog[] = []
  let logCount = 0
  let btnCls = 'disable'
  let helpVisible = false
  let logsVisible = false

  const showError = () => {
    if (logCount === 0) return
    logsVisible = true
  }
  onMount(() => {
    jianpu.listen('Rendered', (_, ev) => {
      errors = ev.logs.filter(n => n.type === 'error')
      warnings = ev.logs.filter(n => n.type === 'warning')
      logCount = ev.logs.length
      btnCls = errors.length > 0 ? 'red' : (warnings.length > 0 ? 'orange' : 'disable')
    })
  })
</script>

<main>
  <SheetPanel />
  <NotationPanel />
  <Help visible={helpVisible} on:close={() => helpVisible = false} />
  <Errors visible={logsVisible} errors={errors} warnings={warnings} on:close={() => logsVisible = false} />

  <div class="bottom">
    <button class="gray" on:click={() => helpVisible = true}>说明</button>
    <button class={btnCls} on:click={() => showError()}>消息({logCount})</button>
  </div>
</main>

<style>
.bottom {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
}
</style>
