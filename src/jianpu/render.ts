import type { Sheet, Mode, Beat, Bpm, Notation, Note, Pitch, Rest, Tuplet, Options, Info  } from './declare'
import { NotationType, ModeText } from './declare'

type RenderType = 'text' | 'beat' | 'line' | 'dot' | 'curve' | 'arc' | 'clear'
interface RenderItem {
  type: RenderType
  x: number
  y: number
  notation?: number
}
interface TextItem extends RenderItem {
  type: 'text'
  text: string
  size: number
  align: 'center' | 'left' | 'right'
}
interface BeatItem extends RenderItem {
  type: 'beat'
  numerator: string
  denominator: string
  fontSize: number
  lineWidth: number
}
interface LineItem extends RenderItem {
  type: 'line'
  toX: number
  toY: number
  width: number
}
interface DotItem extends RenderItem {
  type: 'dot'
  size: number
}
interface CurveItem extends RenderItem {
  type: 'curve'
  toX: number
  toY: number
  lineWidth: number
  height: number
}
interface ArcItem extends RenderItem {
  type: 'arc'
  width: number
  r: number
  angle: [number, number]
}
interface ClearItem extends RenderItem {
  type: 'clear'
  width: number
  height: number
}

export interface RenderNotation<T = Notation> {
  notation: T
  renderItems: RenderItem[]
  x1: number
  y1: number
  x2: number
  y2: number
}
export interface RenderSheet extends Omit<Sheet, 'notations'> {
  notations: RenderNotation[]
}
export interface RenderResult {
  width: number
  height: number
  items: RenderItem[]
}

interface RenderContext {
  readonly width: number
  readonly usableWidth: number
  readonly paddingX: number
  readonly paddingY: number
  readonly fontSize: number
  readonly lineHeight: number
  readonly notationMargin: number
  readonly linePadding: number
  readonly lineWidth: number
  readonly dotSize: number
  sectionTime: number         // 拍号变化会改变小节时值
  beatTime: number
}
interface RenderState {
  x: number
  y: number
  slurBegin?: [number, number]
  sectionIndex: number
  notationIndex: number
  modeIndex: number
  bpmIndex: number
  beatIndex: number
  items: RenderItem[]
}
interface SectionState {
  pitches: Pitch[]
  underlines: LineItem[]
}

export const preRenderNotation = (notation: Notation)  => {
  const renderNotation: RenderNotation = {
    notation,
    renderItems: [],
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  }
  return renderNotation
}
export const preRenderSheet = (sheet: Sheet) => {
  const renderSheet: RenderSheet = {
    notations: sheet.notations.map(preRenderNotation),
    info: {
      title: sheet.info.title.trim(),
      subTitle: sheet.info.subTitle.trim(),
      artist: sheet.info.artist.trim(),
      copyright: sheet.info.copyright.trim(),
    },
    modes: sheet.modes.sort((a,b) => a.notation - b.notation),
    beats: sheet.beats.sort((a,b) => a.notation - b.notation),
    bpms: sheet.bpms.sort((a,b) => a.notation - b.notation),
    repeats: sheet.repeats
  }
  return renderSheet
}

