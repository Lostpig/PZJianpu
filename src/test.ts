import { Jianpu, NotationType, Options } from './declares'
import { render, paint, RenderResult, paintItem, RenderedNotation } from './index'


const testSheet: Jianpu = {
  info: {
    title: 'XXXXXX',
    subTitle: '',
    artist: 'zzzzzz',
    copyright: 'wwwwww'
  },
  notations: [
    { type: NotationType.Note, slur: 0, time: 4, ornaments: [], dot: false, pitch: { base: 2, octave: 1, accidental: 0 } },
    { type: NotationType.Note, slur: 0, time: 8, ornaments: [], dot: false, pitch: { base: 3, octave: 1, accidental: 0 } },
    { type: NotationType.Note, slur: 0, time: 8, ornaments: [], dot: false, pitch: { base: 6, octave: 1, accidental: 0 } },
  ],
  repeats: [],
  bpms: [{ notation: 0, bpm: 120 }],
  beats: [{ notation: 0, denominator: 4, numerator: 2 }],
  modes: [{ notation: 0, value: 4 }]
}
const testOptions: Options = {
  width: 1600,
  padding: [100, 100],
  fontsize: 40,
  linePadding: 90
}

document.addEventListener('readystatechange', () => {
  if (document.readyState === "complete") {
    initPage()
  }
})

const loadSheet = async () => {
  const res = await fetch('./pu.json')
  const text = await res.text()

  const sheet =  JSON.parse(text) as Jianpu
  return render(sheet, testOptions)
}
const clearCtx = (ctx: CanvasRenderingContext2D, res: RenderResult) => {
  ctx.canvas.width = res.width
  ctx.canvas.height = res.height
  ctx.clearRect(0, 0, res.width, res.height)

  ctx.fillStyle = '#ffffd1'
  ctx.fillRect(testOptions.padding[1], testOptions.padding[0], res.width - testOptions.padding[1] * 2, res.height - testOptions.padding[0] * 2)

  ctx.fillStyle = '#333333'
}

const initPage = async () => {
  const cav = document.getElementById('sheet') as HTMLCanvasElement
  const ctx = cav.getContext('2d')!

  let res = await loadSheet()

  let stepIndex = 0
  const stepIndexEl = document.getElementById('step-index')!

  document.getElementById('render')!.addEventListener('click', () => {
    paint(ctx, res)
  })
  document.getElementById('step-render')!.addEventListener('click', () => {
    if (stepIndex < res.items.length) {
      const item = res.items[stepIndex]
      paintItem(ctx, item)
      stepIndexEl.innerHTML = stepIndex + ''
      stepIndex++
    }
  })
  document.getElementById('clear')!.addEventListener('click', () => {
    clearCtx(ctx, res)
    stepIndex = 0
  })
  document.getElementById('reload')!.addEventListener('click', async () => {
    res = await loadSheet()
    clearCtx(ctx, res)
    printRenderedNotations(res)
  })

  let selected: RenderedNotation | undefined = undefined
  cav.addEventListener('click', (ev) => {
    const x = ev.clientX
    const y = ev.clientY
    console.log(`x:${x}  y:${y}`)

    const last = selected
    selected = undefined
    for(const n of res.notations) {
      if (x > n.x1 && x < n.x2 && y > n.y1 && y < n.y2) {
        selected = n
        break
      }
    }

    if (last && last.notationIndex !== selected?.notationIndex) {
      paintNotation(ctx, last)
    }
    if (selected && selected.notationIndex !== last?.notationIndex) {
      paintNotation(ctx, selected, '#ff6633')
    }
  })

  clearCtx(ctx, res)
  printRenderedNotations(res)
}

const paintNotation = (ctx: CanvasRenderingContext2D, notation: RenderedNotation, style?: string) => {
  for(const item of notation.renderItems) {
    paintItem(ctx, item, style)
  }
}

const printRenderItems = (res: RenderResult) => {
  const texts: string[] = []
  texts.push(`<p> width: ${res.width} height: ${res.height} </p>`)
  texts.push(`<hr>`)
  texts.push(`<table><tbody>`)
  for (let i = 0; i < res.items.length; i++) {
    const item = res.items[i]
    texts.push(`<tr><td>[${i}]: ${item.type}</td><td>${item.x}</td><td>${item.y}</td></tr>`)
  }
  texts.push(`</tbody></table>`)
  document.getElementById('testinfo')!.innerHTML = texts.join('')
}

const printRenderedNotations = (res: RenderResult) => {
  const texts: string[] = []
  texts.push(`<p> width: ${res.width} height: ${res.height} </p>`)
  texts.push(`<hr>`)
  texts.push(`<table><tbody>`)
  for (let i = 0; i < res.notations.length; i++) {
    const item = res.notations[i]
    const type = item.notation.type === NotationType.Note ? 'Note' : (item.notation.type === NotationType.Rest ? 'Rest' : 'Tuplet')
    texts.push(`<tr><td>${item.notationIndex}</td><td>${type}</td><td>${item.x1}</td><td>${item.y1}</td><td>${item.x2}</td><td>${item.y2}</td></tr>`)
  }
  texts.push(`</tbody></table>`)
  document.getElementById('testinfo')!.innerHTML = texts.join('')
}