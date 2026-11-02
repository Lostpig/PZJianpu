<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import { Jianpu, type Sheet, type Mode, type Beat, type Bpm } from '../jianpu/index'
  import { ModeText } from '../jianpu/index'
  import { compressGzip, decompressGzip, SaveToSheet, SheetToSave } from '../jianpu/save-converter'
  const jianpu = getContext<Jianpu>('jianpu')
  const options = jianpu.getOptions()
  let sheet: Sheet = jianpu.getSheet()

  let tab = 1
  let json_importer: HTMLInputElement
  let gzip_importer: HTMLInputElement

  const activeTab = (index: number) => {
    tab = index
  }
  const saveInfo = () => {
    jianpu.setOptions(options)
    jianpu.updateInfo(sheet.info)
  }

  const octaves = [-3, -2, -1, 0, +1, +2, +3]
  const saveMode = (mode: Mode) => {
    try {
      jianpu.updateMode(mode.notation, mode.value, mode.octave)
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
      jianpu.addMode(jianpu.selectedIndex, 0, 0)
      sheet.modes = [...sheet.modes, { notation: jianpu.selectedIndex, value: 0, octave: 0 }]
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

  const clearSheet = () => {
    const sure = confirm("确定要清空当前谱面吗？")
    if (!sure) return

    const emptySheet = Jianpu.DefaultSheet()
    jianpu.setSheet(emptySheet)
    sheet = jianpu.getSheet()
  }
  const exportJson = () => {
    const exportSheet = jianpu.getSheet()
    const json = SheetToSave(exportSheet)

    const data = new Blob([json], { type: 'application/json' })
    const downloadLink = document.createElement('a')
    downloadLink.download = `${exportSheet.info.title}.json`
    downloadLink.href = URL.createObjectURL(data)
    downloadLink.click()
    URL.revokeObjectURL(downloadLink.href)
  }
  const importJson = (file?: File) => {
    if (file) {
      const reader = new FileReader()
      
      reader.addEventListener('loadend', () => {
        try {
          const importSheet = SaveToSheet(reader.result as string)

          jianpu.setSheet(importSheet)
          sheet = importSheet
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

  const exportGzip = async () => {
    const exportSheet = jianpu.getSheet()
    const json = SheetToSave(exportSheet)
    const blob = await compressGzip(json)

    const downloadLink = document.createElement('a')
    downloadLink.download = `${exportSheet.info.title}.pzjp`
    downloadLink.href = URL.createObjectURL(blob)
    downloadLink.click()
    URL.revokeObjectURL(downloadLink.href)
  }
  const importGzip = async (file?: File) => {
    if (file) {
      const json = await decompressGzip(file)
      try {
        const importSheet = SaveToSheet(json)

        jianpu.setSheet(importSheet)
        sheet = importSheet
      } catch (err) {
        alert((err as Error).message || 'import failed!')
      }
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
    <div class="footer">
      <button class="red" type="button" on:click={() => clearSheet()}>清空</button>
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
              <select style="width: 4rem;" bind:value={mode.value}>
                {#each ModeText as text, index}
                  <option value="{index}">{text}</option>
                {/each}
              </select>
              <span>+</span>
              <select bind:value={mode.octave}>
                {#each octaves as v}
                  <option value={v}>{v}</option>
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
  <div class="data-manager">
    <input type="file" accept=".json" bind:this={json_importer} on:change={(ev) => importJson(ev.currentTarget.files?.[0])} style="display: none;">
    <input type="file" accept=".pzjp" bind:this={gzip_importer} on:change={(ev) => importGzip(ev.currentTarget.files?.[0])} style="display: none;">
    <button type="button" on:click={() => json_importer.click()}>导入Json</button>
    <button type="button" on:click={() => exportJson()}>导出Json</button>
    <button type="button" class="orange" on:click={() => gzip_importer.click()}>导入Gzip</button>
    <button type="button" class="orange" on:click={() => exportGzip()}>导出Gzip</button>
  </div>
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
  padding-top: 1rem;
}
.footer button {
  margin-right: 0.5rem;
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

.data-manager {
  padding-top: 0.5rem;
  border-top: var(--custom-border);
}
</style>