const checkSheet = (sheet: RenderSheet)  => {
  const result: { success: boolean, messages: string[] } = { success: true, messages: [] }
  if (sheet.modes.length === 0 || sheet.modes[0].notation !== 0) {
    result.success = false
    result.messages.push('调号信息不存在，或首个调号不在谱的开头处')
  }
  if (sheet.beats.length === 0 || sheet.beats[0].notation !== 0) {
    result.success = false
    result.messages.push('拍号信息不存在，或首个拍号不在谱的开头处')
  }

  return result
}
export const render = (sheet: RenderSheet, options: Options): RenderResult => {
  const context: RenderContext = {
    width: options.width,
    usableWidth: options.width - options.paddingX * 2,
    paddingX: options.paddingX,
    paddingY: options.paddingY,
    fontSize: options.fontsize,
    lineHeight: options.fontsize * 1.5,
    notationMargin: options.fontsize * 0.25,
    linePadding: options.linePadding,
    lineWidth: Math.ceil(options.fontsize * 0.05),
    dotSize: Math.ceil(options.fontsize * 0.08),
    sectionTime: (1024 / sheet.beats[0].denominator) * sheet.beats[0].numerator,
    beatTime: 1024 / sheet.beats[0].denominator
  }
  const state: RenderState = {
    x: context.paddingX,
    y: context.paddingY,
    sectionIndex: 0,
    notationIndex: 0,
    modeIndex: 0,
    bpmIndex: 0,
    beatIndex: 0,
    items: []
  }

  renderInfo(sheet.info, context, state)
  renderSheet(sheet, context, state)

  return { width: context.width, height: state.y + context.paddingY, items: state.items }
}
export const renderInfo = (info: Info, context: RenderContext, state: RenderState) => {
  const title: TextItem = { type: 'text', text: info.title, size: context.fontSize * 2, align: 'center', x: context.paddingX + context.usableWidth / 2, y: state.y }
  state.y += context.fontSize * 2
  state.items.push(title)

  if (info.subTitle) {
    state.y += context.linePadding / 2
    const subTitle: TextItem = { type: 'text', text: info.title, size: context.fontSize, align: 'center', x: context.paddingX + context.usableWidth / 2, y: state.y }
    state.y += context.fontSize
    state.items.push(subTitle)
  }
  state.y += context.linePadding * 2

  if (info.artist) {
    const artist: TextItem = { type: 'text', align: 'right', text: info.artist, x: context.paddingX + context.usableWidth, y: state.y, size: context.fontSize * 0.75 }
    state.items.push(artist)
  }
  if (info.copyright) {
    const copyright: TextItem = { type: 'text', align: 'right', text: info.copyright, x: context.paddingX + context.usableWidth, y: state.y + context.lineHeight, size: context.fontSize * 0.75 }
    state.items.push(copyright)
  }
}
export const renderSheet = (sheet: RenderSheet, context: RenderContext, state: RenderState) => {
  const { modes, beats, bpms } = sheet

  while (state.notationIndex < sheet.notations.length) {
    const rowContext = computeRowContext(sheet, context, state)

    let sectionStartFlag = true
    let sectionTimer = 0
    let beatCount = 0
    let sectionState: SectionState = { pitches: [], underlines: [] }

    for (; state.notationIndex <= rowContext.endIndex; state.notationIndex++) {
      const item = sheet.notations[state.notationIndex]

      let modeRendered = false
      if (modes[state.modeIndex] && modes[state.modeIndex]?.notation === state.notationIndex) {
        renderMode(context, state, modes[state.modeIndex])
        modeRendered = true
      }
      if (beats[state.beatIndex] && beats[state.beatIndex]?.notation === state.notationIndex) {
        if (!sectionStartFlag) console.error('拍号变更必须在小节的起始处!', `notation: ${state.notationIndex}`)
        // 拍号变化了要同时更改小节时值
        context.sectionTime = (1024 / beats[state.beatIndex].denominator) * beats[state.beatIndex].numerator
        context.beatTime = 1024 / beats[state.beatIndex].denominator
        renderBeat(context, state, beats[state.beatIndex], modeRendered)
      }
      if (bpms[state.bpmIndex] && bpms[state.bpmIndex]?.notation === state.notationIndex) {
        renderBpm(context, state, bpms[state.bpmIndex])
      }

      const time = renderNotation(context, state, rowContext, sectionState, item)

      sectionTimer += time
      const currentBeat = Math.floor(sectionTimer / context.beatTime)
      if (currentBeat > beatCount) {
        beatCount = currentBeat
        // 一拍内的时值下滑线可以连在一起
        if (sectionState.underlines.length > 0) state.items.push(...mergeUnderlines(sectionState.underlines, context))
        sectionState.underlines = []
      }

      if (sectionTimer >= context.sectionTime) {
        if (sectionTimer > context.sectionTime) {
          console.log('小节时值错误', `section: ${state.sectionIndex}`)
        }
        renderSectionLine(context, state, rowContext)

        state.sectionIndex++
        sectionStartFlag = true
        sectionState = { pitches: [], underlines: [] }
        sectionTimer = 0
        beatCount = 0
      } else {
        sectionStartFlag = false
      }
    }

    // 时值没有达到一拍,用于编辑时渲染
    if (sectionState.underlines.length > 0) {
      state.items.push(...mergeUnderlines(sectionState.underlines, context))
      sectionState.underlines = []
    }

    state.y += context.linePadding + context.lineHeight
    state.x = context.paddingX
  }

  // return { width: context.width, height: state.y + context.paddingY, items: state.items, notations: state.notations }
}

