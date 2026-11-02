<script lang="ts">
import { getContext, onMount } from 'svelte'
import { Jianpu, type Notation, type JianpuEvent } from '../jianpu/index'
import { NotationType } from '../jianpu/index'
import type { SheetOperation } from '../jianpu/operation'
import type { MidiPlayer } from '../midi/midi';
const jianpu = getContext<Jianpu>('jianpu')
const midi = getContext<MidiPlayer | undefined>('midi')
const operation = getContext<SheetOperation>('operation')

let index = -1
let notation: Notation | undefined = undefined
const onNotationSelected = (instance: Jianpu, ev: JianpuEvent<'NotationSelected'>) => {
  notation = ev.notation
  index = ev.index
}
const onNotationUpdated = (instance: Jianpu, ev: JianpuEvent<'NotationUpdated'>) => {
  if (index === ev.index) {
    notation = ev.notation
  }
}

const saveNotation = () => {
  if (!notation) return
  jianpu.updateNotation(notation, index)
}
const addNotation = () => {
  jianpu.addNotation({ 
    type: NotationType.Note, 
    time: 16,
    pitch: { base: 1, accidental: 0, octave: 0 },
    slur: 0,
    dot: false,
    ornaments: []
  }, jianpu.selectedIndex)
}
const removeNotation = () => {
  jianpu.deleteNotation(index)
}
const copyNotation = () => {
  operation.copyNotation(notation)
}
const addPasteNoration = () => {
  operation.pasteAdd()
}
const pasteNoration = () => {
  operation.pasteOverride(index)
}

const tupletCountChange = (value: number) => {
  if (!notation) return
  if (notation.type !== NotationType.Tuplet) return

  if (value > notation.pitches.length) {
    const diff = value - notation.pitches.length
    const items = [...notation.pitches]
    for (let i = 0; i < diff; i++) {
      items.push({
        base: 1,
        accidental: 0,
        octave: 0
      })
    }
    notation.pitches = items
  } else if (value < notation.pitches.length) {
    notation.pitches = notation.pitches.slice(0, value)
  }
}
const typeChange = (value: number) => {
  if (!notation) return
  if (notation.type === value) return

  const time = notation.time
  if (value === NotationType.Note) {
    notation = {
      type: NotationType.Note,
      time: time,
      pitch: { base: 1, accidental: 0, octave: 0 },
      slur: 0,
      dot: false,
      ornaments: []
    }
  } else if (value === NotationType.Rest) {
    notation = {
      type: NotationType.Rest,
      time,
      dot: false
    }
  } else if (value === NotationType.Tuplet) {
    notation = {
      type: NotationType.Tuplet,
      time,
      pitches: [
        { base: 1, octave: 0, accidental: 0 },
        { base: 1, octave: 0, accidental: 0 },
        { base: 1, octave: 0, accidental: 0 }
      ]
    }
  }
}
const addOrnament = () => {
  if (!notation) return
  if (notation.type !== NotationType.Note) return

  notation.ornaments = [...notation.ornaments, { base: 1, octave: 0, accidental: 0 }]
}
const removeOrnament = () => {
  if (!notation) return
  if (notation.type !== NotationType.Note) return

  if (notation.ornaments.length > 0) notation.ornaments = notation.ornaments.slice(0, -1)
}
const testNote = () => {
  if (notation?.type == NotationType.Note) {
    const mode = jianpu.findMode(index)
    const bpm = jianpu.findBpm(index)
    const beat = jianpu.findBeat(index)

    midi?.TestPlay(notation, mode, beat, bpm)
  }
}

const octaves = [-3, -2, -1, 0, +1, +2, +3]
const accidentals = [-2, -1, 0, +1, +2]
const accidentalsText = ['𝄫', '♭', '无', '♯', '𝄪']
const pitches = [1, 2, 3, 4, 5, 6, 7]
const pitchesText = ['1 (Do)', '2 (Re)', '3 (Mi)', '4 (Fa)', '5 (Sol)', '6 (La)', '7 (Si)']
const times = [1, 2, 4, 8, 16, 32, 64]
const timesText = ['全音符', '二分音符', '四分音符', '八分音符', '16分音符', '32分音符', '64分音符']
onMount(() => {
  jianpu.listen('NotationSelected', onNotationSelected)
  jianpu.listen('NotationUpdated', onNotationUpdated)

  index = jianpu.selectedIndex
  notation = jianpu.getNotation(index)
})
</script>

