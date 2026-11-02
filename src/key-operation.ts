import { Jianpu, NotationType, type Note } from "./jianpu/index";
import type { SheetOperation } from './jianpu/operation'

export const bindingKeyboardHandlers = (op: SheetOperation) => {
  let sheetLocked = op.jianpu.locked
  op.jianpu.listen('Locked', (j, e) => {
    sheetLocked = e.locked
  })

  document.addEventListener('keyup', (ev) => {
    if (sheetLocked) return

    ev.preventDefault()
    if (ev.target) {
      const tag = (ev.target as HTMLElement).tagName?.toUpperCase()
      if (tag === 'INPUT' || tag === 'SELECT') return
    }

    const key = ev.key
    if (keyCodeHandlers[key]) {
      keyCodeHandlers[key](op)
    }
  })
}

/**
 * 数字键 改变音高，0设置成休止符
 * 左右键 移动位置，当前已是最后一位时添加新音符并移动到新音符上，新音符属性复制当前音符
 * 上下键 改变八度
 * 加减键 改变时值
 * /和*   改变升降调
 * 点.键  添加/去除附点
 * []\    圆滑线 起始 结束 无
 */
const keyCodeHandlers: { [key: string]: (op: SheetOperation) => void } = {
  ['1']: (op: SheetOperation) => setNotation(op.jianpu, 1),
  ['2']: (op: SheetOperation) => setNotation(op.jianpu, 2),
  ['3']: (op: SheetOperation) => setNotation(op.jianpu, 3),
  ['4']: (op: SheetOperation) => setNotation(op.jianpu, 4),
  ['5']: (op: SheetOperation) => setNotation(op.jianpu, 5),
  ['6']: (op: SheetOperation) => setNotation(op.jianpu, 6),
  ['7']: (op: SheetOperation) => setNotation(op.jianpu, 7),
  ['0']: (op: SheetOperation) => setNotation(op.jianpu, 0),

  ['ArrowLeft']: (op: SheetOperation) => moveSelected(op.jianpu, -1),
  ['ArrowRight']: (op: SheetOperation) => moveSelected(op.jianpu, 1),

  ['ArrowUp']: (op: SheetOperation) => changeoctave(op.jianpu, 1),
  ['ArrowDown']: (op: SheetOperation) => changeoctave(op.jianpu, -1),

  ['+']: (op: SheetOperation) => changeTime(op.jianpu, 1),
  ['-']: (op: SheetOperation) => changeTime(op.jianpu, -1),

  ['/']: (op: SheetOperation) => changeAccidental(op.jianpu, -1),
  ['*']: (op: SheetOperation) => changeAccidental(op.jianpu, 1),

  ['.']: (op: SheetOperation) => toggleDot(op.jianpu),

  ['Delete']: (op: SheetOperation) => deleteNotation(op.jianpu),
  ['Insert']: (op: SheetOperation) => insertNotation(op.jianpu),

  ['[']: (op: SheetOperation) => setSlur(op.jianpu, 1),
  [']']: (op: SheetOperation) => setSlur(op.jianpu, 2),
  ['\\']: (op: SheetOperation) => setSlur(op.jianpu, 0),

  ['c']: (op: SheetOperation) => copy(op),
  ['v']: (op: SheetOperation) => pasteOverride(op),
  ['x']: (op: SheetOperation) => pasteAdd(op),
}

const defaultNote: Note = {
  type: NotationType.Note,
  time: 4,
  pitch: { base: 1, accidental: 0, octave: 0 },
  ornaments: [],
  slur: 0,
  dot: false
}