const computeUnderlineY = (y: number, underlineIndex: number, ctx: RenderContext) => {
  return Math.ceil(y + ctx.notationMargin + ctx.fontSize + underlineIndex * ctx.lineWidth * 2 + ctx.lineWidth)
}
const widthComputer = {
  line: (ctx: RenderContext) => ctx.lineWidth + ctx.fontSize,
  note: (ctx: RenderContext, time: number) => {
    let timeScale = 1
    if (time > 16) timeScale = 0.6
    else if (time > 8) timeScale = 0.666
    else if (time > 4) timeScale = 0.75

    return ctx.fontSize * 1.33 * timeScale
  },
  dot: (ctx: RenderContext) => ctx.fontSize * 0.666,
  ornaments: (ctx: RenderContext, count: number) => ctx.fontSize * 0.25 * (count + 1),
}
interface RowContext {
  readonly sectionCount: number
  readonly endIndex: number
  readonly usedWidth: number
  margin: number
}
const computeRowContext = (sheet: RenderSheet, ctx: RenderContext, state: RenderState): RowContext => {
  let usedWidth = 0
  let itemsCount = 0
  let sectionCount = 0
  let timer = 0

  let rowContext: RowContext = {
    sectionCount: 0,
    endIndex: 0,
    usedWidth: 0,
    margin: 0
  }

  for(let i = state.notationIndex; i < sheet.notations.length; i++) {
    const notation = sheet.notations[i].notation
    let time = 1024 / notation.time

    if (notation.type === NotationType.Note) {  // 音符
      const noteWidth = widthComputer.note(ctx, notation.time)
      if (notation.time === 1) {
        usedWidth += noteWidth * 4
        itemsCount += 4
      } else if (notation.time === 2) {
        if (notation.dot) {
          usedWidth += noteWidth * 3
          itemsCount += 3
        } else {
          usedWidth += noteWidth * 2
          itemsCount += 2
        }
      } else {
        usedWidth += noteWidth
        itemsCount += 1
        if (notation.dot) {
          usedWidth += widthComputer.dot(ctx)
          time = time * 1.5
          itemsCount += 1
        }
      }


      if (notation.ornaments.length > 0) usedWidth += widthComputer.ornaments(ctx, notation.ornaments.length)
    } else if (notation.type === NotationType.Rest) { // 休止符
      usedWidth += widthComputer.note(ctx, notation.time)
      itemsCount += 1
    } else if (notation.type === NotationType.Tuplet) { // n连音
      usedWidth += widthComputer.note(ctx, notation.time * 2) * notation.pitches.length
      itemsCount += notation.pitches.length
    }

    if (usedWidth > ctx.usableWidth) {
      return rowContext
    }

    timer += time
    if (timer >= ctx.sectionTime) {
      timer = 0
      sectionCount += 1
      itemsCount += 1

      const margin = usedWidth >= ctx.usableWidth ? 0 : ((ctx.usableWidth - usedWidth) / (itemsCount - 1))
      rowContext = {
        endIndex: i,
        sectionCount: sectionCount,
        usedWidth: usedWidth,
        margin
      }

      usedWidth += widthComputer.line(ctx)
    }
  }

  // 到结尾没跳出,说明不满一行
  rowContext = {
    endIndex: sheet.notations.length - 1,
    sectionCount,
    usedWidth,
    margin: 0
  }
  return rowContext
}

