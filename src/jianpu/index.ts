import type { Sheet, Options, Notation, Mode, Beat, Bpm, Info, Note, Rest, Tuplet, SheetStyle, ModeValue } from './declare'
import { NotationType, ModeText } from './declare'
import type { RenderSheet, RenderError } from './render'
import { preRenderSheet, render, paint, paintItem, preRenderNotation, eraseNotation } from './render'

interface JianpuEvents {
  'NotationSelected': { notation?: Notation, index: number }
  'NotationUpdated': { notation: Notation, index: number }
  'Rendered': { errors: RenderError[] }
}
export type JianpuEventName = keyof JianpuEvents
export type JianpuEvent<T extends JianpuEventName> = JianpuEvents[T]
export type JianpuEventHandler<T extends JianpuEventName> = (instance: Jianpu, event: JianpuEvent<T>) => void

const selectedColor = '#3471ff'
const cloneNotation = (notation: Notation): Notation => {
  if (!notation) return notation

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
const mapValuesToArray = <T>(map: Map<unknown, T>) => {
  const result: T[] = []
  for (const [k, v] of map) {
    result.push({ ...v })
  }
  return result
}

export class Jianpu {
  private _options!: Options
  private _renderSheet!: RenderSheet
  private _context?: CanvasRenderingContext2D
  private _eventHandlers = new Map<JianpuEventName, JianpuEventHandler<any>[]>()
  private _selectedStyle: SheetStyle
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
      linePadding: 60,
      style: {
        fillColor: '#333333',
        backgroundColor: '#ffffff',
        font: 'Arial'
      }
    }
  }

  constructor(sheet?: Sheet, options?: Options) {
    this.setSheet(sheet ?? Jianpu.DefaultSheet())
    this.setOptions(options ?? Jianpu.DefaultOptions())

    this._selectedStyle = {
      fillColor: '#2769fe',
      backgroundColor: this._options.style.backgroundColor,
      font: this._options.style.font
    }
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

    this._selectdIndex = -1
    this.dispatch('NotationSelected', { notation: undefined, index: -1 })
    this.render()
  }
  getSheet() {
    const sheet: Sheet = {
      info: { ...this._renderSheet.info },
      repeats: this._renderSheet.repeats.map(x => ({ ...x })),
      modes: mapValuesToArray(this._renderSheet.modes),
      bpms: mapValuesToArray(this._renderSheet.bpms),
      beats: mapValuesToArray(this._renderSheet.beats),
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
  
      let selected = -1
      for(let i = 0; i < this._renderSheet.notations.length; i++) {
        const n = this._renderSheet.notations[i]
        if (x > n.x1 && x < n.x2 && y > n.y1 && y < n.y2) {
          selected = i
          break
        }
      }

      this.selectNotation(selected, true)
    })
  }
  selectNotation(index: number, toggle = false) {
    if (this._selectdIndex === index) {
      if (toggle) {
        this._selectdIndex = -1
        this.paintNotation(index)
      }
      return
    }

    const last = this._selectdIndex
    this._selectdIndex = index
    this.paintNotation(last)
    this.paintNotation(index)

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

    this._context.fillStyle = this._options.style.backgroundColor
    this._context.fillRect(0, 0, result.width, result.height)
    if (this.DEBUG) {
      this._context.fillStyle = '#ffddaa'
      this._context.fillRect(
        this._options.paddingX, 
        this._options.paddingY, 
        result.width - this._options.paddingX * 2, 
        result.height - this._options.paddingY * 2)
      
      if (result.errors.length > 0) {
        result.errors.forEach(err => console.log(`${err.index}: ${err.message}`))
      }
    }

    paint(this._context, result, this._options.style)
    if (this._selectdIndex >= 0) this.paintNotation(this._selectdIndex)

    this.dispatch('Rendered', { errors: result.errors })
  }
  paintNotation (index: number) {
    if (!this._context) return
    if (index < 0) return

    const notation = this._renderSheet.notations[index]
    eraseNotation(this._context, notation, this._options.style)

    const style = index === this._selectdIndex ? this._selectedStyle : this._options.style
    if (index === this._selectdIndex) {
      this._context.fillStyle = '#e7e7e7'
      this._context.fillRect(notation.x1, notation.y1, notation.x2 - notation.x1, notation.y2 - notation.y1)
      console.log(`selected notation rect: [${notation.x1}, ${notation.x2}, ${notation.y1}, ${notation.y2}]`)
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
    if (this._selectdIndex > this._renderSheet.notations.length - 1) {
      this._selectdIndex = this._renderSheet.notations.length - 1

      this.dispatch('NotationSelected', { notation: cloneNotation(this._renderSheet.notations[this._selectdIndex].notation), index: this._selectdIndex })
    } else {
      this.dispatch('NotationUpdated', { notation: cloneNotation(this._renderSheet.notations[index].notation), index })
    }

    this.render()
  }
  addNotation(notation: Notation, index?: number) {
    const append = cloneNotation(notation)
    const rendered = preRenderNotation(append)

    if (typeof index === 'number' && index >= 0 && index < this.notationCount - 1) {
      this._renderSheet.notations.splice(index + 1, 0, rendered)
      this._selectdIndex = index + 1
    } else {
      this._renderSheet.notations.push(rendered)
      this._selectdIndex = this.notationCount - 1
    }

    this.dispatch('NotationSelected', { notation, index: this._selectdIndex })
    this.render()
  }

  updateMode(index: number, value: ModeValue) {
    if (!this._renderSheet.modes.has(index)) {
      throw new Error(`音符位置${index}的调号不存在`)
    }

    this._renderSheet.modes.get(index)!.value = value
    this.render()
  }
  deleteMode(index: number) {
    if (index === 0) {
      throw new Error('无法删除谱面首个调号')
    }

    if (this._renderSheet.modes.delete(index)) this.render()
  }
  addMode(index: number, value: ModeValue) {
    if (this._renderSheet.modes.has(index)) {
      throw new Error('当前音符位置已存在调号信息')
    }
    const mode: Mode = {
      notation: index,
      value
    }
    this._renderSheet.modes.set(index, mode)

    this.render()
  }

  updateBeat(index: number, denominator: number, numerator: number) {
    if (!this._renderSheet.beats.has(index)) {
      throw new Error(`音符位置${index}的拍号不存在`)
    }

    const beat = this._renderSheet.beats.get(index)!
    beat.denominator = denominator
    beat.numerator = numerator
    this.render()
  }
  deleteBeat(index: number) {
    if (index === 0) {
      throw new Error('无法删除谱面首个拍号')
    }

    if (this._renderSheet.beats.delete(index)) this.render()
  }
  addBeat(index: number, denominator: number, numerator: number) {
    if (this._renderSheet.beats.has(index)) {
      throw new Error('当前音符位置已存在拍号信息')
    }
    const beat: Beat = {
      notation: index,
      denominator,
      numerator
    }
    this._renderSheet.beats.set(index, beat)

    this.render()
  }

  updateBpm(index: number, bpm: number) {
    if (!this._renderSheet.bpms.has(index)) {
      throw new Error(`音符位置${index}的速度记号不存在`)
    }

    this._renderSheet.bpms.get(index)!.bpm = bpm
    this.render()
  }
  deleteBpm(index: number) {
    if (index === 0) {
      throw new Error('无法删除谱面首个速度记号')
    }

    if (this._renderSheet.bpms.delete(index)) this.render()
  }
  addBpm(index: number, bpm: number) {
    if (this._renderSheet.bpms.has(index)) {
      throw new Error('当前音符位置已存在速度记号')
    }

    const newBpm: Bpm = {
      notation: index,
      bpm
    }
    this._renderSheet.bpms.set(index, newBpm)

    this.render()
  }
}
export { ModeText, NotationType }
export type { Sheet, Options, Notation, Mode, Beat, Bpm, Info, Note, Rest, Tuplet, RenderError }