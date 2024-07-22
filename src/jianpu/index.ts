import type { Sheet, Options, Notation, Mode, Beat, Bpm, Info, Note, Rest, Tuplet } from './declare'
import { NotationType, ModeText } from './declare'
import type { RenderSheet } from './render'
import { preRenderSheet, render, paint, paintItem, preRenderNotation, eraseNotation } from './render'

interface JianpuEvents {
  'NotationSelected': { notation?: Notation, index: number }
  'NotationUpdated': { notation: Notation, index: number }
}
export type JianpuEventName = keyof JianpuEvents
export type JianpuEvent<T extends JianpuEventName> = JianpuEvents[T]
export type JianpuEventHandler<T extends JianpuEventName> = (instance: Jianpu, event: JianpuEvent<T>) => void

const selectedColor = '#3471ff'
const cloneNotation = (notation: Notation): Notation => {
  if (notation.type === NotationType.Note) {
    const ornaments = notation.ornaments.map(p => ({...p}))
    const pitch = {
      ...notation.pitch
    }
    const note = {
      ...notation,
      pitch,
      ornaments
    }
    return note
  } else if (notation.type === NotationType.Rest) {
    return { ...notation }
  } else if  (notation.type === NotationType.Tuplet) {
    const pitches = notation.pitches.map(p => ({...p}))
    const tuplet = {
      ...notation,
      pitches
    }
    return tuplet
  }

  return notation
}

export class Jianpu {
  private _options: Options
  private _renderSheet: RenderSheet
  private _context?: CanvasRenderingContext2D
  private _eventHandlers = new Map<JianpuEventName, JianpuEventHandler<any>[]>()
  public DEBUG: boolean = false

  static DefaultSheet(): Sheet {
    return {
      info: {
        title: 'Unknown',
        subTitle: '',
        artist: '',
        copyright: ''
      },
      repeats: [],
      modes: [{ notation: 0, value: 0 }],
      beats: [{ notation: 0, numerator: 4, denominator: 4 }],
      bpms: [{ notation: 0, bpm: 72 }],
      notations: [
        { type: NotationType.Rest, time: 4 },
        { type: NotationType.Rest, time: 4 },
        { type: NotationType.Rest, time: 4 },
        { type: NotationType.Rest, time: 4 }
      ]
    }
  }
  static DefaultOptions(): Options {
    return {
      width: 1280,
      paddingX: 80,
      paddingY: 100,
      fontsize: 32,
      linePadding: 40
    }
  }

  constructor(sheet?: Sheet, options?: Options) {
    this.setSheet(sheet ?? Jianpu.DefaultSheet())
    this.setOptions(options ?? Jianpu.DefaultOptions())
  }
  setSheet(sheet: Sheet) {
    const clone: Sheet = {
      info: { ...sheet.info },
      repeats: sheet.repeats.map(x => ({ ...x })),
      modes: sheet.modes.map(x => ({ ...x })),
      bpms: sheet.bpms.map(x => ({ ...x })),
      beats: sheet.beats.map(x => ({ ...x })),
      notations: sheet.notations.map(cloneNotation),
    }
    this._renderSheet = preRenderSheet(clone)

    this.selectNotation(-1)
    this.render()
  }
  getSheet() {
    const sheet: Sheet = {
      info: { ...this._renderSheet.info },
      repeats: this._renderSheet.repeats.map(x => ({ ...x })),
      modes: this._renderSheet.modes.map(x => ({ ...x })),
      bpms: this._renderSheet.bpms.map(x => ({ ...x })),
      beats: this._renderSheet.beats.map(x => ({ ...x })),
      notations: this._renderSheet.notations.map(n => cloneNotation(n.notation)),
    }
    return sheet
  }
  setOptions(options: Options) {
    this._options = { ...options }

    this.render()
  }
  getOptions() {
    return { ...this._options }
  }
  getNotation(index: number) {
    const n = this._renderSheet.notations[index]
    if (n) {
      return cloneNotation(n.notation)
    }
    return undefined
  }

  private _selectdIndex: number = -1
  get selectedIndex() { return this._selectdIndex }
  get notationCount() { return this._renderSheet.notations.length }

  private initCanvasHandler(canvas: HTMLCanvasElement) {
    canvas.addEventListener('click', (ev) => {
      const rect = canvas.getBoundingClientRect()

      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      if (this.DEBUG) console.log(`click point: x:${x}  y:${y}`)
  
      const last = this._selectdIndex
      let selected = -1
      for(let i = 0; i < this._renderSheet.notations.length; i++) {
        const n = this._renderSheet.notations[i]
        if (x > n.x1 && x < n.x2 && y > n.y1 && y < n.y2) {
          selected = i
          break
        }
      }

      this.selectNotation(selected)
      if (last >= 0 && last !== selected) {
        this.paintNotation(last)
      }
      if (selected >= 0 && selected !== last) {
        this.paintNotation(selected, selectedColor)
      }
    })
  }
  selectNotation(index: number) {
    if (this._selectdIndex === index) return
    this._selectdIndex = index
    const notation = this._renderSheet.notations[index]

    const event: JianpuEvent<'NotationSelected'> = {
      notation: notation ? cloneNotation(notation.notation) : undefined,
      index: this._selectdIndex
    }
    this.dispatch('NotationSelected', event)
  }

  binding(canvas: HTMLCanvasElement) {
    // if (this._context) this._context.canvas.removeEventListener('click', ...)

    this._context = canvas.getContext('2d')!
    this.initCanvasHandler(canvas)
  }