const renderMode = (ctx: RenderContext, state: RenderState, mode: Mode) => {
  const text = '1 = ' + ModeText[mode.value]

  const item: TextItem = { type: 'text', align: 'left', text, x: state.x, y: state.y, size: ctx.fontSize * 0.75 }
  state.items.push(item)
  state.y += ctx.lineHeight
  state.modeIndex++
}
const renderBeat = (ctx: RenderContext, state: RenderState, beat: Beat, afterMode: boolean) => {
  let x = 0
  let y = 0
  if (afterMode) { // 当前小节已有调号信息则渲染在调号后面
    x = state.x + ctx.fontSize * 3
    y = state.y - ctx.lineHeight
  }
  else {
    x = state.x
    y = state.y
    state.y += ctx.lineHeight
  }

  const item: BeatItem = { type: 'beat', x, y, numerator: beat.numerator + '', denominator: beat.denominator + '', fontSize: ctx.fontSize * 0.75, lineWidth: ctx.lineWidth }
  state.items.push(item)
  state.beatIndex++
}
const renderBpm = (ctx: RenderContext, state: RenderState, bpm: Bpm) => {
  const text = '𝅘𝅥 = ' + bpm.bpm
  const item: TextItem = { type: 'text', align: 'left', text, x: state.x, y: state.y, size: ctx.fontSize * 0.75 }
  state.items.push(item)
  state.y += ctx.lineHeight
  state.bpmIndex++
}
const renderSectionLine = (ctx: RenderContext, state: RenderState, rowContext: RowContext) => {
  const itemWidth = widthComputer.line(ctx) / 2
  state.x += itemWidth + rowContext.margin / 2

  const item: LineItem = {
    type: 'line',
    x: state.x,
    y: state.y,
    toX: state.x,
    toY: state.y + ctx.lineHeight,
    width: ctx.lineWidth
  }
  const text: TextItem = {
    type: 'text',
    align: 'center',
    text: (state.sectionIndex + 2) + '',
    x: state.x,
    y: state.y - ctx.fontSize * 0.666,
    size: ctx.fontSize * 0.4,
  }

  state.items.push(item, text)
  state.x += itemWidth + rowContext.margin / 2
}

