<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import type { Jianpu } from '../jianpu/index'
  import { type MidiPlayer, SheetToMidi } from '../midi/midi';
  import { InstList } from '../midi/inst-list'
  const jianpu = getContext<Jianpu>('jianpu')
  const midi = getContext<MidiPlayer | undefined>('midi')

  let time = 0
  let ctime = 0
  let playing = false
  let instIndex = midi?.inst ?? 0
  let speed = 100
  const play = () => {
    if (!midi) {
      alert('midi not support!')
      return
    }

    midi.inst = instIndex + 1
    const sheet = jianpu.getSheet()
    const data = SheetToMidi(sheet)

    time = data.time
    midi.play(data, jianpu.selectedIndex, speed / 100)
  }
  const stop = () => {
    midi?.stop()
  }
  onMount(() => {
    midi?.onUpdate((t, p) => {
      ctime = t
      if (playing != p) {
        jianpu.lock(p)
        playing = p
      }
    })

    midi?.onPlayNote(i => {
      jianpu.selectNotation(i)
    })
  })

  const formatTime = (t: number) => {
    let ms = t % 60000
    let m = (t - ms) / 60000
    let s = Math.floor(ms / 1000)

    return `${m}:${s >= 10 ? s : '0' + s}`
  }
</script>

<div class="player-bar">
  <span>实例</span>
  <select bind:value={instIndex}>
    {#each InstList as item, index}
      <option value="{index}">{item.name}</option>
    {/each}
  </select>
  <span>速度</span>
  <select bind:value={speed}>
    <option value="{200}">200%</option>
    <option value="{150}">150%</option>
    <option value="{125}">125%</option>
    <option value="{100}">100%</option>
    <option value="{90}">90%</option>
    <option value="{75}">75%</option>
    <option value="{60}">60%</option>
    <option value="{50}">50%</option>
  </select>
  <button type="button" on:click={() => play()}>播放</button>
  <button type="button" on:click={() => stop()}>停止</button>
  <span>{formatTime(ctime)}</span>
  <span>/</span>
  <span>{formatTime(time)}</span>
</div>

<style>
.player-bar {
  flex: 1;
}
.player-bar > select {
  height: 2rem;
  border: var(--custom-border);
  border-radius: 0.5rem;
  padding: 0 0.5rem;
  width: 12rem;
  margin-right: 2rem;
}
</style>