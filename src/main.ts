import './app.css'
import App from './App.svelte'
import { Jianpu } from './jianpu/index'
import { bindingKeyboardHandlers } from './key-operation'



const boot = () => {
  const canvas = document.getElementById('sheet-canvas') as HTMLCanvasElement

  const jianpuInstance = new Jianpu()
  jianpuInstance.binding(canvas)
  // DEBUG
  // jianpuInstance.DEBUG = true

  bindingKeyboardHandlers(jianpuInstance)

  const contextMap = new Map<string, any>()
  contextMap.set('jianpu', jianpuInstance)

  const app = new App({
    target: document.getElementById('app')!,
    context: contextMap
  })
}

document.onreadystatechange = () => {
  boot()
}