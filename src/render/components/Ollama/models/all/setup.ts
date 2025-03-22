import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { AppStore } from '@/store/app'
import XTerm from '@/util/XTerm'
import IPC from '@/util/IPC'
import { MessageError, MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'
import { BrewStore } from '@/store/brew'
import { OllamaLocalModelsSetup } from '@/components/Ollama/models/local/setup'

const { clipboard } = require('@electron/remote')
const { dirname } = require('path')

export type OllamaModelItem = {
  isRoot?: boolean
  name: string
  size?: string
  url?: string
  hasChildren?: boolean
  children?: OllamaModelItem[]
}

export const OllamaAllModelsSetup = reactive<{
  installEnd: boolean
  installing: boolean
  fetching: boolean
  search: string
  xterm: XTerm | undefined
  reFetch: () => void
  list: Record<string, OllamaModelItem[]>
}>({
  installEnd: false,
  installing: false,
  fetching: false,
  search: '',
  xterm: undefined,
  reFetch: () => 0,
  list: {}
})

export const Setup = () => {
  const brewStore = BrewStore()
  const runningService = computed(() => {
    return brewStore.module('ollama').installed.find((o) => o.run)
  })

  const fetching = computed(() => {
    return OllamaAllModelsSetup.fetching ?? false
  })

  const fetchData = () => {
    if (fetching.value || Object.keys(OllamaAllModelsSetup.list).length > 0) {
      return
    }
    OllamaAllModelsSetup.fetching = true

    let saved: any = localStorage.getItem(`fetchVerion-ollama-models`)
    if (saved) {
      saved = JSON.parse(saved)
      const time = Math.round(new Date().getTime() / 1000)
      if (time < saved.expire) {
        OllamaAllModelsSetup.list = reactive(saved.data)
        OllamaAllModelsSetup.fetching = false
        return
      }
    }

    IPC.send('app-fork:ollama', 'fetchAllModels').then((key: string, res: any) => {
      IPC.off(key)
      const list = res?.data ?? {}
      OllamaAllModelsSetup.list = reactive(list)
      if (Object.keys(list).length > 0) {
        localStorage.setItem(
          `fetchVerion-ollama-models`,
          JSON.stringify({
            expire: Math.round(new Date().getTime() / 1000) + 60 * 60,
            data: list
          })
        )
      }
      OllamaAllModelsSetup.fetching = false
    })
  }

  const reGetData = () => {
    fetchData()
  }

  OllamaAllModelsSetup.reFetch = reGetData

  const tableData = computed(() => {
    const dict = OllamaAllModelsSetup.list
    const list: OllamaModelItem[] = []
    for (const type in dict) {
      // const arr = dict[type]
      list.push({
        isRoot: true,
        name: type,
        hasChildren: true,
        children: []
      })
    }
    if (!OllamaAllModelsSetup.search.trim()) {
      return list
    }
    const search = OllamaAllModelsSetup.search.trim().toLowerCase()
    return list.filter((item) => item.name.includes(search) || search.includes(item.name))
  })

  const fetchCommand = (row: any) => {
    if (!runningService.value) {
      return I18nT('ollama.needServiceRun')
    }
    let fn = ''
    if (OllamaLocalModelsSetup.list.some((l) => l.name === row.name)) {
      fn = 'rm'
    } else {
      fn = 'pull'
    }
    return `cd "${dirname(runningService.value.bin)}"; ./ollama.exe ${fn} ${row.name}`
  }

  const copyCommand = (row: any) => {
    const command = fetchCommand(row)
    clipboard.writeText(command)
    MessageSuccess(I18nT('base.copySuccess'))
  }

  const handleBrewVersion = async (row: any) => {
    if (!runningService.value) {
      return MessageError(I18nT('ollama.needServiceRun'))
    }
    if (OllamaAllModelsSetup.installing) {
      return
    }
    OllamaAllModelsSetup.installing = true
    OllamaAllModelsSetup.installEnd = false
    const command: string[] = []
    if (global.Server.Proxy) {
      for (const k in global.Server.Proxy) {
        const v = global.Server.Proxy[k]
        command.push(`$Env:${k}="${v}"`)
      }
    }
    command.push(fetchCommand(row))
    await nextTick()
    const execXTerm = new XTerm()
    OllamaAllModelsSetup.xterm = execXTerm
    await execXTerm.mount(xtermDom.value!)
    await execXTerm.send(command)
    OllamaAllModelsSetup.installEnd = true
  }

  const xtermDom = ref<HTMLElement>()

  onMounted(() => {
    if (OllamaAllModelsSetup.installing) {
      nextTick().then(() => {
        const execXTerm: XTerm = OllamaAllModelsSetup.xterm as any
        if (execXTerm && xtermDom.value) {
          execXTerm.mount(xtermDom.value).then().catch()
        }
      })
    }
  })

  onUnmounted(() => {
    OllamaAllModelsSetup.xterm && OllamaAllModelsSetup.xterm.unmounted()
  })

  fetchData()

  return {
    handleBrewVersion,
    reGetData,
    fetching,
    xtermDom,
    fetchCommand,
    copyCommand,
    tableData,
    runningService
  }
}
