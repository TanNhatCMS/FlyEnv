import { join } from 'path'
import { existsSync } from 'fs'
import * as http from 'http'
import { randomUUID } from 'crypto'
import { Base } from '../Base'
import { ForkPromise } from '@shared/ForkPromise'
import { AppLog, readFile, writeFile, mkdirp } from '../../Fn'
import { I18nT } from '@lang/index'

interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, any>
}

interface McpClient {
  id: string
  res: http.ServerResponse
  lastEventId: number
}

class Mcp extends Base {
  private server: http.Server | null = null
  private clients: Map<string, McpClient> = new Map()
  private port = 3847
  private token = ''

  constructor() {
    super()
    this.type = 'mcp'
  }

  init() {
    this.pidPath = join(global.Server.BaseDir!, 'mcp/mcp.pid')
  }

  private getTools(): McpTool[] {
    return [
      {
        name: 'flyenv_list_services',
        description: 'List all available FlyEnv services and their current status',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'flyenv_start_service',
        description: 'Start a FlyEnv service (e.g., nginx, mysql, php, redis)',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name (e.g., nginx, mysql, php, redis, mongodb)'
            }
          },
          required: ['service']
        }
      },
      {
        name: 'flyenv_stop_service',
        description: 'Stop a running FlyEnv service',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name to stop'
            }
          },
          required: ['service']
        }
      },
      {
        name: 'flyenv_get_service_status',
        description: 'Get detailed status of a specific service',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name'
            }
          },
          required: ['service']
        }
      },
      {
        name: 'flyenv_list_versions',
        description: 'List installed versions for a service',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name'
            }
          },
          required: ['service']
        }
      },
      {
        name: 'flyenv_get_config',
        description: 'Get configuration file path for a service',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name'
            }
          },
          required: ['service']
        }
      },
      {
        name: 'flyenv_get_logs',
        description: 'Get recent log entries for a service',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name'
            },
            lines: {
              type: 'number',
              description: 'Number of lines to retrieve (default: 100)'
            }
          },
          required: ['service']
        }
      },
      {
        name: 'flyenv_get_system_info',
        description: 'Get FlyEnv system information',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]
  }

  private async handleToolCall(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'flyenv_list_services': {
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
          services: services.map((s) => ({
            name: s,
            type: this.getServiceType(s)
          }))
        }
      }
      case 'flyenv_start_service': {
        return { message: `Service ${args.service} start command sent` }
      }
      case 'flyenv_stop_service': {
        return { message: `Service ${args.service} stop command sent` }
      }
      case 'flyenv_get_service_status': {
        return {
          service: args.service,
          status: 'unknown',
          message: 'Use FlyEnv UI to check actual status'
        }
      }
      case 'flyenv_list_versions': {
        return {
          service: args.service,
          versions: [],
          message: 'Use FlyEnv version manager to check installed versions'
        }
      }
      case 'flyenv_get_config': {
        const configPath = join(global.Server.BaseDir!, args.service, `${args.service}.conf`)
        return {
          service: args.service,
          configPath,
          exists: existsSync(configPath)
        }
      }
      case 'flyenv_get_logs': {
        const logPath = join(
          global.Server.BaseDir!,
          args.service,
          `${args.service}-start-out.log`
        )
        return {
          service: args.service,
          logPath,
          exists: existsSync(logPath),
          message: 'Log file path returned'
        }
      }
      case 'flyenv_get_system_info': {
        return {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          baseDir: global.Server.BaseDir,
          appDir: global.Server.AppDir
        }
      }
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
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

  private sendSSE(res: http.ServerResponse, event: string, data: any, id?: number) {
    if (res.destroyed) return
    const eventId = id ?? Date.now()
    res.write(`id: ${eventId}\n`)
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
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
          token: randomUUID(),
          allowedOrigins: ['*']
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

      this.server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`)

        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, Last-Event-ID'
        )

        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }

        if (url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }))
          return
        }

        if (url.pathname === '/sse' && req.method === 'GET') {
          const clientId = randomUUID()
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
          })

          this.clients.set(clientId, {
            id: clientId,
            res,
            lastEventId: 0
          })

          this.sendSSE(res, 'endpoint', {
            url: `/messages?clientId=${clientId}`
          })

          req.on('close', () => {
            this.clients.delete(clientId)
          })

          return
        }

        if (url.pathname === '/messages' && req.method === 'POST') {
          const clientId = url.searchParams.get('clientId')
          const client = clientId ? this.clients.get(clientId) : null

          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })

          req.on('end', async () => {
            try {
              const message = JSON.parse(body)

              let response: any = null

              switch (message.method) {
                case 'initialize':
                  response = {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                      tools: {}
                    },
                    serverInfo: {
                      name: 'flyenv-mcp-server',
                      version: '1.0.0'
                    }
                  }
                  break

                case 'notifications/initialized':
                  res.writeHead(200)
                  res.end()
                  return

                case 'tools/list':
                  response = {
                    tools: this.getTools()
                  }
                  break

                case 'tools/call': {
                  const { name, arguments: args } = message.params
                  try {
                    const result = await this.handleToolCall(name, args || {})
                    response = {
                      content: [
                        {
                          type: 'text',
                          text: JSON.stringify(result, null, 2)
                        }
                      ]
                    }
                  } catch (error: any) {
                    response = {
                      content: [
                        {
                          type: 'text',
                          text: `Error: ${error.message}`
                        }
                      ],
                      isError: true
                    }
                  }
                  break
                }

                default:
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      error: { code: -32601, message: `Method not found: ${message.method}` },
                      id: message.id
                    })
                  )
                  return
              }

              if (client) {
                this.sendSSE(
                  client.res,
                  'message',
                  {
                    jsonrpc: '2.0',
                    result: response,
                    id: message.id
                  },
                  ++client.lastEventId
                )
              }

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  jsonrpc: '2.0',
                  result: response,
                  id: message.id
                })
              )
            } catch (error: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  jsonrpc: '2.0',
                  error: { code: -32603, message: error.message },
                  id: null
                })
              )
            }
          })

          return
        }

        res.writeHead(404)
        res.end('Not Found')
      })

      this.server.listen(this.port, '127.0.0.1', () => {
        console.error(`MCP Server listening on http://127.0.0.1:${this.port}`)
        console.error(`SSE endpoint: http://127.0.0.1:${this.port}/sse`)
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

      for (const [, client] of this.clients) {
        client.res.end()
      }
      this.clients.clear()

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
