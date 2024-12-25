import IPC from '@/util/IPC'
import { BrewStore, type SoftInstalled } from '@/store/brew'
import { type AppHost, AppStore } from '@/store/app'
import { TaskStore } from '@/store/task'
import { I18nT } from '@shared/lang'
import { Service } from '@/components/ServiceManager/service'
import installedVersions from '@/util/InstalledVersions'
import { AllAppModule } from '@/core/type'

const exec = (
  typeFlag: AllAppModule,
  fn: string,
  version: SoftInstalled,
  lastVersion?: SoftInstalled
): Promise<string | boolean> => {
  return new Promise((resolve) => {
    if (version.running) {
      resolve(true)
      return
    }
    if (!version?.version) {
      resolve(I18nT('util.versionNoFound'))
      return
    }
    version.running = true
    const args = JSON.parse(JSON.stringify(version))
    const appStore = AppStore()
    const taskStore = TaskStore()
    const task = taskStore.module(typeFlag)!
    task.log!.splice(0)
    console.time('service exec')
    IPC.send(`app-fork:${typeFlag}`, fn, args, lastVersion).then((key: string, res: any) => {
      if (res.code === 0) {
        console.timeEnd('service exec')
        console.log('### key: ', key)
        IPC.off(key)

        const brewStore = BrewStore()
        if (lastVersion && lastVersion?.path) {
          const find = brewStore
            .module(typeFlag)
            .installed?.find(
              (i) =>
                i.path === lastVersion.path &&
                i.version === lastVersion.version &&
                i.bin === lastVersion.bin
            )
          lastVersion.pid = undefined
          if (find) {
            find.pid = undefined
          }
        }

        const pid = res?.data?.['APP-Service-Start-PID'] ?? ''

        const findV = brewStore
          .module(typeFlag)
          .installed?.find(
            (i) => i.path === version.path && i.version === version.version && i.bin === version.bin
          )
        console.log('findV: ', findV === version)

        version.run = fn !== 'stopService'
        version.running = false
        version.pid = pid
        if (findV) {
          findV.run = version.run
          findV.running = false
          findV.pid = pid
        }
        if (typeFlag === 'php' && fn === 'startService') {
          const hosts = appStore.hosts
          if (hosts && hosts?.[0] && !hosts?.[0]?.phpVersion) {
            appStore.initHost().then()
          }
        }
        resolve(true)
      } else if (res.code === 1) {
        IPC.off(key)
        task.log!.push(res.msg)
        version.running = false
        resolve(task.log!.join('\n'))
      } else if (res.code === 200) {
        if (typeof res?.msg === 'string') {
          task.log!.push(res.msg)
        } else if (res?.msg?.['APP-Service-Start-Success'] === true) {
          console.timeLog('service exec')
          const brewStore = BrewStore()
          const findV = brewStore
            .module(typeFlag)
            .installed?.find(
              (i) =>
                i.path === version.path && i.version === version.version && i.bin === version.bin
            )
          console.log('findV: ', findV === version)
          version.run = true
          version.running = false
          if (findV) {
            findV.run = version.run
            findV.running = false
          }
        }
      }
    })
  })
}

export const stopService = (typeFlag: AllAppModule, version: SoftInstalled) => {
  return exec(typeFlag, 'stopService', version)
}

export const startService = (
  typeFlag: AllAppModule,
  version: SoftInstalled,
  lastVersion?: SoftInstalled
) => {
  return exec(typeFlag, 'startService', version, lastVersion)
}

export const reloadWebServer = (hosts?: Array<AppHost>) => {
  const brewStore = BrewStore()
  let useSeted = false

  const apacheRunning = brewStore.module('apache').installed.find((a) => a.run)
  const apacheTaskRunning = brewStore.module('apache').installed.some((a) => a.running)
  if (apacheRunning && !apacheTaskRunning) {
    startService('apache', apacheRunning).then()
    useSeted = true
  }

  const nginxRunning = brewStore.module('nginx').installed.find((a) => a.run)
  const nginxTaskRunning = brewStore.module('nginx').installed.some((a) => a.running)
  if (nginxRunning && !nginxTaskRunning) {
    startService('nginx', nginxRunning).then()
    useSeted = true
  }

  const caddyRunning = brewStore.module('caddy').installed.find((a) => a.run)
  const caddyTaskRunning = brewStore.module('caddy').installed.some((a) => a.running)
  if (caddyRunning && !caddyTaskRunning) {
    startService('caddy', caddyRunning).then()
    useSeted = true
  }

  if (useSeted || !hosts || hosts?.length > 1) {
    return
  }

  if (hosts && hosts?.length === 1) {
    const appStore = AppStore()

    const currentApacheGet = () => {
      const current = appStore.config.server?.apache?.current
      const installed = brewStore.module('apache')?.installed
      if (!current) {
        return installed?.find((i) => !!i.path && !!i.version)
      }
      return installed?.find((i) => i.path === current?.path && i.version === current?.version)
    }

    const currentNginxGet = () => {
      const current = appStore.config.server?.nginx?.current
      const installed = brewStore.module('nginx')?.installed
      if (!current) {
        return installed?.find((i) => !!i.path && !!i.version)
      }
      return installed?.find((i) => i.path === current?.path && i.version === current?.version)
    }

    const currentCaddyGet = () => {
      const current = appStore.config.server?.caddy?.current
      const installed = brewStore.module('caddy')?.installed
      if (!current) {
        return installed?.find((i) => !!i.path && !!i.version)
      }
      return installed?.find((i) => i.path === current?.path && i.version === current?.version)
    }
    const caddy = currentCaddyGet()
    const nginx = currentNginxGet()
    const apache = currentApacheGet()
    if (caddy) {
      startService('caddy', caddy).then()
    } else if (nginx) {
      startService('nginx', nginx).then()
    } else if (apache) {
      startService('apache', apache).then()
    }

    const host = [...hosts].pop()
    if (host?.phpVersion) {
      const phpVersions = brewStore.module('php')?.installed ?? []
      const php = phpVersions?.find((p) => p.num === host.phpVersion)
      if (php) {
        startService('php', php).then()
      }
    }
  }
}

export const reGetInstalled = (type: AllAppModule) => {
  return new Promise((resolve) => {
    const service = Service[type]
    if (service?.fetching) {
      resolve(true)
      return
    }
    service.fetching = true
    const brewStore = BrewStore()
    const data = brewStore.module(type)
    data.installedInited = false
    installedVersions.allInstalledVersions([type]).then(() => {
      service.fetching = false
      resolve(true)
    })
  })
}
