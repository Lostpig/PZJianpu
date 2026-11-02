import wiPlayer  from 'webaudio-instruments'
import type { Sheet, Notation, ModeValue, Mode, Bpm, Beat, Pitch, Note } from '../jianpu/declare'
import { NotationType } from '../jianpu/declare'

export const initializeMidi = async (): Promise<wiPlayer> => {
  const ac = new AudioContext()
  return new wiPlayer()
}

const getNote = (pt: Pitch, mode: Mode) => {
  const base = 45 + mode.value + mode.octave * 12
  let n = 0
  switch(pt.base) {
    case 1: n = 0; break;
    case 2: n = 2; break;
    case 3: n = 4; break;
    case 4: n = 5; break;
    case 5: n = 7; break;
    case 6: n = 9; break;
    case 7: n = 11; break;
  }
  n = n + pt.accidental + pt.octave * 12

  return base + n
}
const getDuration = (nt: Notation, beat: Beat, bpm: Bpm) => {
  let beatCount = beat.denominator / nt.time
  if (nt.type == NotationType.Note || nt.type == NotationType.Rest) {
    if (nt.dot) beatCount = beatCount * 1.5
  }

  return (60 * 1000 / (bpm.bpm * beat.denominator / 4)) * beatCount
}

export interface MidiData {
  time: number
  items: MidiItem[]
}
export interface MidiItem {
  noteIndex: number
  midiNote: number
  time: number
  duration: number
}
class MidiContext {
  beats: Beat[]
  bpms: Bpm[]
  modes: Mode[]

  private beatIndex = 0
  private bpmIndex = 0
  private modeIndex = 0
  private beatDuration: number

  get beat() { return this.beats[this.beatIndex] }
  get bpm() { return this.bpms[this.bpmIndex] }
  get mode() { return this.modes[this.modeIndex] }

  constructor(sheet: Sheet) {
    this.beats = sheet.beats.sort((a,b) => a.notation - b.notation)
    this.bpms = sheet.bpms.sort((a,b) => a.notation - b.notation)
    this.modes = sheet.modes.sort((a,b) => a.notation - b.notation)

    this.beatDuration = 60 * 1000 / (this.bpm.bpm * this.beat.denominator / 4)
  }

  change(index: number) {
    if (this.beatIndex < this.beats.length - 1) {
      if (this.beats[this.beatIndex + 1].notation <= index) {
        this.beatIndex++
        this.beatDuration = 60 * 1000 / (this.bpm.bpm * this.beat.denominator / 4)
      }
    }
    if (this.bpmIndex < this.bpms.length - 1) {
      if (this.bpms[this.bpmIndex + 1].notation <= index) {
        this.bpmIndex++
        this.beatDuration = 60 * 1000 / (this.bpm.bpm * this.beat.denominator / 4)
      }
    }

    if (this.modeIndex < this.modes.length - 1) {
      if (this.modes[this.modeIndex + 1].notation <= index) {
        this.modeIndex++
      }
    }
  }
  getDuration(nt: Notation): number {
    let beatCount = this.beat.denominator / nt.time
    if (nt.type == NotationType.Note || nt.type == NotationType.Rest) {
      if (nt.dot) beatCount = beatCount * 1.5
    }

    return this.beatDuration * beatCount
  }
  getNote(pt: Pitch) {
    return getNote(pt, this.mode)
  }
}

export const SheetToMidi = (sheet: Sheet) => {
  const context = new MidiContext(sheet)

  const data: MidiData = {
    time: 0,
    items: []
  }
  let index = 0
  for(; index < sheet.notations.length; index++) {
    context.change(index)
    const nt = sheet.notations[index]
    
    if (nt.type === NotationType.Note) {
      if (nt.ornaments.length > 0) {
        const ornament: MidiItem = {
          noteIndex: index,
          time: data.time,
          midiNote: context.getNote(nt.ornaments[0]),
          duration: context.getDuration(nt) * 0.333
        }
        data.items.push(ornament)
      }

      const item: MidiItem = {
        noteIndex: index,
        time: data.time,
        midiNote: context.getNote(nt.pitch),
        duration: context.getDuration(nt)
      }
      data.time += item.duration
      data.items.push(item)
    } else if (nt.type === NotationType.Rest) {
      const item: MidiItem = {
        noteIndex: index,
        time: data.time,
        midiNote: -1,
        duration: context.getDuration(nt)
      }
      data.time += item.duration
      data.items.push(item)
    } else {
      const pd = context.getDuration(nt) / nt.pitches.length
      for(let p of nt.pitches) {
        const item: MidiItem = {
          noteIndex: index,
          time: data.time,
          midiNote: context.getNote(p),
          duration: pd
        }
        data.time += item.duration
        data.items.push(item)
      }
    }
  }

  return data
}