const renderNotation = (ctx: RenderContext, state: RenderState, rowContext: RowContext, sectionState: SectionState, item: RenderNotation) => {
  const notation = item.notation
  let time =  1024 / notation.time

  if (notation.type === NotationType.Note) {
    renderNote(ctx, state, rowContext, sectionState, item as RenderNotation<Note>)
    sectionState.pitches.unshift(notation.pitch)
    if (notation.dot) time = time * 1.5
  } else if (notation.type === NotationType.Rest) {
    renderRest(ctx, state, rowContext, sectionState, item as RenderNotation<Rest>)
  } else {
    renderTuplet(ctx, state, rowContext, sectionState, item as RenderNotation<Tuplet>)
  }

  return time
}
const renderNote = (ctx: RenderContext, state: RenderState, rowContext: RowContext, sectionState: SectionState, item: RenderNotation<Note>) => {
  const note = item.notation

  const noteWidth = widthComputer.note(ctx, note.time) / 2
  state.x += noteWidth + rowContext.margin / 2

  // 装饰音
  if (note.ornaments.length > 0) {
    let i = 0
    for(const o of note.ornaments) {
      const items = buildPitch(o, 0.5, state.x + i * ctx.fontSize * 0.25, state.y, { pitches: [], underlines: [] }, ctx, 0)
      state.items.push(...items)
      i++
    }

    const arc: ArcItem = { 
      type: 'arc', 
      x: state.x + ctx.fontSize * (0.25 * (note.ornaments.length - 1) + 0.5),
      y: state.y + ctx.fontSize * 0.5, 
      r: ctx.fontSize / 3, 
      angle: [Math.PI * 0.5, Math.PI], 
      width: ctx.lineWidth 
    }
    state.items.push(arc)

    state.x += widthComputer.ornaments(ctx, note.ornaments.length)
  }

  // 时值下划线
  const underLineCount = addUnderline(ctx, state, sectionState, note)

  // 音符本身
  const pitchItems = buildPitch(note.pitch, 1, state.x, state.y + ctx.notationMargin, sectionState, ctx, underLineCount * (ctx.lineWidth + 1))
  state.items.push(...pitchItems)
  sectionState.pitches.unshift(note.pitch)

  item.renderItems = [...pitchItems]
  item.x1 = state.x - noteWidth,
  item.y1 = state.y + ctx.notationMargin, 
  item.x2 = state.x + noteWidth,
  item.y2 = state.y + ctx.notationMargin + ctx.fontSize 

  // 圆滑线
  if (note.slur === 1) {
    if (state.slurBegin) console.error('已存在一个圆滑线起始位置！')

    const yTop = note.pitch.octave > 0 ? note.pitch.octave : 0
    state.slurBegin = [state.x, state.y - 0.25 * ctx.fontSize * yTop]
  } else if (note.slur === 2) {
    if (!state.slurBegin) console.error('圆滑线起始位置不存在！')
    else {
      const yTop = note.pitch.octave > 0 ? note.pitch.octave : 0
      let y = state.y - 0.25 * ctx.fontSize * yTop
      if (state.slurBegin[1] < y) y = state.slurBegin[1]

      const slur: CurveItem = {
        type: 'curve',
        x: state.slurBegin[0], 
        y: y,
        toX: state.x, 
        toY: y,
        lineWidth: ctx.lineWidth,
        height: 0.5 * ctx.lineHeight
      }
      state.items.push(slur)
      state.slurBegin = undefined
    }
  }

  state.x += noteWidth + rowContext.margin / 2

  // 附点
  if (note.dot && note.time >= 4) {
    state.x += rowContext.margin / 2
    const dot: DotItem = { type: 'dot', x: state.x + ctx.fontSize * 0.25 - ctx.dotSize / 2, y: state.y + ctx.fontSize * 0.75, size: ctx.dotSize }
    state.items.push(dot)
    state.x += widthComputer.dot(ctx) + rowContext.margin / 2
  }

  // 全音符和二分音符延音线
  if (note.time < 4) {
    const count = note.time === 1 ? 3 : (note.dot ? 2 : 1)
    for(let i = 0; i < count; i++) {
      state.x += rowContext.margin / 2
      const line: LineItem = { 
        type: 'line', 
        x: state.x + ctx.fontSize * 0.25, 
        y: state.y + ctx.fontSize * 0.7, 
        toX: state.x + ctx.fontSize * 0.75, 
        toY: state.y + ctx.fontSize * 0.7, 
        width: ctx.lineWidth * 2 
      }
      state.items.push(line)
      state.x += widthComputer.note(ctx, 1) + rowContext.margin / 2
    }
  }
}
const buildPitch = (pitch: Pitch, scale: number, x: number, y: number, sectionState: SectionState, ctx: RenderContext, bottomPadding: number) => {
  const accidentals = ['𝄫', '♭', '', '♯', '𝄪', '♮']
  const lastSamePitch = sectionState.pitches.find(v => v.base === pitch.base && v.octave === pitch.octave)
  const size = ctx.fontSize * scale

  let accidentalText = ''
  if (lastSamePitch) {
    if (lastSamePitch.accidental !== pitch.accidental) {
      if (lastSamePitch.accidental !== 0) {
        if (pitch.accidental === 0) {
          accidentalText = accidentals[5]
        } else {
          accidentalText = accidentals[pitch.accidental + 2]
        }
      } else {
        accidentalText = accidentals[pitch.accidental + 2]
      }
    }
  } else {
    accidentalText = accidentals[pitch.accidental + 2]
  }

  const items: RenderItem[] = []
  const text: TextItem = { type: 'text', text: pitch.base + '', size, x, y, align: 'center' }
  items.push(text)

  if (accidentalText !== '') {
    const accidental: TextItem = { type: 'text', text: accidentalText, align: 'right', size: size * 0.75, x: x - size * 0.25, y: y - size * 0.25 }
    items.push(accidental)
  }

  const dotCount = Math.abs(pitch.octave)
  const dotDir = pitch.octave > 0 ? -1 : 1
  if (dotDir === 1) y = y + (size + bottomPadding) * scale
  for (let i = 0; i < dotCount; i++) {
    const dot: DotItem = { type: 'dot', x: x, y: y + (0.2 + i * 0.25) * dotDir * size, size: ctx.dotSize * scale }
    items.push(dot)
  }

  return items
}
const renderRest = (ctx: RenderContext, state: RenderState, rowContext: RowContext, sectionState: SectionState, item: RenderNotation<Rest>) => {
  const noteWidth = widthComputer.note(ctx, item.notation.time) / 2

  state.x += noteWidth + rowContext.margin / 2
  const text: TextItem = { type: 'text', text: '0', align: 'center', size: ctx.fontSize, x: state.x, y: state.y + ctx.notationMargin }
  state.items.push(text)

  item.renderItems = [text]
  item.x1 = state.x - widthComputer.note(ctx, item.notation.time) / 2,
  item.y1 = state.y + ctx.notationMargin, 
  item.x2 = state.x + widthComputer.note(ctx, item.notation.time) / 2, 
  item.y2 = state.y + ctx.notationMargin + ctx.fontSize 

  // 时值下划线
  addUnderline(ctx, state, sectionState, item.notation)
  state.x += noteWidth + rowContext.margin / 2
}
const renderTuplet = (ctx: RenderContext, state: RenderState, rowContext: RowContext, sectionState: SectionState, item: RenderNotation<Tuplet>) => {
  const tuplet = item.notation
  const itemWidth = widthComputer.note(ctx, tuplet.time * 2) / 2
  let localX = state.x + itemWidth + rowContext.margin / 2

  let lineCount = 0
  const lineStart = localX - itemWidth / 2
  if (tuplet.time > 2) {
    const idx = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096].indexOf(tuplet.time)
    lineCount = idx + 1
  }

  item.renderItems = []
  item.x1 = localX - itemWidth
  item.y1 = state.y + ctx.notationMargin
  for (let i = 0; i < tuplet.pitches.length; i++) {
    const pitch = tuplet.pitches[i]
    const pitchItems = buildPitch(pitch, 1, localX, state.y + ctx.notationMargin, sectionState, ctx, lineCount * (ctx.lineWidth + 1))
    state.items.push(...pitchItems)
    item.renderItems.push(...pitchItems)
    sectionState.pitches.unshift(pitch)
    if (i < tuplet.pitches.length - 1) localX += itemWidth * 2 + rowContext.margin
  }
  const lineEnd = localX + itemWidth / 2
  localX += itemWidth + rowContext.margin / 2
  item.x2 = localX
  item.y2 = state.y + ctx.notationMargin + ctx.fontSize 

  for(let i = 0; i < lineCount; i++) {
    const y = computeUnderlineY(state.y, i, ctx)

    const line: LineItem = { 
      type: 'line', 
      x: lineStart,
      y: y, 
      toX: lineEnd,
      toY: y, 
      width: ctx.lineWidth 
    }
    state.items.push(line)
  }

  const maxOctave = Math.max(...tuplet.pitches.map(p => p.octave))
  const yTop = maxOctave > 0 ? maxOctave : 0
  const y = state.y - 0.25 * ctx.fontSize * yTop
  const slur: CurveItem = {
    type: 'curve',
    x: state.x, 
    y: y,
    toX: localX,
    toY: y,
    lineWidth: ctx.lineWidth,
    height: 0.5 * ctx.lineHeight
  }
  state.items.push(slur)

  const clear: ClearItem = {
    type: 'clear',
    x: (state.x + localX - ctx.fontSize * 0.5) / 2,
    y: y - 0.75 * ctx.fontSize,
    width: 0.5 * ctx.fontSize,
    height: 0.5 * ctx.fontSize
  }
  state.items.push(clear)

  const numText: TextItem = {
    type: 'text',
    text: tuplet.pitches.length + '',
    x: (state.x + localX) / 2,
    align: 'center',
    y: y - 0.66 * ctx.fontSize,
    size: 0.5 * ctx.fontSize
  }
  state.items.push(numText)

  state.x = localX
}
const addUnderline = (ctx: RenderContext, state: RenderState, sectionState: SectionState, notation: Notation) => {
  let lineCount = 0
  if (notation.time > 4) {
    const idx = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096].indexOf(notation.time)
    if (idx >= 0) {
      lineCount = idx + 1
      for(let i = 0; i < lineCount; i++) {
        const y = computeUnderlineY(state.y, i, ctx)

        const line: LineItem = { 
          type: 'line', 
          x: state.x - widthComputer.note(ctx, notation.time ) / 4,
          y: y, 
          toX: state.x + widthComputer.note(ctx, notation.time ) / 4,
          toY: y, 
          width: ctx.lineWidth,
          notation: state.notationIndex
        }
        sectionState.underlines.push(line)
      }
    }
  }

  return lineCount
}
const mergeUnderlines = (underlines: LineItem[], ctx: RenderContext) => {
  if (underlines.length <= 1) return underlines

  const groups: { y: number, items: LineItem[] }[] = []
  for(const l of underlines) {
    let g = groups.find(n => n.y === l.y)
    if (!g) {
      g = { y: l.y, items: [] }
      groups.push(g)
    }
    g.items.push(l)
  }

  const result: LineItem[] = []
  for(const g of groups) {
    const sorted = g.items.sort((a,b) => a.notation! - b.notation!)
    let b = 0
    let e = 0
    let i = 0

    for(const l of sorted) {
      if (b === 0) {
        b = l.x
        e = l.toX
        i = l.notation!
      } else {
        if (l.notation! - i === 1) {
          e = l.toX
          i = l.notation!
        } else {
          result.push({ type: 'line', x: b, y: g.y, toX: e, toY: g.y, width: ctx.lineWidth })
          b = l.x
          e = l.toX
          i = l.notation!
        }
      }
    }

    result.push({ type: 'line', x: b, y: g.y, toX: e, toY: g.y, width: ctx.lineWidth })
  }

  return result
}

