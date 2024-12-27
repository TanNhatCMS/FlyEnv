import { defineStore } from 'pinia'
import IPC from '@/util/IPC'
import { I18nT } from '@shared/lang'
import { MessageError, MessageSuccess } from '@/util/Element'

export interface NodeJSItem {
  fetched: boolean
  local: Array<string>
  current: string
  installing: Record<string, boolean>
  switching: string
}

interface State {
  allVersion: {
    list: string[]
    expire: number
  }
  fetching: {
    nvm: boolean
    fnm: boolean
  }
  fnm: NodeJSItem
  nvm: NodeJSItem
  showInstall: boolean
  switching: boolean
  allFetching: boolean
}

const state: State = {
  allVersion: {
    list: [],
    expire: 0
  },
  fetching: {
    nvm: false,
    fnm: false
  },
  fnm: {
    fetched: false,
    local: [],
    current: '',
    installing: {},
    switching: ''
  },
  nvm: {
    fetched: false,
    local: [],
    current: '',
    installing: {},
    switching: ''
  },
  showInstall: false,
  switching: false,
  allFetching: false
}

export const NodejsStore = defineStore('nodejs', {
  state: (): State => state,
  getters: {},
  actions: {
    installOrUninstall(tool: 'fnm' | 'nvm', action: 'install' | 'uninstall', item: any) {
      if (this[tool].installing[item.version]) {
        return
      }
      this[tool].installing[item.version] = true
      IPC.send('app-fork:node', 'installOrUninstall', tool, action, item.version).then(
        (key: string, res: any) => {
          IPC.off(key)
          if (res?.code === 0) {
            const nodejsItem: NodeJSItem = this?.[tool]
            nodejsItem.current = res?.data?.current ?? ''
            nodejsItem.local = res?.data?.versions ?? []
            MessageSuccess(I18nT('base.success'))
          } else {
            MessageError(I18nT('base.fail'))
          }
          delete this[tool].installing[item.version]
        }
      )
    },
    versionChange(tool: 'fnm' | 'nvm', item: any) {
      if (this[tool].switching) {
        return
      }
      this[tool].switching = item.version
      this.switching = true
      item.switching = true
      IPC.send('app-fork:node', 'versionChange', tool, item.version).then(
        (key: string, res: any) => {
          IPC.off(key)
          if (res?.code === 0) {
            const nodejsItem: NodeJSItem = this?.[tool]
            nodejsItem.current = item.version
            MessageSuccess(I18nT('base.success'))
          } else {
            MessageError(I18nT('base.fail'))
          }
          item.switching = false
          this.switching = false
          this[tool].switching = ''
        }
      )
    },
    fetchData(tool: 'fnm' | 'nvm', reget?: boolean) {
      if (!tool || this.fetching[tool] || (this?.[tool]?.fetched && !reget)) {
        return
      }
      this.fetching[tool] = true
      const time = Math.round(new Date().getTime() / 1000)
      if (time > this.allVersion.expire && !this.allFetching) {
        this.allFetching = true
        IPC.send('app-fork:node', 'allVersion', tool).then((key: string, res: any) => {
          IPC.off(key)
          const list = res?.data?.all ?? []
          if (list.length > 0) {
            this.allVersion.list.splice(0)
            this.allVersion.list.push(...list)
            this.allVersion.expire = Math.round(new Date().getTime() / 1000) + 2 * 60 * 60
          }
          this.allFetching = false
        })
      }

      IPC.send('app-fork:node', 'localVersion', tool).then((key: string, res: any) => {
        IPC.off(key)
        const item: NodeJSItem = this?.[tool]
        item.local.splice(0)
        item.current = ''
        item.local = res?.data?.versions ?? []
        item.current = res?.data?.current ?? ''
        item.fetched = true
        this.fetching[tool] = false
      })
    }
  }
})
