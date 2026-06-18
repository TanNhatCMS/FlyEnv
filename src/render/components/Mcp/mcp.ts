import { defineStore } from 'pinia'
import IPC from '@/util/IPC'
import { MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'
import { ip, type NetworkInterfaceInfo } from '@/util/NodeFn'

interface McpLogItem {
  time: string
  level: string
  message: string
}

interface State {
  running: boolean
  fetching: boolean
  port: number
  token: string
  ip: string
  ipList: NetworkInterfaceInfo[]
  selectedIp: string
  log: Array<McpLogItem>
  inited: boolean
}

const state: State = {
  running: false,
  fetching: false,
  port: 3847,
  token: '',
  ip: '127.0.0.1',
  ipList: [],
  selectedIp: '127.0.0.1',
  log: [],
  inited: false
}

export const McpStore = defineStore('mcp', {
  state: (): State => state,
  getters: {},
  actions: {
    getIP() {
      ip.addressList().then((list) => {
        const hasLocal = list.some((item) => item.ip === '127.0.0.1')
        if (!hasLocal) {
          list.unshift({ name: 'loopback', ip: '127.0.0.1', isVirtual: false, priority: 0 })
        }
        this.ipList = list
        const physicalIp = list.find((item) => !item.isVirtual && item.ip !== '127.0.0.1')
        if (physicalIp) {
          this.ip = physicalIp.ip
          this.selectedIp = physicalIp.ip
        } else if (list.length > 0) {
          this.ip = list[0].ip
          this.selectedIp = list[0].ip
        }
      })
    },
    setSelectedIp(val: string) {
      this.selectedIp = val
      this.ip = val
    },
    init() {
      if (this.inited) {
        return
      }
      this.inited = true
      IPC.send('app-fork:mcp', 'initConfig').then((key: string) => {
        IPC.off(key)
      })
      IPC.on('App_MCP_Log').then((key: string, res: McpLogItem) => {
        this.log.unshift(res)
        this.log.splice(1000)
      })
    },
    deinit() {
      IPC.off('App_MCP_Log')
    },
    loadConfig() {
      IPC.send('app-fork:mcp', 'getToken').then((key: string, res: any) => {
        IPC.off(key)
        const token = res?.data
        if (token) {
          this.token = token
        }
      })
      IPC.send('app-fork:mcp', 'getPort').then((key: string, res: any) => {
        IPC.off(key)
        const port = res?.data
        if (port) {
          this.port = port
        }
      })
      IPC.send('app-fork:mcp', 'getBind').then((key: string, res: any) => {
        IPC.off(key)
        const bind = res?.data
        if (bind) {
          this.selectedIp = bind
          this.ip = bind
        }
      })
    },
    mcpStart(): Promise<boolean> {
      return new Promise((resolve, reject) => {
        if (this.running) {
          resolve(true)
          return
        }
        this.fetching = true
        IPC.send('app-fork:mcp', 'startService').then((key: string, res: any) => {
          IPC.off(key)
          this.fetching = false
          if (res?.code === 0) {
            this.running = true
            if (res.data?.port) {
              this.port = res.data.port
            }
            if (res.data?.token) {
              this.token = res.data.token
            }
            MessageSuccess(I18nT('base.success'))
            resolve(true)
            return
          }
          this.running = true
          MessageSuccess(I18nT('base.success'))
          resolve(true)
        })
      })
    },
    mcpStop(): Promise<boolean> {
      return new Promise((resolve) => {
        if (!this.running) {
          resolve(true)
          return
        }
        this.fetching = true
        IPC.send('app-fork:mcp', 'stopService').then((key: string) => {
          IPC.off(key)
          this.fetching = false
          this.running = false
          MessageSuccess(I18nT('base.success'))
          resolve(true)
        })
      })
    },
    mcpRestart() {
      this.mcpStop()
        .then(() => this.mcpStart())
        .catch()
    },
    updateConfig(config: { port?: number; token?: string; bind?: string }) {
      return new Promise((resolve) => {
        IPC.send('app-fork:mcp', 'updateConfig', config).then((key: string) => {
          IPC.off(key)
          if (config.port) this.port = config.port
          if (config.token) this.token = config.token
          if (config.bind) {
            this.selectedIp = config.bind
            this.ip = config.bind
          }
          MessageSuccess(I18nT('base.success'))
          resolve(true)
        })
      })
    }
  }
})