export const paint = (ctx: CanvasRenderingContext2D, data: RenderResult, style?: string) => {
  ctx.fillStyle = style ?? '#333'
  ctx.strokeStyle = style ?? '#333'

  for (const item of data.items) {
    switch (item.type) {
      case 'text': paintText(ctx, item as TextItem); break;
      case 'beat': paintBeat(ctx, item as BeatItem); break;
      case 'line': paintLine(ctx, item as LineItem); break;
      case 'curve': paintCurve(ctx, item as CurveItem); break;
      case 'dot': paintDot(ctx, item as DotItem); break;
      case 'arc': paintArc(ctx, item as ArcItem); break;
      case 'clear': paintClear(ctx, item as ClearItem); break;
      default: break;
    }
  }
}
export const paintItem = (ctx: CanvasRenderingContext2D, item: RenderItem, style?: string) => {
  ctx.fillStyle = style ?? '#333'
  ctx.strokeStyle = style ?? '#333'

  switch (item.type) {
    case 'text': paintText(ctx, item as TextItem); break;
    case 'beat': paintBeat(ctx, item as BeatItem); break;
    case 'line': paintLine(ctx, item as LineItem); break;
    case 'curve': paintCurve(ctx, item as CurveItem); break;
    case 'dot': paintDot(ctx, item as DotItem); break;
    case 'arc': paintArc(ctx, item as ArcItem); break;
    case 'clear': paintClear(ctx, item as ClearItem); break;
    default: break;
  }
}
export const eraseNotation = (ctx: CanvasRenderingContext2D, notation: RenderNotation) => {
  ctx.clearRect(notation.x1, notation.y1, notation.x2 - notation.x1, notation.y2 - notation.y1)
}

