<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import type { Jianpu, Sheet, Mode, Beat, Bpm, Options } from '../jianpu/index'
  import { ModeText } from '../jianpu/index'
  const jianpu = getContext<Jianpu>('jianpu')
  const options = jianpu.getOptions()
  let sheet: Sheet = jianpu.getSheet()

  let tab = 1
  let file_importer: HTMLInputElement

  const activeTab = (index: number) => {
    tab = index
  }
  const saveInfo = () => {
    jianpu.setOptions(options)
    jianpu.updateInfo(sheet.info)
  }

  const saveMode = (mode: Mode) => {
    try {
      jianpu.updateMode(mode.notation, mode.value)
    } catch (err) {
      alert((err as Error).message)
    }
  }
  const addMode = () => {
    if (jianpu.selectedIndex < 0) {
      alert('请先选中一个音符')
      return
    }

    try {
      jianpu.addMode(jianpu.selectedIndex, 0)
      sheet.modes = [...sheet.modes, { notation: jianpu.selectedIndex, value: 0 }]
    } catch (err) {
      alert((err as Error).message)
    }
  }
  const deleteMode = (mode: Mode, index: number) => {
    try {
      jianpu.deleteMode(mode.notation)
      sheet.modes = [...sheet.modes.slice(0, index), ...sheet.modes.slice(index + 1)]
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const saveBeat = (beat: Beat) => {
    try {
      jianpu.updateBeat(beat.notation, beat.denominator, beat.numerator)
    } catch (err) {
      alert((err as Error).message)
    }
  }
  const addBeat = () => {
    if (jianpu.selectedIndex < 0) {
      alert('请先选中一个音符')
      return
    }

    try {
      jianpu.addBeat(jianpu.selectedIndex, 4, 4)
      sheet.beats = [...sheet.beats, { notation: jianpu.selectedIndex, denominator: 4, numerator: 4 }]
    } catch (err) {
      alert((err as Error).message)
    }
  }
  const deleteBeat = (beat: Beat, index: number) => {
    try {
      jianpu.deleteBeat(beat.notation)
      sheet.beats = [...sheet.beats.slice(0, index), ...sheet.beats.slice(index + 1)]
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const saveBpm = (bpm: Bpm) => {
    try {
      jianpu.updateBpm(bpm.notation, bpm.bpm)
    } catch (err) {
      alert((err as Error).message)
    }
  }
  const addBpm = () => {
    if (jianpu.selectedIndex < 0) {
      alert('请先选中一个音符')
      return
    }

    try {
      jianpu.addBpm(jianpu.selectedIndex, 72)
      sheet.bpms = [...sheet.bpms, { notation: jianpu.selectedIndex, bpm: 72 }]
    } catch (err) {
      alert((err as Error).message)
    }
  }
  const deleteBpm = (bpm: Bpm, index: number) => {
    try {
      jianpu.deleteBpm(bpm.notation)
      sheet.bpms = [...sheet.bpms.slice(0, index), ...sheet.bpms.slice(index + 1)]
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const exportJson = () => {
    const exportSheet = jianpu.getSheet()
    const json = JSON.stringify(exportSheet)

    const data = new Blob([json], { type: 'application/json' })
    const downloadLink = document.createElement('a')
    downloadLink.download = 'sheet.json'
    downloadLink.href = URL.createObjectURL(data)
    downloadLink.click()
    URL.revokeObjectURL(downloadLink.href)
  }
  const importJson = (file?: File) => {
    if (file) {
      const reader = new FileReader()
      
      reader.addEventListener('loadend', () => {
        try {
          const json = JSON.parse(reader.result as string)
          jianpu.setSheet(json)
          sheet = jianpu.getSheet()
        } catch (err) {
          alert((err as Error).message || 'import failed!')
        }
      })
      reader.addEventListener('error', (ev) => {
        alert('import failed!')
      })

      reader.readAsText(file, "utf8")
    }
  }

  onMount(() => {
    fetch('/test.json').then(async (res) => {
      const text = await res.text()
      const json = JSON.parse(text)

      jianpu.setSheet(json)
      sheet = jianpu.getSheet()

      jianpu.render()
    })
  })
</script>

<div class="info-panel">
  <div class="tabs">
    <div class:active={tab === 1} on:click={() => activeTab(1)}>基本设置</div>
    <div class:active={tab === 2} on:click={() => activeTab(2)}>演奏信息</div>
  </div>
  {#if tab === 1}
  <div class="info">
    <label class="text-field">
      <span>标题：</span>
      <input type="text" bind:value={sheet.info.title}>
    </label>
    <label class="text-field">
      <span>副标题：</span>
      <input type="text" bind:value={sheet.info.subTitle}>
    </label>
    <label class="text-field">
      <span>作者：</span>
      <input type="text" bind:value={sheet.info.artist}>
    </label>
    <label class="text-field">
      <span>版权信息：</span>
      <input type="text" bind:value={sheet.info.copyright}>
    </label>
    <hr>
    <label class="text-field">
      <span>画布宽度：</span>
      <input type="number" bind:value={options.width}>
    </label>
    <label class="text-field">
      <span>字体大小：</span>
      <input type="number" bind:value={options.fontsize}>
    </label>
    <label class="text-field">
      <span>行间距：</span>
      <input type="number" bind:value={options.linePadding}>
    </label>
    <label class="text-field">
      <span>上下间距：</span>
      <input type="number" bind:value={options.paddingX}>
    </label>
    <label class="text-field">
      <span>左右间距：</span>
      <input type="number" bind:value={options.paddingY}>
    </label>
    <hr>
    <div class="footer">
      <input type="file" accept=".json" bind:this={file_importer} on:change={(ev) => importJson(ev.currentTarget.files?.[0])} style="display: none;">
      <button type="button" on:click={() => file_importer.click()}>导入</button>
      <button type="button" on:click={() => exportJson()}>导出</button>
      <div class="space"></div>
      <button type="button" on:click={() => saveInfo()}>应用</button>
    </div>
  </div>
  {:else}
  <div class="settings">
    <div>
      <div>
        <span class="caption">调号</span>
        <button type="button" on:click={() => addMode()}>+</button>
      </div>

      <div class="list">
        {#each sheet.modes as mode, i }
          <div>
            <div class="inline-field">
              <span>位置：</span>
              <input type="number" readonly value={mode.notation}>
            </div>
            <div class="inline-field">
              <span>1 = </span>
              <select bind:value={mode.value}>
                {#each ModeText as text, index}
                  <option value="{index}">{text}</option>
                {/each}
              </select>
            </div>
            <div class="operate">
              <button type="button" on:click={() => saveMode(mode)}>应用</button>
              <button type="button" class="red" on:click={() => deleteMode(mode, i)}>-</button>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div>
      <div>
        <span class="caption">拍号</span>
        <button type="button" on:click={() => addBeat()}>+</button>
      </div>
      <div class="list">
        {#each sheet.beats as beat, i}
          <div>
            <div class="inline-field">
              <span>位置：</span>
              <input type="number" readonly value={beat.notation}>
            </div>
            <div class="inline-field beat">
              <input type="number" bind:value={beat.numerator}>
              <span>/</span>
              <input type="number" bind:value={beat.denominator}>
            </div>
            <div class="operate">
              <button type="button" on:click={() => saveBeat(beat)}>应用</button>
              <button type="button" class="red" on:click={() => deleteBeat(beat, i)}>-</button>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div>
      <div>
        <span class="caption">速度</span>
        <button type="button" on:click={() => addBpm()}>+</button>
      </div>
      <div class="list">
        {#each sheet.bpms as bpm, i}
          <div>
            <div class="inline-field">
              <span>位置：</span>
              <input type="number" readonly value={bpm.notation}>
            </div>
            <div class="inline-field">
              <span>𝅘𝅥 = </span>
              <input type="number" bind:value={bpm.bpm}>
            </div>
            <div class="operate">
              <button type="button" on:click={() => saveBpm(bpm)}>应用</button>
              <button type="button" class="red" on:click={() => deleteBpm(bpm, i)}>-</button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
  {/if}
</div>

<style>
.info-panel {
  padding: 1rem;
  border-radius: 1rem;
  box-shadow: var(--panel-shadow);
}
.tabs {
  display: flex;
  border: var(--custom-border);
  border-radius: 0.5rem;
  overflow: hidden;
}
.tabs > div {
  flex: 1;
  cursor: pointer;
  padding: 0.5rem;
  text-align: center;
}
.tabs > div.active {
  color: var(--white);
  background-color: var(--active-blue);
}

.info, .settings {
  height: 550px;
  overflow-y: auto;
}

.text-field {
  display: flex;
  margin-top: 1rem;
  align-items: center;
}
.text-field > span {
  width: 6rem;
  text-align: right;
}
.text-field > input {
  flex: 1;
  height: 2rem;
  border: var(--custom-border);
  border-radius: 0.5rem;
  margin-left: 0.5rem;
  padding: 0 0.5rem;
}
.footer {
  display: flex;
  margin-top: 0.5rem;
  border-top: var(--custom-border);
  padding-top: 1rem;
}
.footer button {
  margin-right: 0.5rem;
}
.space {
  flex: 1;
}

.settings > div {
  margin-top: 1rem;
}
.caption {
  font-size: 1.25rem;
}
.list {
  margin-top: 0.5rem;
  border-bottom: var(--custom-border);
}
.list > div {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-style: solid;
  border-color: var(--border-color);
  border-width: 1px 1px 0 1px;
}
.inline-field {
  display: inline-block;
  margin-right: 1rem;
}
.inline-field > input,
.inline-field > select {
  height: 2rem;
  border: var(--custom-border);
  border-radius: 0.5rem;
  margin-left: 0.5rem;
  padding: 0 0.5rem;
  width: 3rem;
}
.inline-field.beat > input {
  width: 2rem;
}
.operate {
  flex: 1;
  display: inline-block;
  text-align: right;
}
</style>