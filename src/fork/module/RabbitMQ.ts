import { basename, dirname, join } from 'path'
import { existsSync, readdirSync } from 'fs'
import { Base } from './Base'
import { I18nT } from '@lang/index'
import type { OnlineVersionItem, SoftInstalled } from '@shared/app'
import {
  AppLog,
  execPromise,
  versionBinVersion,
  versionFilterSame,
  versionFixed,
  versionLocalFetch,
  versionSort,
  waitTime
} from '../Fn'
import { ForkPromise } from '@shared/ForkPromise'
import { mkdirp, readdir, readFile, remove, writeFile } from 'fs-extra'
import TaskQueue from '../TaskQueue'
import { EOL } from 'os'
import { ProcessListSearch } from '../Process'

class RabbitMQ extends Base {
  baseDir: string = ''

  constructor() {
    super()
    this.type = 'rabbitmq'
  }

  init() {
    this.baseDir = join(global.Server.BaseDir!, 'rabbitmq')
    this.pidPath = join(this.baseDir, 'rabbitmq.pid')
  }

  initConfig(version: SoftInstalled) {
    return new ForkPromise((resolve, reject, on) => {
      if (!existsSync(version?.bin)) {
        reject(new Error(I18nT('fork.binNoFound')))
        return
      }
      if (!version?.version) {
        reject(new Error(I18nT('fork.versionNoFound')))
        return
      }
      this._initConf(version).on(on).then(resolve)
    })
  }