const paintText = (ctx: CanvasRenderingContext2D, item: TextItem) => {
  ctx.font = `${item.size}px arial`
  ctx.textBaseline = 'top'
  ctx.textAlign = item.align
  ctx.fillText(item.text, item.x, item.y)
}
const paintBeat = (ctx: CanvasRenderingContext2D, item: BeatItem) => {
  ctx.font = `${item.fontSize}px arial`
  ctx.textBaseline = 'top'

  ctx.fillText(item.numerator, item.x, item.y - item.fontSize * 0.6)

  ctx.beginPath()
  ctx.moveTo(item.x - item.fontSize * 0.25, item.y + item.fontSize * 0.5)
  ctx.lineTo(item.x + item.fontSize * 0.75, item.y + item.fontSize * 0.5)
  ctx.lineWidth = item.lineWidth
  ctx.stroke()

  ctx.fillText(item.denominator, item.x, item.y + item.fontSize * 0.6)
}
const paintLine = (ctx: CanvasRenderingContext2D, item: LineItem) => {
  ctx.beginPath()
  ctx.moveTo(item.x, item.y)
  ctx.lineTo(item.toX, item.toY)
  ctx.lineWidth = item.width
  ctx.stroke()
}
const paintCurve = (ctx: CanvasRenderingContext2D, item: CurveItem) => {
  const w = (item.toX - item.x) / 3
  const h = item.height * 0.75

  ctx.lineWidth = item.lineWidth
  ctx.beginPath()
  ctx.moveTo(item.x, item.y)
  ctx.bezierCurveTo(item.x + w, item.y - h, item.x + w * 2, item.y - h, item.toX, item.toY)
  ctx.stroke()
}
const paintDot = (ctx: CanvasRenderingContext2D, item: DotItem) => {
  ctx.beginPath()
  ctx.moveTo(item.x, item.y)
  ctx.arc(item.x, item.y, item.size, 0, 2 * Math.PI)
  ctx.fill()
}
const paintArc = (ctx: CanvasRenderingContext2D, item: ArcItem) => {
  ctx.lineWidth = item.width

  ctx.beginPath()
  ctx.arc(item.x, item.y, item.r, item.angle[0], item.angle[1])
  ctx.stroke()
}
const paintClear = (ctx: CanvasRenderingContext2D, item: ClearItem) => {
  ctx.clearRect(item.x, item.y, item.width, item.height)
}
