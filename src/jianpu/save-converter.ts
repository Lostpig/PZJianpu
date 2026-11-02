import { NotationType, type ModeValue, type Sheet, type Notation } from './declare'

interface SaveInfo {
  t: string
  s: string
  a: string
  c: string
}
interface SavePitch {
  b: 1|2|3|4|5|6|7
  a: number
  o: number
}
interface SaveNote {
  t: (typeof NotationType)['Note']
  p: SavePitch
  m: number
  o: SavePitch[]
  s: 0 | 1 | 2
  d: boolean
}
interface SaveRest {
  t: (typeof NotationType)['Rest']
  m: number          // 时值
  d: boolean          // 附点
}
interface SaveTuplet {
  t: (typeof NotationType)['Tuplet']
  m: number
  e: SavePitch[]
}
type SaveNotation = SaveNote | SaveRest | SaveTuplet
interface SaveRepeat {
  f: number
  t: number
  c: number
}
interface SaveBeat {
  n: number
  m: number
  d: number
}
interface SaveBpm {
  n: number
  b: number
}
interface SaveMode {
  n: number
  v: ModeValue
  o: number
}
interface SaveSheet {
  f: string   //flag
  v: number   //version
  i: SaveInfo
  n: SaveNotation[]
  r: SaveRepeat[]   // TODO
  p: SaveBpm[]
  b: SaveBeat[]
  m: SaveMode[]
}

const NotationToSave = (n: Notation): SaveNotation => {
  if (n.type === NotationType.Note) {
    return {
      t: NotationType.Note,
      p: { b: n.pitch.base, a: n.pitch.accidental, o: n.pitch.octave },
      m: n.time,
      o: n.ornaments.map(p => ({ b: p.base, a: p.accidental, o: p.octave })),
      s: n.slur,
      d: n.dot
    }
  } else if (n.type === NotationType.Rest) {
    return {
      t: NotationType.Rest,
      m: n.time,
      d: n.dot
    }
  } else {
    return {
      t: NotationType.Tuplet,
      m: n.time,
      e: n.pitches.map(p => ({ b: p.base, a: p.accidental, o: p.octave }))
    }
  }
}
export const SheetToSave = (sheet: Sheet): string  => {
  const info: SaveInfo = {
      t: sheet.info.title,
      s: sheet.info.subTitle,
      a: sheet.info.artist,
      c: sheet.info.copyright
  }

  const save: SaveSheet = {
    f: 'pzjianpusave',
    v: 1,
    i: info,
    n: sheet.notations.map(NotationToSave),
    r: sheet.repeats.map(r => ({ f: r.from, t: r.to, c: r.count })),
    p: sheet.bpms.map(b => ({ n: b.notation, b: b.bpm })),
    b: sheet.beats.map(b => ({ n: b.notation, m: b.numerator, d: b.denominator })),
    m: sheet.modes.map(m => ({ n: m.notation, v: m.value, o: m.octave }))
  }

  return JSON.stringify(save)
}

const compatibleOldVersion = (jsonData: any) => {
  if (jsonData.info && jsonData.notations && jsonData.modes) 
  {
    for (let m of jsonData.modes) {
      m.octave = m.octave ?? 0
    }

    return true
  }

  return false
}

const SaveToNotation = (n: SaveNotation): Notation => {
  if (n.t === NotationType.Note) {
    return {
      type: NotationType.Note,
      pitch: { base: n.p.b, accidental: n.p.a, octave: n.p.o },
      time: n.m,
      ornaments: n.o.map(p => ({ base: p.b, accidental: p.a, octave: p.o })),
      slur: n.s,
      dot: n.d
    }
  } else if (n.t === NotationType.Rest) {
    return {
      type: NotationType.Rest,
      time: n.m,
      dot: n.d
    }
  } else {
    return {
      type: NotationType.Tuplet,
      time: n.m,
      pitches: n.e.map(p => ({ base: p.b, accidental: p.a, octave: p.o }))
    }
  }
}
export const SaveToSheet = (json: string): Sheet => {
  const jdata = JSON.parse(json)
  if (jdata.f !== 'pzjianpusave') {
    if (compatibleOldVersion(jdata)) {
      return jdata
    }
    throw new Error('String is not pzjianpu saved json')
  }

  const data = jdata as SaveSheet
  const sheet: Sheet = {
    info: { 
      title: data.i.t,
      subTitle: data.i.s,
      artist: data.i.a,
      copyright: data.i.c
    },
    notations: data.n.map(SaveToNotation),
    repeats: data.r.map(r => ({ from: r.f, to: r.t, count: r.c })),
    bpms: data.p.map(p => ({ notation: p.n, bpm: p.b })),
    beats: data.b.map(b => ({ notation: b.n, numerator: b.m, denominator: b.d })),
    modes: data.m.map(m => ({ notation: m.n, value: m.v, octave: m.o }))
  }

  return sheet
}

export const compressGzip = async (json: string) => {
  const data = new Blob([json], { type: 'application/json' })
  const compressedStream = data.stream().pipeThrough(new CompressionStream("gzip"))
  const compressedBlob = await new Response(compressedStream).blob()
  return compressedBlob
}
export const decompressGzip = async (blob: Blob) => {
  const decompressionStream = new DecompressionStream("gzip")
  const decompressedStream = blob.stream().pipeThrough(decompressionStream)
  const data = await new Response(decompressedStream).blob()
  return await data.text()
}