const setNotation = (jianpu: Jianpu, num: number) => {
  if (num > 7 || num < 0) return
  const notation = jianpu.getNotation(jianpu.selectedIndex)
  if (!notation) return
  
  if (num === 0) {
    jianpu.updateNotation({ type: NotationType.Rest, time: notation.time, dot: false }, jianpu.selectedIndex)
  } else {
    const newNote: Note = {
      ...defaultNote,
      time: notation.time,
      pitch: { base: num as any, octave: 0, accidental: 0 }
    }
    if (notation.type === NotationType.Note) {
      newNote.slur = notation.slur
      newNote.ornaments = notation.ornaments
      newNote.dot = notation.dot
      newNote.pitch.octave = notation.pitch.octave
      newNote.pitch.accidental = notation.pitch.accidental
    }

    jianpu.updateNotation(newNote, jianpu.selectedIndex)
  }
}
const moveSelected = (jianpu: Jianpu, param: 1 | -1) => {
  if (jianpu.selectedIndex < 0) { // 无选中状态,左选中最后一个,右选中第一个
    if (param === 1) jianpu.selectNotation(0)
    else jianpu.selectNotation(jianpu.notationCount - 1)
  } else {
    const index = jianpu.selectedIndex + param
    if (index > jianpu.notationCount - 1) {
      const last = jianpu.getNotation(jianpu.selectedIndex)!
      if (last.type === NotationType.Note) last.slur = 0  // 复制时不复制圆滑线
      jianpu.addNotation(last)
    } else if (index < 0) {
      jianpu.selectNotation(0)
    } else {
      jianpu.selectNotation(index)
    }
  }
}
const changeoctave = (jianpu: Jianpu, param: 1 | -1) => {
  const notation = jianpu.getNotation(jianpu.selectedIndex)
  if (!notation) return

  if (notation.type !== NotationType.Note) return
  notation.pitch.octave += param
  if (notation.pitch.octave > 3) notation.pitch.octave = 3
  else if (notation.pitch.octave < -3) notation.pitch.octave = -3

  jianpu.updateNotation(notation, jianpu.selectedIndex)
}
const changeTime = (jianpu: Jianpu, param: 1 | -1) => {
  const notation = jianpu.getNotation(jianpu.selectedIndex)
  if (!notation) return
  notation.time *= param === 1 ? 2 : 0.5

  if (notation.time > 64) notation.time = 64
  else if (notation.time < 1) notation.time = 1

  jianpu.updateNotation(notation, jianpu.selectedIndex)
}
const changeAccidental = (jianpu: Jianpu, param: 1 | -1) => {
  const notation = jianpu.getNotation(jianpu.selectedIndex)
  if (!notation) return

  if (notation.type !== NotationType.Note) return
  notation.pitch.accidental += param
  if (notation.pitch.accidental > 2) notation.pitch.accidental = 2
  else if (notation.pitch.accidental < -2) notation.pitch.accidental = -2

  jianpu.updateNotation(notation, jianpu.selectedIndex)
}
const toggleDot = (jianpu: Jianpu) => {
  const notation = jianpu.getNotation(jianpu.selectedIndex)
  if (!notation) return

  if (notation.type === NotationType.Tuplet) return
  notation.dot = !notation.dot

  jianpu.updateNotation(notation, jianpu.selectedIndex)
}

const insertNotation = (jianpu: Jianpu) => {
  if (jianpu.selectedIndex >= 0) {
    const current = jianpu.getNotation(jianpu.selectedIndex)!

    if (current.type === NotationType.Note) current.slur = 0  // 复制时不复制圆滑线
    jianpu.addNotation(current, jianpu.selectedIndex)
  } else {
    jianpu.addNotation(defaultNote)
  }
}
const deleteNotation = (jianpu: Jianpu) => {
  jianpu.deleteNotation(jianpu.selectedIndex)
}

const setSlur = (jianpu: Jianpu, param: 0 | 1 | 2) => {
  const notation = jianpu.getNotation(jianpu.selectedIndex)
  if (!notation) return

  if (notation.type !== NotationType.Note) return
  notation.slur = param

  jianpu.updateNotation(notation, jianpu.selectedIndex)
}

const copy = (op: SheetOperation) => {
  const nt = op.jianpu.getNotation(op.jianpu.selectedIndex)
  op.copyNotation(nt)
}
const pasteOverride = (op: SheetOperation) => {
  op.pasteOverride(op.jianpu.selectedIndex)
}
const pasteAdd = (op: SheetOperation) => {
  op.pasteAdd()
}