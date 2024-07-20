import { Jianpu, Mode, Beat, Bpm, Notation, NotationType, Note, Pitch, Rest, Tuplet, Options } from './declares'

type RenderType = 'text' | 'beat' | 'line' | 'dot' | 'curve' | 'arc' | 'clear'
interface RenderItem {
  type: RenderType
  x: number
  y: number
  notation?: number
}
interface TextItem extends RenderItem {
  type: 'text',
  text: string,
  size: number
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

export interface RenderResult {
  width: number
  height: number
  items: RenderItem[]
  notations: RenderedNotation[]
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
  notations: RenderedNotation[]
}
interface SectionState {
  pitches: Pitch[]
  underlines: LineItem[]
}
export interface RenderedNotation {
  notation: Notation
  notationIndex: number
  renderItems: RenderItem[]
  x1: number
  y1: number
  x2: number
  y2: number
}

export const render = (sheet: Jianpu, options: Options): RenderResult => {
  const modes = sheet.modes.sort((a,b) => a.notation - b.notation)
  const bpms = sheet.bpms.sort((a,b) => a.notation - b.notation)
  const beats = sheet.beats.sort((a,b) => a.notation - b.notation)

  const context: RenderContext = {
    width: options.width,
    usableWidth: options.width - options.padding[1] * 2,
    paddingX: options.padding[1],
    paddingY: options.padding[0],
    fontSize: options.fontsize,
    lineHeight: options.fontsize * 1.5,
    notationMargin: options.fontsize * 0.25,
    linePadding: options.linePadding,
    lineWidth: Math.ceil(options.fontsize * 0.05),
    dotSize: Math.ceil(options.fontsize * 0.08),
    sectionTime: (1024 / beats[0].denominator) * beats[0].numerator,  // 一个全音符时值为1024
    beatTime: 1024 / beats[0].denominator
  }
  const state: RenderState = {
    x: context.paddingX,
    y: context.paddingY,
    sectionIndex: 0,
    notationIndex: 0,
    modeIndex: 0,
    bpmIndex: 0,
    beatIndex: 0,
    items: [],
    notations: []
  }

  while (state.notationIndex < sheet.notations.length) {
    const rowContext = computeRowContext(sheet, context, state)

    let sectionStartFlag = true
    let sectionTimer = 0
    let beatCount = 0
    let sectionState: SectionState = { pitches: [], underlines: [] }

    for (; state.notationIndex <= rowContext.endIndex; state.notationIndex++) {
      const notation = sheet.notations[state.notationIndex]
      let time =  1024 / notation.time

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

      if (notation.type === NotationType.Note) {
        renderNote(context, state, rowContext, sectionState, notation)
        sectionState.pitches.unshift(notation.pitch)
        if (notation.dot) time = time * 1.5
      } else if (notation.type === NotationType.Rest) {
        renderRest(context, state, rowContext, sectionState, notation)
      } else {
        renderTuplet(context, state, rowContext, sectionState, notation)
      }

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

    state.y += context.linePadding + context.lineHeight
    state.x = context.paddingX
  }

  return { width: context.width, height: state.y + context.paddingY, items: state.items, notations: state.notations }
}
const widthComputer = {
  line: (ctx: RenderContext) => ctx.lineWidth + ctx.fontSize,
  note: (ctx: RenderContext) => ctx.fontSize * 1.33,
  dot: (ctx: RenderContext) => ctx.fontSize,
  ornaments: (ctx: RenderContext, count: number) => ctx.fontSize * 0.25 * (count + 1),
}


interface RowContext {
  readonly sectionCount: number
  readonly endIndex: number
  readonly usedWidth: number
   margin: number
}
const computeRowContext = (sheet: Jianpu, ctx: RenderContext, state: RenderState): RowContext => {
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
    const notation = sheet.notations[i]
    let time = 1024 / notation.time

    if (notation.type === NotationType.Note) {  // 音符
      const noteWidth = widthComputer.note(ctx)
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
      usedWidth += widthComputer.note(ctx)
      itemsCount += 1
    } else if (notation.type === NotationType.Tuplet) { // n连音
      usedWidth += widthComputer.note(ctx) * 0.75 * notation.pitches.length + widthComputer.note(ctx) * 0.25
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
  const modeText = ['A', '♭B', 'B', 'C', '♯C', 'D', '♯D', 'E', 'F', '♯F', 'G', '♯G']
  const text = '1 = ' + modeText[mode.value]

  const item: TextItem = { type: 'text', text, x: state.x, y: state.y, size: ctx.fontSize }
  state.items.push(item)
  state.y += ctx.lineHeight
  state.modeIndex++
}
const renderBeat = (ctx: RenderContext, state: RenderState, beat: Beat, afterMode: boolean) => {
  let x = 0
  let y = 0
  if (afterMode) { // 当前小节已有调号信息则渲染在调号后面
    x = state.x + ctx.fontSize * 4
    y = state.y - ctx.lineHeight
  }
  else {
    x = state.x
    y = state.y
    state.y += ctx.lineHeight
  }

  const item: BeatItem = { type: 'beat', x, y, numerator: beat.numerator + '', denominator: beat.denominator + '', fontSize: ctx.fontSize, lineWidth: ctx.lineWidth }
  state.items.push(item)
  state.beatIndex++
}
const renderBpm = (ctx: RenderContext, state: RenderState, bpm: Bpm) => {
  const text = '𝅘𝅥 = ' + bpm.bpm
  const item: TextItem = { type: 'text', text, x: state.x, y: state.y, size: ctx.fontSize }
  state.items.push(item)
  state.y += ctx.lineHeight
  state.bpmIndex++
}
const renderSectionLine = (ctx: RenderContext, state: RenderState, rowContext: RowContext) => {
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
    text: (state.sectionIndex + 2) + '',
    x: state.x - ctx.fontSize * 0.1,
    y: state.y - ctx.fontSize * 0.666,
    size: ctx.fontSize * 0.4,
  }

  state.items.push(item, text)
  state.x += widthComputer.line(ctx) + rowContext.margin
}

const renderNote = (ctx: RenderContext, state: RenderState, rowContext: RowContext, sectionState: SectionState, note: Note) => {
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
  const rendered: RenderedNotation = { 
    notation: note, 
    notationIndex: state.notationIndex, 
    renderItems: [...pitchItems], 
    x1: state.x, 
    y1: state.y + ctx.notationMargin, 
    x2: state.x + widthComputer.note(ctx), 
    y2: state.y + ctx.lineHeight 
  }
  state.notations.push(rendered)

  // 圆滑线
  if (note.slur === 1) {
    if (state.slurBegin) console.error('已存在一个圆滑线起始位置！')

    const yTop = note.pitch.octave > 0 ? note.pitch.octave : 0
    state.slurBegin = [state.x + 0.25 * ctx.fontSize, state.y - 0.25 * ctx.fontSize * yTop]
  } else if (note.slur === 2) {
    if (!state.slurBegin) console.error('圆滑线起始位置不存在！')
    else {
      const yTop = note.pitch.octave > 0 ? note.pitch.octave : 0
      let y = state.y - 0.25 * ctx.fontSize * yTop
      if (y < state.slurBegin[1]) y = state.slurBegin[1]

      const x = state.x + 0.25 * ctx.fontSize

      const slur: CurveItem = {
        type: 'curve',
        x: state.slurBegin[0], 
        y: y,
        toX: x, 
        toY: y,
        lineWidth: ctx.lineWidth,
        height: 0.5 * ctx.lineHeight
      }
      state.items.push(slur)
      state.slurBegin = undefined
    }
  }

  state.x += widthComputer.note(ctx) + rowContext.margin

  // 附点
  if (note.dot && note.time >= 4) {
    const dot: DotItem = { type: 'dot', x: state.x - ctx.fontSize * 0.25, y: state.y + ctx.fontSize * 0.75, size: ctx.dotSize }
    state.items.push(dot)
    state.x += widthComputer.dot(ctx) + rowContext.margin
  }

  // 全音符和二分音符延音线
  if (note.time < 4) {
    const count = note.time === 1 ? 3 : (note.dot ? 2 : 1)
    for(let i = 0; i < count; i++) {
      const line: LineItem = { type: 'line', x: state.x, y: state.y + ctx.fontSize * 0.75, toX: state.x + ctx.fontSize * 0.5, toY: state.y + ctx.fontSize * 0.75, width: ctx.lineWidth }
      state.items.push(line)
      state.x += widthComputer.note(ctx) + rowContext.margin
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
  const text: TextItem = { type: 'text', text: pitch.base + '', size, x, y }
  items.push(text)

  if (accidentalText !== '') {
    const accidental: TextItem = { type: 'text', text: accidentalText, size: size * 0.75, x: x - size * 0.33, y: y - size * 0.25 }
    items.push(accidental)
  }

  const dotCount = Math.abs(pitch.octave)
  const dotDir = pitch.octave > 0 ? -1 : 1
  if (dotDir === 1) y = y + (size + bottomPadding) * scale
  for (let i = 0; i < dotCount; i++) {
    const dot: DotItem = { type: 'dot', x: x + size * 0.25, y: y + (0.2 + i * 0.25) * dotDir * size, size: ctx.dotSize * scale }
    items.push(dot)
  }

  return items
}
const renderRest = (ctx: RenderContext, state: RenderState, rowContext: RowContext, sectionState: SectionState, note: Rest) => {
  const text: TextItem = { type: 'text', text: '0', size: ctx.fontSize, x: state.x, y: state.y + ctx.notationMargin }
  state.items.push(text)
  const rendered: RenderedNotation = { 
    notation: note, 
    notationIndex: state.notationIndex, 
    renderItems: [text], 
    x1: state.x, 
    y1: state.y + ctx.notationMargin, 
    x2: state.x + widthComputer.note(ctx), 
    y2: state.y + ctx.lineHeight 
  }
  state.notations.push(rendered)

  // 时值下划线
  addUnderline(ctx, state, sectionState, note)
  state.x += widthComputer.note(ctx) + rowContext.margin
}
const renderTuplet = (ctx: RenderContext, state: RenderState, rowContext: RowContext, sectionState: SectionState, tuplet: Tuplet) => {
  let localX = state.x

  let lineCount = 0
  if (tuplet.time > 2) {
    const idx = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096].indexOf(tuplet.time)
    lineCount = idx + 1
  }

  const rendered: RenderedNotation = { 
    notation: tuplet, 
    notationIndex: state.notationIndex, 
    renderItems: [], 
    x1: state.x, 
    y1: state.y + ctx.notationMargin, 
    x2: 0, 
    y2: state.y + ctx.lineHeight 
  }
  for(const pitch of tuplet.pitches) {
    const pitchItems = buildPitch(pitch, 1, localX, state.y + ctx.notationMargin, sectionState, ctx, lineCount * (ctx.lineWidth + 1))
    state.items.push(...pitchItems)
    rendered.renderItems.push(...pitchItems)
    sectionState.pitches.unshift(pitch)
    localX += widthComputer.note(ctx) * 0.75 + rowContext.margin
  }
  rendered.x2 = localX
  state.notations.push(rendered)

  for(let i = 0; i < lineCount; i++) {
    const y = Math.ceil(state.y + ctx.fontSize * 1.25 + i * ctx.lineWidth * 2)

    const line: LineItem = { 
      type: 'line', 
      x: state.x - ctx.fontSize * 0.2,
      y: y, 
      toX: localX - ctx.fontSize * 0.2,
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
    x: state.x + 0.25 * ctx.fontSize, 
    y: y,
    toX: localX - 0.75 * ctx.fontSize, 
    toY: y,
    lineWidth: ctx.lineWidth,
    height: 0.5 * ctx.lineHeight
  }
  state.items.push(slur)

  const clear: ClearItem = {
    type: 'clear',
    x: (state.x + localX - ctx.fontSize) / 2,
    y: y - 0.75 * ctx.fontSize,
    width: 0.5 * ctx.fontSize,
    height: 0.5 * ctx.fontSize
  }
  state.items.push(clear)

  const numText: TextItem = {
    type: 'text',
    text: tuplet.pitches.length + '',
    x: (state.x + localX - 0.75 * ctx.fontSize) / 2,
    y: y - 0.66 * ctx.fontSize,
    size: 0.5 * ctx.fontSize
  }
  state.items.push(numText)

  state.x = localX + widthComputer.note(ctx) * 0.25
}
const addUnderline = (ctx: RenderContext, state: RenderState, sectionState: SectionState, notation: Notation) => {
  let lineCount = 0
  if (notation.time > 4) {
    const idx = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096].indexOf(notation.time)
    if (idx >= 0) {
      lineCount = idx + 1
      for(let i = 0; i < lineCount; i++) {
        const y = Math.ceil(state.y + ctx.fontSize * 1.25 + i * ctx.lineWidth * 2)

        const line: LineItem = { 
          type: 'line', 
          x: state.x - ctx.fontSize * 0.2, 
          y: y, 
          toX: state.x + ctx.fontSize * 0.7, 
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

export const paint = (ctx: CanvasRenderingContext2D, options: RenderResult, style?: string) => {
  ctx.fillStyle = style ?? '#333'
  ctx.strokeStyle = style ?? '#333'

  for (const item of options.items) {
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

const paintText = (ctx: CanvasRenderingContext2D, item: TextItem) => {
  ctx.font = `${item.size}px arial`
  ctx.textBaseline = 'top'
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
