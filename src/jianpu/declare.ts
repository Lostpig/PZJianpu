
export interface Sheet {
  info: Info
  notations: Notation[]
  repeats: Repeat[]   // TODO
  bpms: Bpm[]
  beats: Beat[]
  modes: Mode[]
}

// 乐谱信息
export interface Info {
  title: string
  subTitle: string
  artist: string
  copyright: string
}

// 反复
export interface Repeat {
  from: number   // 起始小节
  to: number     // 结束小节
  count: number  // 重复次数
}

// 拍号
export interface Beat {
  notation: number    // 生效起始音符  拍号的生效起始音符必须为小节起始音符
  numerator: number   // 分子
  denominator: number // 分母
}

// 速度
export interface Bpm {
  notation: number // 生效起始音符
  bpm: number
}
// 调号
//                      A  #A   B   C  #C   D  #D   E   F  #F   G    #G
export type ModeValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
export const ModeText = ['A', '♭B', 'B', 'C', '♯C', 'D', '♯D', 'E', 'F', '♯F', 'G', '♯G']
export interface Mode {
  notation: number     // 生效起始音符
  value: ModeValue
}

export const NotationType = <const>{
  Note: 1,         // 音符
  Rest: 2,         // 休止符
  Tuplet: 3        // 连音
}

export interface Pitch {
  base: 1|2|3|4|5|6|7 // 1234567
  accidental: number  // 升降调 0原调 1升调 2重生 -1降调 -2重降
  octave: number      // 八度 0原调 正整数:升n个八度 负整数:降n个八度
}
export interface Note {
  type: (typeof NotationType)['Note']
  pitch: Pitch           // 音高
  time: number           // 时值; 1=全音符 2=二分音符 4=四分音符 .etc;
  ornaments: Pitch[]     // 装饰音
  slur: 0 | 1 | 2        // 圆滑线 0无 1起始 2结束
  dot: boolean           // 附点
}
export interface Rest {
  type: (typeof NotationType)['Rest']
  time: number          // 时值
}
export interface Tuplet {
  type: (typeof NotationType)['Tuplet']
  time: number
  pitches: Pitch[]
}
export type Notation = Note | Rest | Tuplet

export interface Options {
  width: number
  paddingX: number
  paddingY: number
  fontsize: number
  linePadding: number
  style: SheetStyle
}

export interface SheetStyle {
  font: string
  fillColor: string
  backgroundColor: string
}