  private tickRendered = false
  render() {
    if (this.tickRendered === true) return

    this.tickRendered = true
    Promise.resolve().then(() => {
      this.excuteRender()
      this.tickRendered = false
    })
  }
  private excuteRender() {
    if (!this._context) return

    const result = render(this._renderSheet, this._options)
    this._context.canvas.width = result.width
    this._context.canvas.height = result.height

    paint(this._context, result)
    if (this._selectdIndex >= 0) this.paintNotation(this._selectdIndex, selectedColor)
  }
  paintNotation (index: number, style?: string) {
    if (!this._context) return
    if (index < 0) return

    const notation = this._renderSheet.notations[index]

    eraseNotation(this._context, notation)
    if (this.DEBUG) {
      this._context.strokeStyle = '#ff6633'
      this._context.strokeRect(notation.x1, notation.y1, notation.x2 - notation.x1, notation.y2 - notation.y1)
      console.log(`paint notation rect: [${notation.x1}, ${notation.x2}, ${notation.y1}, ${notation.y2}]`)
    }

    for(const item of notation.renderItems) {
      paintItem(this._context, item, style)
    }
  }

  private dispatch<T extends JianpuEventName>(eventName: T, event: JianpuEvent<T>) {
    const handlers = this._eventHandlers.get(eventName)
    if (handlers && handlers.length > 0) {
      for (const handler of handlers) {
        handler(this, event)
      }
    }
  }
  listen<T extends JianpuEventName>(eventName: T, handler: JianpuEventHandler<T>) {
    let handlers = this._eventHandlers.get(eventName)
    if (!handlers) {
      handlers = []
      this._eventHandlers.set(eventName, handlers)
    }
    handlers.push(handler)
  
    const unlisten = () => {
      const i = handlers.indexOf(handler)
      handlers.splice(i, 1)
    }
    return unlisten
  }

  updateInfo(info: Info) {
    const clone = { ...info }
    this._renderSheet.info = clone
    this.render()
  }

  updateNotation(notation: Notation, index: number) {
    if (index < 0 || index >= this._renderSheet.notations.length) return

    this._renderSheet.notations[index] = preRenderNotation(notation)

    this.dispatch('NotationUpdated', { notation: cloneNotation(notation), index })
    this.render()
  }
  deleteNotation(index: number) {
    if (index < 0 || index >= this._renderSheet.notations.length) return

    this._renderSheet.notations.splice(index, 1)
    if (this._selectdIndex > this._renderSheet.notations.length - 1) this.selectNotation(this._renderSheet.notations.length - 1)

    this.dispatch('NotationUpdated', { notation: cloneNotation(this._renderSheet.notations[index].notation), index })
    this.render()
  }
  addNotation(notation: Notation, index?: number) {
    const append = cloneNotation(notation)
    const rendered = preRenderNotation(append)

    if (typeof index === 'number' && index >= 0) {
      this._renderSheet.notations.splice(index, 0, rendered)
      this.selectNotation(index + 1)
    } else {
      this._renderSheet.notations.push(rendered)
      this.selectNotation(this._renderSheet.notations.length - 1)
    }

    this.render()
  }

  updateMode(mode: Mode, index: number) {
    if (index === 0 && mode.notation !== 0) {
      throw new Error('The first mode anchored index must be 0')
    }

    const clone = { ...mode }
    this._renderSheet.modes[index] = clone

    this.render()
  }
  deleteMode(index: number) {
    if (index === 0) {
      throw new Error('Cannot delete the first mode')
    }

    this._renderSheet.modes.splice(index, 1)
  }
  addMode(mode: Mode, index?: number) {
    const clone = { ...mode }

    if (typeof index === 'number' && index >= 0) {
      this._renderSheet.modes.splice(index, 0, clone)
    } else {
      this._renderSheet.modes.push(clone)
    }

    this.render()
  }

  updateBeat(beat: Beat, index: number) {
    if (index === 0 && beat.notation !== 0) {
      throw new Error('The first beat anchored index must be 0')
    }

    const clone = { ...beat }
    this._renderSheet.beats[index] = clone

    this.render()
  }
  deleteBeat(index: number) {
    if (index === 0) {
      throw new Error('Cannot delete the first beat')
    }

    this._renderSheet.beats.splice(index, 1)
  }
  addBeat(beat: Beat, index?: number) {
    const clone = { ...beat }

    if (typeof index === 'number' && index >= 0) {
      this._renderSheet.beats.splice(index, 0, clone)
    } else {
      this._renderSheet.beats.push(clone)
    }

    this.render()
  }

  updateBpm(bpm: Bpm, index: number) {
    if (index === 0 && bpm.notation !== 0) {
      throw new Error('The first bpm anchored index must be 0')
    }

    const clone = { ...bpm }
    this._renderSheet.bpms[index] = clone

    this.render()
  }
  deleteBpm(index: number) {
    if (index === 0) {
      throw new Error('Cannot delete the first bpm')
    }

    this._renderSheet.bpms.splice(index, 1)
  }
  addBpm(bpm: Bpm, index?: number) {
    const clone = { ...bpm }

    if (typeof index === 'number' && index >= 0) {
      this._renderSheet.bpms.splice(index, 0, clone)
    } else {
      this._renderSheet.bpms.push(clone)
    }

    this.render()
  }
}
export { ModeText, NotationType }
export type { Sheet, Options, Notation, Mode, Beat, Bpm, Info, Note, Rest, Tuplet }