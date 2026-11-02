<script lang="ts">
  import SheetPanel from './components/SheetPanel.svelte'
  import NotationPanel from './components/NotationPanel.svelte'
  import Help from './components/help.svelte'
  import Errors from './components/errors.svelte'
  import PlayerBar from './components/PlayerBar.svelte'

  import type { Jianpu, RenderLog } from './jianpu/index'
  import { getContext, onMount } from 'svelte'
  const jianpu = getContext<Jianpu>('jianpu')

  let errors: RenderLog[] = []
  let warnings: RenderLog[] = []
  let logCount = 0
  let btnCls = 'disable'
  let helpVisible = false
  let logsVisible = false
  let sheetLocked = jianpu.locked

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
    jianpu.listen('Locked', (_, ev) => {
      sheetLocked = ev.locked
    })
  })
</script>

<main>
  <SheetPanel />
  <NotationPanel />
  <Help visible={helpVisible} on:close={() => helpVisible = false} />
  <Errors visible={logsVisible} errors={errors} warnings={warnings} on:close={() => logsVisible = false} />

  <div class="mask" class:visible={sheetLocked}></div>
  <div class="fixed-bar">
    <PlayerBar />
    <div class="helps">
      <button class="gray" on:click={() => helpVisible = true}>说明</button>
      <button class={btnCls} on:click={() => showError()}>消息({logCount})</button>
    </div>
  </div>
</main>

<style>
.fixed-bar {
  position: fixed;
  display: flex;
  top: 0;
  left: 0;
  width: calc(100vw - 500px);
  height: 45px;
  padding: 0 2rem;
  align-items: center;
  background-color: white;
  border-bottom: 1px solid #333;
  box-sizing: border-box;
}
.fixed-bar .helps {
  width: 200px;
}
.mask {
  display: none;
  position: absolute;
  background-color: rgba(33, 33, 33, 0.5);
  top: 0;
  right: 0;
  width: 500px;
  height: 100vh;
  z-index: 9999;
}
.mask.visible {
  display: block;
}
</style>