  _initPlugin(version: SoftInstalled) {
    return new ForkPromise(async (resolve, reject, on) => {
      on({
        'APP-On-Log': AppLog(
          'info',
          I18nT('appLog.initPlugin', { command: `rabbitmq-plugins.bat enable rabbitmq_management` })
        )
      })
      process.chdir(dirname(version.bin))
      try {
        const res = await execPromise(`rabbitmq-plugins.bat enable rabbitmq_management`)
        console.log('rabbitmq _initPlugin: ', res)
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.initPluginSuccess'))
        })
      } catch (e: any) {
        on({
          'APP-On-Log': AppLog('error', I18nT('appLog.initPluginFail', { error: e }))
        })
      }
      resolve(true)
    })
  }

  _initConf(version: SoftInstalled): ForkPromise<string> {
    return new ForkPromise(async (resolve, reject, on) => {
      const v = version?.version?.split('.')?.[0] ?? ''
      const confFile = join(this.baseDir, `rabbitmq-${v}.bat`)
      const logDir = join(this.baseDir, `log-${v}`)
      await mkdirp(logDir)
      if (!existsSync(confFile)) {
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.confInit'))
        })
        await this._initPlugin(version).on(on)
        const pluginsDir = join(version.path, 'plugins')
        const mnesiaBaseDir = join(this.baseDir, `mnesia-${v}`)
        const content = `set "NODE_IP_ADDRESS=127.0.0.1"
set "NODENAME=rabbit@localhost"
set "RABBITMQ_LOG_BASE=${logDir}"
set "MNESIA_BASE=${mnesiaBaseDir}"
set "PLUGINS_DIR=${pluginsDir}"`
        await writeFile(confFile, content)
        const defaultFile = join(this.baseDir, `rabbitmq-${v}-default.conf`)
        await writeFile(defaultFile, content)
        on({
          'APP-On-Log': AppLog('info', I18nT('appLog.confInitSuccess', { file: confFile }))
        })
      }
      resolve(confFile)
    })
  }

  _startServer(version: SoftInstalled) {
    return new ForkPromise(async (resolve, reject, on) => {
      on({
        'APP-On-Log': AppLog(
          'info',
          I18nT('appLog.startServiceBegin', { service: `${this.type}-${version.version}` })
        )
      })
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.erlangEnvInit'))
      })
      await this._initEPMD()
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.erlangEnvInitEnd'))
      })
      const confFile = await this._initConf(version).on(on)
      const v = version?.version?.split('.')?.[0] ?? ''
      const mnesiaBaseDir = join(this.baseDir, `mnesia-${v}`)
      await mkdirp(mnesiaBaseDir)

      const startLogFile = join(this.baseDir, `start.log`)
      const startErrorLogFile = join(this.baseDir, `start.error.log`)
      if (existsSync(startErrorLogFile)) {
        try {
          await remove(startErrorLogFile)
        } catch (e) {}
      }

      const checkpid = async (time = 0) => {
        const all = readdirSync(mnesiaBaseDir)
        const pidFile = all.find((p) => p.endsWith('.pid'))
        if (pidFile) {
          const pid = await readFile(join(mnesiaBaseDir, pidFile), 'utf-8')
          on({
            'APP-On-Log': AppLog('info', I18nT('appLog.startServiceSuccess', { pid: pid }))
          })
          resolve(true)
        } else {
          if (time < 20) {
            await waitTime(500)
            await checkpid(time + 1)
          } else {
            let msg = I18nT('fork.startFail')
            if (existsSync(startErrorLogFile)) {
              msg = await readFile(startErrorLogFile)
            }
            on({
              'APP-On-Log': AppLog(
                'error',
                I18nT('appLog.startServiceFail', {
                  error: msg,
                  service: `${this.type}-${version.version}`
                })
              )
            })
            reject(new Error(msg))
          }
        }
      }
      try {
        const all = readdirSync(mnesiaBaseDir)
        const pid = all.find((p) => p.endsWith('.pid'))
        if (pid) {
          await remove(join(mnesiaBaseDir, pid))
        }
      } catch (e) {}

      const commands: string[] = [
        '@echo off',
        'chcp 65001>nul',
        `set "RABBITMQ_CONF_ENV_FILE=${confFile}"`,
        `cd /d "${dirname(version.bin)}"`,
        `start /B ${basename(version.bin)} -detached --PWSAPPFLAG=${global.Server.BaseDir!} > "${startLogFile}" 2>"${startErrorLogFile}" &`
      ]

      const command = commands.join(EOL)
      console.log('command: ', command)

      const cmdName = `start.cmd`
      const sh = join(this.baseDir, cmdName)
      await writeFile(sh, command)

      const appPidFile = join(global.Server.BaseDir!, `pid/${this.type}.pid`)
      await mkdirp(dirname(appPidFile))
      if (existsSync(appPidFile)) {
        try {
          await remove(appPidFile)
        } catch (e) {}
      }

      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommand'))
      })
      process.chdir(this.baseDir)
      try {
        const res = await execPromise(
          `powershell.exe -Command "(Start-Process -FilePath ./${cmdName} -PassThru -WindowStyle Hidden).Id"`
        )
        console.log('rabbitmq start res: ', res.stdout)
      } catch (e: any) {
        on({
          'APP-On-Log': AppLog(
            'error',
            I18nT('appLog.execStartCommandFail', {
              error: e,
              service: `${this.type}-${version.version}`
            })
          )
        })
        console.log('-k start err: ', e)
        reject(e)
        return
      }
      on({
        'APP-On-Log': AppLog('info', I18nT('appLog.execStartCommandSuccess'))
      })
      on({
        'APP-Service-Start-Success': true
      })
      await checkpid()
    })
  }

  fetchAllOnLineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('rabbitmq')
        all.forEach((a: any) => {
          const dir = join(
            global.Server.AppDir!,
            `rabbitmq-${a.version}`,
            'sbin/rabbitmq-server.bat'
          )
          const zip = join(global.Server.Cache!, `rabbitmq-${a.version}.zip`)
          a.appDir = join(global.Server.AppDir!, `rabbitmq-${a.version}`)
          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
        })
        resolve(all)
      } catch (e) {
        resolve({})
      }
    })
  }

  async _initEPMD() {
    const pids = await ProcessListSearch('epmd.exe', false)
    if (pids.length > 0) {
      return
    }
    let str = ''
    try {
      str = (await execPromise('set ERLANG_HOME')).stdout.trim().replace('ERLANG_HOME=', '')
    } catch (e: any) {}
    if (!str || !existsSync(str)) {
      return
    }
    const dirs = await readdir(str)
    for (const dir of dirs) {
      const bin = join(str, dir, 'bin/epmd.exe')
      if (existsSync(bin)) {
        process.chdir(dirname(bin))
        try {
          await execPromise('start /B ./epmd.exe > NUL 2>&1 &')
        } catch (e: any) {}
        break
      }
    }
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise(async (resolve) => {
      await this._initEPMD()
      let versions: SoftInstalled[] = []
      Promise.all([versionLocalFetch(setup?.rabbitmq?.dirs ?? [], 'rabbitmq-server.bat')])
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const pids = await ProcessListSearch('epmd.exe', false)
          const all = versions.map((item) => {
            if (pids.length === 0) {
              return Promise.resolve({
                error: I18nT('fork.noEPMD'),
                version: undefined
              })
            }
            const command = `${join(dirname(item.bin), 'rabbitmqctl.bat')} version`
            const reg = /(.*?)(\d+(\.\d+){1,4})(.*?)/g
            return TaskQueue.run(versionBinVersion, item.bin, command, reg)
          })
          return Promise.all(all)
        })
        .then((list) => {
          list.forEach((v, i) => {
            const { error, version } = v
            const num = version
              ? Number(versionFixed(version).split('.').slice(0, 2).join(''))
              : null
            Object.assign(versions[i], {
              version: version,
              num,
              enable: version !== null,
              error
            })
          })
          resolve(versionSort(versions))
        })
        .catch(() => {
          resolve([])
        })
    })
  }
}
export default new RabbitMQ()
