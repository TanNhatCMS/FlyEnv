import { join, basename, dirname } from 'path'
import { existsSync } from 'fs'
import { Base } from './Base'
import { I18nT } from '../lang'
import type { AppHost, OnlineVersionItem, SoftInstalled } from '@shared/app'
import {
  execPromise,
  execPromiseRoot,
  getAllFileAsync,
  versionBinVersion,
  versionFilterSame,
  versionFixed,
  versionInitedApp,
  versionLocalFetch,
  versionSort
} from '../Fn'
import { ForkPromise } from '@shared/ForkPromise'
import { mkdirp, readFile, writeFile } from 'fs-extra'
import TaskQueue from '../TaskQueue'
import { EOL } from 'os'
import { fetchHostList } from './host/HostFile'

class Apache extends Base {
  constructor() {
    super()
    this.type = 'apache'
  }

  init() {
    this.pidPath = join(global.Server.ApacheDir!, 'httpd.pid')
  }

  #resetConf(version: SoftInstalled) {
    return new ForkPromise(async (resolve, reject) => {
      const defaultFile = join(global.Server.ApacheDir!, `${version.version}.conf`)
      const defaultFileBack = join(global.Server.ApacheDir!, `${version.version}.default.conf`)
      const bin = version.bin
      if (existsSync(defaultFile)) {
        let content = await readFile(defaultFile, 'utf-8')
        let srvroot = ''
        const reg = new RegExp('(Define SRVROOT ")([\\s\\S]*?)(")', 'g')
        try {
          srvroot = reg?.exec?.(content)?.[2] ?? ''
        } catch (e) {}
        if (srvroot) {
          const srvrootReplace = version.path.split('\\').join('/')
          if (srvroot !== srvrootReplace) {
            content = content.replace(
              `Define SRVROOT "${srvroot}"`,
              `Define SRVROOT "${srvrootReplace}"`
            )
          }
          await writeFile(defaultFile, content)
          await writeFile(defaultFileBack, content)
        }
        resolve(true)
        return
      }
      // 获取httpd的默认配置文件路径
      let str = ''
      try {
        const res = await execPromise(`${basename(bin)} -V`, {
          cwd: dirname(bin)
        })
        str = res?.stdout?.toString() ?? ''
      } catch (e: any) {
        reject(new Error(I18nT('fork.apacheLogPathErr')))
        return
      }
      console.log('resetConf: ', str)

      let reg = new RegExp('(SERVER_CONFIG_FILE=")([\\s\\S]*?)(")', 'g')
      let file = ''
      try {
        file = reg?.exec?.(str)?.[2] ?? ''
      } catch (e) {}
      file = file.trim()
      file = join(version.path, file)

      console.log('file: ', file)

      if (!file || !existsSync(file)) {
        reject(new Error(I18nT('fork.confNoFound')))
        return
      }
      let content = await readFile(file, 'utf-8')

      reg = new RegExp('(CustomLog ")([\\s\\S]*?)(")', 'g')
      let logPath = ''
      try {
        logPath = reg?.exec?.(content)?.[2] ?? ''
      } catch (e) {}
      logPath = logPath.trim()

      reg = new RegExp('(ErrorLog ")([\\s\\S]*?)(")', 'g')
      let errLogPath = ''
      try {
        errLogPath = reg?.exec?.(content)?.[2] ?? ''
      } catch (e) {}
      errLogPath = errLogPath.trim()

      let srvroot = ''
      reg = new RegExp('(Define SRVROOT ")([\\s\\S]*?)(")', 'g')
      try {
        srvroot = reg?.exec?.(content)?.[2] ?? ''
      } catch (e) {}

      content = content
        .replace('#LoadModule deflate_module', 'LoadModule deflate_module')
        .replace('#LoadModule deflate_module', 'LoadModule deflate_module')
        .replace('#LoadModule proxy_module', 'LoadModule proxy_module')
        .replace('#LoadModule proxy_fcgi_module', 'LoadModule proxy_fcgi_module')
        .replace('#LoadModule ssl_module', 'LoadModule ssl_module')
        .replace('#LoadModule access_compat_module', 'LoadModule access_compat_module')
        .replace('#ServerName www.', 'ServerName www.')

      if (logPath) {
        const logPathReplace = join(global.Server.ApacheDir!, `${version.version}.access.log`)
          .split('\\')
          .join('/')
        content = content.replace(`CustomLog "${logPath}"`, `CustomLog "${logPathReplace}"`)
      }

      if (errLogPath) {
        const errLogPathReplace = join(global.Server.ApacheDir!, `${version.version}.error.log`)
          .split('\\')
          .join('/')
        content = content.replace(`ErrorLog "${errLogPath}"`, `ErrorLog "${errLogPathReplace}"`)
      }

      if (srvroot) {
        const srvrootReplace = version.path.split('\\').join('/')
        content = content.replace(
          `Define SRVROOT "${srvroot}"`,
          `Define SRVROOT "${srvrootReplace}"`
        )
      }

      let find = content.match(/\nUser _www(.*?)\n/g)
      content = content.replace(find?.[0] ?? '###@@@&&&', '\n#User _www\n')
      find = content.match(/\nGroup _www(.*?)\n/g)
      content = content.replace(find?.[0] ?? '###@@@&&&', '\n#Group _www\n')

      const pidPath = join(global.Server.ApacheDir!, 'httpd.pid').split('\\').join('/')
      let vhost = join(global.Server.BaseDir!, 'vhost/apache/')
      await mkdirp(vhost)
      vhost = vhost.split('\\').join('/')

      content += `\nPidFile "${pidPath}"
IncludeOptional "${vhost}*.conf"`
      await writeFile(defaultFile, content)
      await writeFile(defaultFileBack, content)
      resolve(true)
    })
  }

  async #handleListenPort(version: SoftInstalled) {
    let host: Array<AppHost> = []
    try {
      host = await fetchHostList()
    } catch (e) {}
    if (host.length === 0) {
      return
    }
    const allNeedPort: Set<number> = new Set([80])
    host.forEach((h) => {
      const apache = Number(h?.port?.apache)
      const apache_ssl = Number(h?.port?.apache_ssl)
      if (apache && !isNaN(apache)) {
        allNeedPort.add(apache)
      }
      if (apache_ssl && !isNaN(apache_ssl)) {
        allNeedPort.add(apache_ssl)
      }
    })
    const portRegex = /<VirtualHost\s+\*:(\d+)>/g
    const regex = /([\s\n]?[^\n]*)Listen\s+\d+(.*?)([^\n])(\n|$)/g
    const allVhostFile = await getAllFileAsync(join(global.Server.BaseDir!, 'vhost/apache'))
    for (const file of allVhostFile) {
      portRegex.lastIndex = 0
      regex.lastIndex = 0
      let content = await readFile(file, 'utf-8')
      if (regex.test(content)) {
        regex.lastIndex = 0
        content = content.replace(regex, '\n').replace(/\n+/g, '\n').trim()
        await writeFile(file, content)
      }
      let m
      while ((m = portRegex.exec(content)) !== null) {
        if (m && m.length > 1) {
          const port = Number(m[1])
          if (port && !isNaN(port)) {
            allNeedPort.add(port)
          }
        }
      }
    }
    console.log('allNeedPort: ', allNeedPort)
    const configpath = join(global.Server.ApacheDir!, `${version.version}.conf`)
    let confContent = await readFile(configpath, 'utf-8')
    regex.lastIndex = 0
    if (regex.test(confContent)) {
      regex.lastIndex = 0
      confContent = confContent.replace(regex, '\n').replace(/\n+/g, '\n').trim()
    }
    confContent = confContent
      .replace(/#PhpWebStudy-Apache-Listen-Begin#([\s\S]*?)#PhpWebStudy-Apache-Listen-End#/g, '')
      .replace(/\n+/g, '\n')
      .trim()
    const txts: Array<string> = Array.from(allNeedPort).map((s) => `Listen ${s}`)
    txts.unshift('#PhpWebStudy-Apache-Listen-Begin#')
    txts.push('#PhpWebStudy-Apache-Listen-End#')
    confContent = txts.join('\n') + '\n' + confContent
    await writeFile(configpath, confContent)
  }

  _startServer(version: SoftInstalled) {
    return new ForkPromise(async (resolve, reject) => {
      await this.initLocalApp(version, 'apache')
      await this.#resetConf(version)
      await this.#handleListenPort(version)
      const bin = version.bin
      const conf = join(global.Server.ApacheDir!, `${version.version}.conf`)
      if (!existsSync(conf)) {
        reject(new Error(I18nT('fork.confNoFound')))
        return
      }

      process.chdir(dirname(bin))
      let command = `${basename(bin)} -k uninstall`
      try {
        await execPromiseRoot(command)
      } catch (e) {}

      process.chdir(dirname(bin))
      command = `${basename(bin)} -k install`
      try {
        await execPromiseRoot(command)
      } catch (e) {}

      const pidPath = join(global.Server.ApacheDir!, 'httpd.pid')
      if (existsSync(pidPath)) {
        try {
          await execPromiseRoot(`del -Force "${pidPath}"`)
        } catch (e) {}
      }

      const startLogFile = join(global.Server.ApacheDir!, `start.log`)
      const startErrLogFile = join(global.Server.ApacheDir!, `start.error.log`)
      if (existsSync(startErrLogFile)) {
        try {
          await execPromiseRoot(`del -Force "${startErrLogFile}"`)
        } catch (e) {}
      }

      const commands: string[] = [
        '@echo off',
        'chcp 65001>nul',
        `cd /d "${dirname(bin)}"`,
        `start /B ./${basename(bin)} -f "${conf}" -k start > "${startLogFile}" 2>"${startErrLogFile}" &`
      ]

      command = commands.join(EOL)
      console.log('command: ', command)

      const cmdName = `start.cmd`
      const sh = join(global.Server.ApacheDir!, cmdName)
      await writeFile(sh, command)

      const appPidFile = join(global.Server.BaseDir!, `pid/${this.type}.pid`)
      await mkdirp(dirname(appPidFile))
      if (existsSync(appPidFile)) {
        try {
          await execPromiseRoot(`del -Force "${appPidFile}"`)
        } catch (e) {}
      }

      process.chdir(global.Server.ApacheDir!)
      try {
        await execPromiseRoot(
          `powershell.exe -Command "(Start-Process -FilePath ./${cmdName} -PassThru -WindowStyle Hidden).Id"`
        )
      } catch (e: any) {
        console.log('-k start err: ', e)
        reject(e)
        return
      }
      const res = await this.waitPidFile(pidPath)
      if (res) {
        if (res?.pid) {
          await writeFile(appPidFile, res.pid)
          resolve({
            'APP-Service-Start-PID': res.pid
          })
          return
        }
        reject(new Error(res?.error ?? 'Start Fail'))
        return
      }
      let msg = 'Start Fail'
      if (existsSync(startLogFile)) {
        msg = await readFile(startLogFile, 'utf-8')
      }
      reject(new Error(msg))
    })
  }

  fetchAllOnLineVersion() {
    return new ForkPromise(async (resolve) => {
      try {
        const all: OnlineVersionItem[] = await this._fetchOnlineVersion('apache')
        all.forEach((a: any) => {
          const subDir = `Apache${a.mVersion.split('.').join('')}`
          const dir = join(global.Server.AppDir!, `apache-${a.version}`, subDir, 'bin/httpd.exe')
          const zip = join(global.Server.Cache!, `apache-${a.version}.zip`)
          a.appDir = join(global.Server.AppDir!, `apache-${a.version}`)
          a.zip = zip
          a.bin = dir
          a.downloaded = existsSync(zip)
          a.installed = existsSync(dir)
        })
        resolve(all)
      } catch (e) {
        resolve([])
      }
    })
  }

  allInstalledVersions(setup: any) {
    return new ForkPromise((resolve) => {
      let versions: SoftInstalled[] = []
      Promise.all([versionLocalFetch(setup?.apache?.dirs ?? [], 'httpd.exe')])
        .then(async (list) => {
          versions = list.flat()
          versions = versionFilterSame(versions)
          const all = versions.map((item) => {
            const command = `${basename(item.bin)} -v`
            const reg = /(Apache\/)(\d+(\.\d+){1,4})( )/g
            return TaskQueue.run(versionBinVersion, item.bin, command, reg)
          })
          return Promise.all(all)
        })
        .then(async (list) => {
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
          const appInited = await versionInitedApp('apache', 'bin/httpd.exe')
          versions.push(...appInited.filter((a) => !versions.find((v) => v.bin === a.bin)))
          resolve(versionSort(versions))
        })
        .catch(() => {
          resolve([])
        })
    })
  }
}

export default new Apache()
