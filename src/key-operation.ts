import { Jianpu, NotationType, type Note } from "./jianpu/index";

export const bindingKeyboardHandlers = (jianpu: Jianpu) => {
  document.addEventListener('keyup', (ev) => {
    if (ev.target) {
      const tag = (ev.target as HTMLElement).tagName?.toUpperCase()
      if (tag === 'INPUT' || tag === 'SELECT') return
    }

    const key = ev.key
    if (keyCodeHandlers[key]) {
      keyCodeHandlers[key](jianpu)
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
const keyCodeHandlers: { [key: string]: (jianpu: Jianpu) => void } = {
  ['1']: (jianpu: Jianpu) => setNotation(jianpu, 1),
  ['2']: (jianpu: Jianpu) => setNotation(jianpu, 2),
  ['3']: (jianpu: Jianpu) => setNotation(jianpu, 3),
  ['4']: (jianpu: Jianpu) => setNotation(jianpu, 4),
  ['5']: (jianpu: Jianpu) => setNotation(jianpu, 5),
  ['6']: (jianpu: Jianpu) => setNotation(jianpu, 6),
  ['7']: (jianpu: Jianpu) => setNotation(jianpu, 7),
  ['0']: (jianpu: Jianpu) => setNotation(jianpu, 0),

  ['ArrowLeft']: (jianpu: Jianpu) => moveSelected(jianpu, -1),
  ['ArrowRight']: (jianpu: Jianpu) => moveSelected(jianpu, 1),

  ['ArrowUp']: (jianpu: Jianpu) => changeoctave(jianpu, 1),
  ['ArrowDown']: (jianpu: Jianpu) => changeoctave(jianpu, -1),

  ['+']: (jianpu: Jianpu) => changeTime(jianpu, 1),
  ['-']: (jianpu: Jianpu) => changeTime(jianpu, -1),

  ['/']: (jianpu: Jianpu) => changeAccidental(jianpu, -1),
  ['*']: (jianpu: Jianpu) => changeAccidental(jianpu, 1),

  ['.']: (jianpu: Jianpu) => toggleDot(jianpu),

  ['Delete']: (jianpu: Jianpu) => deleteNotation(jianpu),
  ['Insert']: (jianpu: Jianpu) => insertNotation(jianpu),

  ['[']: (jianpu: Jianpu) => setSlur(jianpu, 1),
  [']']: (jianpu: Jianpu) => setSlur(jianpu, 2),
  ['\\']: (jianpu: Jianpu) => setSlur(jianpu, 0)
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

  if (notation.type !== NotationType.Note) return
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