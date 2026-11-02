import './app.css'
import App from './App.svelte'
import { Jianpu } from './jianpu/index'
import { SheetOperation } from './jianpu/operation'
import { bindingKeyboardHandlers } from './key-operation'
import { MidiPlayer, initializeMidi } from './midi/midi'


const boot = async () => {
  const canvas = document.getElementById('sheet-canvas') as HTMLCanvasElement

  const jianpuInstance = new Jianpu()
  jianpuInstance.binding(canvas)
  const operation = new SheetOperation(jianpuInstance)
  // DEBUG
  // jianpuInstance.DEBUG = true

  bindingKeyboardHandlers(operation)

  const contextMap = new Map<string, any>()
  contextMap.set('jianpu', jianpuInstance)
  contextMap.set('operation', operation)
  ;(window as any).__jianpu = jianpuInstance

  try {
    const midiop = await initializeMidi()
    const midiInstance = new MidiPlayer(midiop)
    contextMap.set('midi', midiInstance)
    ;(window as any).__midi = midiInstance
  }
  catch (e) {
    alert('midi init failed:' + e)
  }

  const app = new App({
    target: document.getElementById('app')!,
    context: contextMap
  })
}

document.onreadystatechange = () => {
  boot()
}