export class MidiPlayer {
  private player: wiPlayer
  public inst = 24
  constructor(player: wiPlayer) {
    this.player = player
    this._playingData = { time: 0, items: [] }
  }
  private playMidi(note: number, duration: number) {
    this.player.play(this.inst, note, 1, 0, duration / 1000)
  }

  private _speedScale = 1
  private _stime = 0
  private _index = 0
  private _playingData: MidiData
  private _playing = false
  public get playing() { return this._playing }
  private _playtime = 0
  public get playtime() { return this._playtime }

  private playFrame(dtime: number) {
    this._playtime = (dtime - this._stime) / this._speedScale
    const c = this._playingData.items[this._index]
    if (this._playtime >= c.time) {
      this.PlayItem(c)
      this._index++
    }

    if (this._playing && c.time <= this._playingData.time && this._index < this._playingData.items.length) {
      this.dispatchUpdate(dtime)
      requestAnimationFrame(d => this.playFrame(d))
    } else {
      this._playing = false
      this._playtime = 0
      this.dispatchUpdate(dtime, true)
      console.log('play stop')
    }
  }
  private PlayItem(item: MidiItem) {
    if (item.midiNote >= 0) {
      this.playMidi(item.midiNote, item.duration * this._speedScale)
    }

    this.dispatchPlayNote(item)
  }
  play(data: MidiData, startIndex: number, speed: number) {
    if (this._playing) return

    this._playingData.time = data.time
    this._playingData.items = data.items.sort((a,b) => a.time - b.time)
    this._index = 0
    this._speedScale = 1 / speed

    let jumpTime = 0
    if (startIndex > 0) {
      for(let i = 0; i < data.items.length; i++) {
        if (data.items[i].noteIndex >= startIndex) {
          this._index = i
          jumpTime = data.items[i].time
          break
        }
      }
    }

    requestAnimationFrame(dtime => {
      this._stime = dtime - jumpTime * this._speedScale
      this._playing = true

      console.log('play start')
      requestAnimationFrame(d => this.playFrame(d))
    })
  }
  stop() {
    this._playing = false
  }

  private lastDispatchTime = 0
  private _handlers: ((time: number, playing: boolean) => void)[] = []
  private dispatchUpdate(dtime: number, force: boolean = false) {
    if (dtime - this.lastDispatchTime > 200 || force) {
      for (const handler of this._handlers) {
        handler(this._playtime, this._playing)
      }
      this.lastDispatchTime = dtime
    }
  }
  onUpdate(fn: (time: number, playing: boolean) => void) {
    this._handlers.push(fn)

    const unlisten = () => {
      const i = this._handlers.indexOf(fn)
      this._handlers.splice(i, 1)
    }
    return unlisten
  }

  private _pnHandlers: ((noteIndex: number) => void)[] = []
  private dispatchPlayNote(item: MidiItem) {
    for (const handler of this._pnHandlers) {
      handler(item.noteIndex)
    }
  }
  onPlayNote(fn: (noteIndex: number) => void) {
    this._pnHandlers.push(fn)

    const unlisten = () => {
      const i = this._pnHandlers.indexOf(fn)
      this._pnHandlers.splice(i, 1)
    }
    return unlisten
  }

  TestPlay(note: Note, mode: Mode, beat: Beat, bpm: Bpm) {
    const dr = getDuration(note, beat, bpm)
    const midinote = getNote(note.pitch, mode)
    this.playMidi(midinote, dr)
    console.log('playnote:' + note)
  }
}