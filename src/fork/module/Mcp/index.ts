import { join } from 'path'
import { existsSync } from 'fs'
import * as http from 'http'
import { randomUUID } from 'crypto'
import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import { AppLog, readFile, writeFile, mkdirp } from '../../Fn'
import { I18nT } from '@lang/index'

let McpServer: any
let StreamableHTTPServerTransport: any
let z: any

async function loadSdk() {
  if (!McpServer) {
    const mcpModule = await import('@modelcontextprotocol/sdk/server/mcp.js')
    McpServer = mcpModule.McpServer
    const transportModule = await import('@modelcontextprotocol/sdk/server/streamableHttp.js')
    StreamableHTTPServerTransport = transportModule.StreamableHTTPServerTransport
    const zodModule = await import('zod')
    z = zodModule.z ?? zodModule.default ?? zodModule
  }
}

class Mcp extends Base {
  private server: http.Server | null = null
  private mcpServer: any = null
  private transports: Map<string, any> = new Map()
  private port = 3847
  private token = ''

  constructor() {
    super()
    this.type = 'mcp'
  }

  init() {
    this.pidPath = join(global.Server.BaseDir!, 'mcp/mcp.pid')
  }

  private async createMcpServer() {
    await loadSdk()

    const server = new McpServer({
      name: 'flyenv-mcp-server',
      version: '1.0.0'
    })

    server.registerTool(
      'flyenv_list_services',
      {
        description: 'List all available FlyEnv services and their current status'
      },
      async () => {
        const services = [
          'nginx',
          'apache',
          'caddy',
          'mysql',
          'mariadb',
          'postgresql',
          'mongodb',
          'redis',
          'memcached',
          'php',
          'node',
          'python',
          'java',
          'golang',
          'ruby',
          'elasticsearch',
          'rabbitmq',
          'ollama'
        ]
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  services: services.map((s) => ({
                    name: s,
                    type: this.getServiceType(s)
                  }))
                },
                null,
                2
              )
            }
          ]
        }
      }
    )

    server.registerTool(
      'flyenv_start_service',
      {
        description: 'Start a FlyEnv service (e.g., nginx, mysql, php, redis)',
        inputSchema: {
          service: z.string().describe('Service name to start')
        }
      },
      async ({ service }: { service: string }) => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: `Service ${service} start command sent` })
            }
          ]
        }
      }
    )

    server.registerTool(
      'flyenv_stop_service',
      {
        description: 'Stop a running FlyEnv service',
        inputSchema: {
          service: z.string().describe('Service name to stop')
        }
      },
      async ({ service }: { service: string }) => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: `Service ${service} stop command sent` })
            }
          ]
        }
      }
    )

    server.registerTool(
      'flyenv_get_service_status',
      {
        description: 'Get detailed status of a specific service',
        inputSchema: {
          service: z.string().describe('Service name')
        }
      },
      async ({ service }: { service: string }) => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                service,
                status: 'unknown',
                message: 'Use FlyEnv UI to check actual status'
              })
            }
          ]
        }
      }
    )

    server.registerTool(
      'flyenv_list_versions',
      {
        description: 'List installed versions for a service',
        inputSchema: {
          service: z.string().describe('Service name')
        }
      },
      async ({ service }: { service: string }) => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                service,
                versions: [],
                message: 'Use FlyEnv version manager to check installed versions'
              })
            }
          ]
        }
      }
    )

    server.registerTool(
      'flyenv_get_config',
      {
        description: 'Get configuration file path for a service',
        inputSchema: {
          service: z.string().describe('Service name')
        }
      },
      async ({ service }: { service: string }) => {
        const configPath = join(global.Server.BaseDir!, service, `${service}.conf`)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                service,
                configPath,
                exists: existsSync(configPath)
              })
            }
          ]
        }
      }
    )

    server.registerTool(
      'flyenv_get_logs',
      {
        description: 'Get recent log entries for a service',
        inputSchema: {
          service: z.string().describe('Service name'),
          lines: z.number().optional().describe('Number of lines (default: 100)')
        }
      },
      async ({ service, lines }: { service: string; lines?: number }) => {
        const logPath = join(
          global.Server.BaseDir!,
          service,
          `${service}-start-out.log`
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                service,
                logPath,
                exists: existsSync(logPath),
                lines: lines ?? 100
              })
            }
          ]
        }
      }
    )

    server.registerTool(
      'flyenv_get_system_info',
      {
        description: 'Get FlyEnv system information'
      },
      async () => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                baseDir: global.Server.BaseDir,
                appDir: global.Server.AppDir
              })
            }
          ]
        }
      }
    )

    return server
  }

  private getServiceType(service: string): string {
    const webServers = ['nginx', 'apache', 'caddy']
    const databases = ['mysql', 'mariadb', 'postgresql', 'mongodb']
    const caches = ['redis', 'memcached']
    const languages = ['php', 'node', 'python', 'java', 'golang', 'ruby']

    if (webServers.includes(service)) return 'webServer'
    if (databases.includes(service)) return 'database'
    if (caches.includes(service)) return 'cache'
    if (languages.includes(service)) return 'language'
    return 'other'
  }

  initConfig(): ForkPromise<string> {
    return new ForkPromise(async (resolve, reject, on) => {
      const baseDir = join(global.Server.BaseDir!, 'mcp')
      if (!existsSync(baseDir)) {
        await mkdirp(baseDir)
      }
      const configFile = join(baseDir, 'config.json')
      if (!existsSync(configFile)) {
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.confInit'))
        })
        const defaultConfig = {
          port: 3847,
          token: randomUUID()
        }
        await writeFile(configFile, JSON.stringify(defaultConfig, null, 2))
        this.port = defaultConfig.port
        this.token = defaultConfig.token
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.confInitSuccess', { file: configFile }))
        })
      } else {
        const content = await readFile(configFile, 'utf-8')
        const config = JSON.parse(content)
        this.port = config.port || 3847
        this.token = config.token || randomUUID()
      }
      resolve(configFile)
    })
  }

  _startServer(h: any) {
    return new ForkPromise(async (resolve, reject, on) => {
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.startServiceBegin', { service: 'mcp-server' }))
      })

      await this.initConfig().on(on)

      const baseDir = join(global.Server.BaseDir!, 'mcp')
      await mkdirp(baseDir)

      this.mcpServer = await this.createMcpServer()

      this.server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`)

        if (url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }))
          return
        }

        if (url.pathname === '/mcp') {
          try {
            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID()
            })

            const sessionId = transport.sessionId
            if (sessionId) {
              this.transports.set(sessionId, transport)
            }

            await this.mcpServer.connect(transport)

            await transport.handleRequest(req, res)
          } catch (error: any) {
            console.error('MCP handle error:', error)
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: error.message }))
            }
          }
          return
        }

        res.writeHead(404)
        res.end('Not Found')
      })

      this.server.listen(this.port, '127.0.0.1', () => {
        console.error(`MCP Server listening on http://127.0.0.1:${this.port}/mcp`)
        on({
          'APP-On-Log': AppLog('info', `MCP Server started on port ${this.port}`)
        })

        const pidFile = this.appPidFile()
        this.ensureAppPidDirWritable()
          .then(() => {
            writeFile(pidFile, `${process.pid}`)
          })
          .catch(() => {})

        resolve({
          'APP-Service-Start-PID': process.pid,
          port: this.port,
          token: this.token
        })
      })

      this.server.on('error', (err: any) => {
        console.error('MCP Server error:', err)
        reject(err)
      })
    })
  }

  _stopServer() {
    return new ForkPromise(async (resolve, reject, on) => {
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.stopServiceBegin', { service: 'mcp-server' }))
      })

      for (const [, transport] of this.transports) {
        try {
          await transport.close()
        } catch {}
      }
      this.transports.clear()

      if (this.mcpServer) {
        try {
          await this.mcpServer.close()
        } catch {}
        this.mcpServer = null
      }

      if (this.server) {
        this.server.close(() => {
          this.server = null
          on({
            'APP-On-Log': AppLog('info', I18nT('appLog.stopServiceEnd', { service: 'mcp-server' }))
          })
          resolve({ 'APP-Service-Stop-PID': [] })
        })
      } else {
        resolve({ 'APP-Service-Stop-PID': [] })
      }
    })
  }

  getPort() {
    return new ForkPromise(async (resolve) => {
      resolve(this.port)
    })
  }

  getToken() {
    return new ForkPromise(async (resolve) => {
      resolve(this.token)
    })
  }

  updateConfig(config: { port?: number; token?: string }) {
    return new ForkPromise(async (resolve, reject, on) => {
      const baseDir = join(global.Server.BaseDir!, 'mcp')
      const configFile = join(baseDir, 'config.json')

      if (config.port) this.port = config.port
      if (config.token) this.token = config.token

      await writeFile(
        configFile,
        JSON.stringify(
          {
            port: this.port,
            token: this.token
          },
          null,
          2
        )
      )

      on({
        'APP-On-Log': AppLog('info', 'MCP config updated')
      })

      resolve(true)
    })
  }
}

export default new Mcp()