<div class="notation-panel">
  {#if notation}
  <div class="notation">
    <label class="text-field">
      <span>位置：</span>
      <input type="text" value={index} readonly>
    </label>
    <label class="text-field">
      <span>类型：</span>
      <select on:change={(ev) => typeChange(parseInt(ev.currentTarget.value, 10))}>
        <option selected={notation.type === NotationType.Note} value={NotationType.Note}>音符</option>
        <option selected={notation.type === NotationType.Rest} value={NotationType.Rest}>休止符</option>
        <option selected={notation.type === NotationType.Tuplet} value={NotationType.Tuplet}>连音</option>
      </select>
    </label>
    <label class="text-field">
      <span>时值：</span>
      <select bind:value={notation.time}>
        {#each times as t, i}
          <option value={t}>{timesText[i]}</option>
        {/each}
      </select>
    </label>
    {#if notation.type === NotationType.Note || notation.type === NotationType.Rest}
    <label class="text-field">
      <span>附点：</span>
      <input type="checkbox" bind:checked={notation.dot}>
      <span class="space"></span>
    </label>
    {/if}
    {#if notation.type === NotationType.Note}
      <label class="text-field">
        <span>唱名：</span>
        <select bind:value={notation.pitch.base}>
          {#each pitches as v, i}
            <option value={v}>{pitchesText[i]}</option>
          {/each}
        </select>
      </label>
      <label class="text-field">
        <span>八度：</span>
        <select bind:value={notation.pitch.octave}>
          {#each octaves as v}
            <option value={v}>{v}</option>
          {/each}
        </select>
      </label>
      <label class="text-field">
        <span>升降：</span>
        <select bind:value={notation.pitch.accidental}>
          {#each accidentals as v, i}
            <option value={v}>{accidentalsText[i]}</option>
          {/each}
        </select>
      </label>
      <label class="text-field">
        <span>圆滑线：</span>
        <select bind:value={notation.slur}>
          <option value={0}>无</option>
          <option value={1}>起始</option>
          <option value={2}>结束</option>
        </select>
      </label>
      <label class="text-field">
        <span>装饰音：</span>
        <button type="button" style="margin-right: 0.5rem;" on:click={addOrnament}>+</button>
        <button type="button" class="red" on:click={removeOrnament}>-</button>
      </label>
      {#if notation.ornaments.length > 0}
      <div class="list" style="margin-top: 1rem;">
        <div>
          <div class="inline-field-header"><span>唱名</span></div>
          <div class="inline-field-header"><span>八度</span></div>
          <div class="inline-field-header"><span>升降</span></div>
        </div>
        {#each notation.ornaments as pitch}
          <div>
            <div class="inline-field">
              <select bind:value={pitch.base}>
                {#each pitches as v}
                  <option value={v}>{v}</option>
                {/each}
              </select>
            </div>
            <div class="inline-field">
              <select bind:value={pitch.octave}>
                {#each octaves as v}
                  <option value={v}>{v}</option>
                {/each}
              </select>
            </div>
            <div class="inline-field">
              <select bind:value={pitch.accidental}>
                {#each accidentals as v, i}
                  <option value={v}>{accidentalsText[i]}</option>
                {/each}
              </select>
            </div>
          </div>
        {/each}
      </div>
      {/if}
    {:else if notation.type === NotationType.Tuplet}
      <label class="text-field">
        <span>N连音：</span>
        <select on:change={(ev) => tupletCountChange(parseInt(ev.currentTarget.value, 10))}>
          <option selected={notation.pitches.length === 3} value={3}>3</option>
          <option selected={notation.pitches.length === 5} value={5}>5</option>
          <option selected={notation.pitches.length === 6} value={6}>6</option>
          <option selected={notation.pitches.length === 7} value={7}>7</option>
          <option selected={notation.pitches.length === 9} value={9}>9</option>
        </select>
      </label>
      <label class="text-field">
        <span>音符：</span>
      </label>
      <div class="list">
        <div>
          <div class="inline-field-header"><span>唱名</span></div>
          <div class="inline-field-header"><span>八度</span></div>
          <div class="inline-field-header"><span>升降</span></div>
        </div>
        {#each notation.pitches as pitch}
          <div>
            <div class="inline-field">
              <select bind:value={pitch.base}>
                {#each pitches as v, i}
                  <option value={v}>{pitchesText[i]}</option>
                {/each}
              </select>
            </div>
            <div class="inline-field">
              <select bind:value={pitch.octave}>
                {#each octaves as v}
                  <option value={v}>{v}</option>
                {/each}
              </select>
            </div>
            <div class="inline-field">
              <select bind:value={pitch.accidental}>
                {#each accidentals as v, i}
                  <option value={v}>{accidentalsText[i]}</option>
                {/each}
              </select>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <div class="footer">
    <button type="button" class="gray" on:click={() => addNotation()}>插入</button>
    <button type="button" class="red" on:click={() => removeNotation()}>删除</button>
    <button type="button" class="orange" on:click={() => copyNotation()}>复制</button>
    <button type="button" class="orange" on:click={() => pasteNoration()}>粘贴</button>
    <div class="space"></div>
    <button type="button" class="orange" on:click={() => testNote()}>试音</button>
    <button type="button" on:click={() => saveNotation()}>应用</button>
  </div>
  {:else}
    <p>未选中音符</p>
    <button type="button" class="gray" on:click={() => addNotation()}>插入新音符</button>
    <button type="button" class="gray" on:click={() => addPasteNoration()}>粘贴新音符</button>
  {/if}
</div>

<style>
.notation-panel {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 1rem;
  box-shadow: var(--panel-shadow);
  max-height: 550px;
  overflow-y: auto;
}
.text-field {
  display: flex;
  margin-top: 1rem;
  align-items: center;
  height: 2rem;
}
.text-field > span {
  width: 6rem;
  text-align: right;
}
.text-field > input,
.text-field > select {
  flex: 1;
  height: 100%;
  border: var(--custom-border);
  border-radius: 0.5rem;
  margin-left: 0.5rem;
  padding: 0 0.5rem;
}
.text-field > input[type=checkbox] {
  flex: none;
  height: 75%;
  width: 2rem;
}
.text-field .space {
  flex: 1;
}

.list {
  margin-left: 8.5rem;
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
  width: 5rem;
}
.inline-field > select {
  height: 2rem;
  border: var(--custom-border);
  border-radius: 0.5rem;
  padding: 0 0.5rem;
  width: 100%;
}
.inline-field-header {
  display: inline-block;
  width: 5rem;
  margin-right: 1rem;
  text-align: center;
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
</style>