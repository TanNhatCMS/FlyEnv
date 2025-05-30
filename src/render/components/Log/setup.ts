import { nextTick, onMounted, onUnmounted, ref, watch, Ref } from 'vue'
import { MessageError, MessageSuccess } from '@/util/Element'
import { I18nT } from '@lang/index'
import type { FSWatcher } from 'fs'
import { editor } from 'monaco-editor/esm/vs/editor/editor.api.js'
import { EditorConfigMake, EditorCreate } from '@/util/Editor'
import IPC from '@/util/IPC'

const fsWatch = require('fs').watch
const { shell } = require('@electron/remote')
const { existsSync, writeFile, readFile } = require('fs-extra')

export const LogSetup = (file: Ref<string>) => {
  const logRef = ref()
  const log = ref('')
  let watcher: FSWatcher | null
  let monacoInstance: editor.IStandaloneCodeEditor | null

  const isDisabled = () => {
    return !file.value || !existsSync(file.value)
  }

  const getLog = () => {
    if (existsSync(file.value)) {
      const watchLog = () => {
        if (watcher) {
          watcher.close()
          watcher = null
        }
        if (!watcher) {
          watcher = fsWatch(file.value, () => {
            read().then()
          })
        }
      }

      const read = () => {
        return new Promise((resolve) => {
          readFile(file.value, 'utf-8')
            .then((str: string) => {
              log.value = str
              resolve(true)
            })
            .catch(() => {
              IPC.send(`app-fork:tools`, 'readFileByRoot', file.value).then(
                (key: string, res: any) => {
                  IPC.off(key)
                  log.value = res?.data ?? ''
                  resolve(true)
                }
              )
            })
        })
      }
      read().then(() => {
        watchLog()
      })
    } else {
      log.value = I18nT('base.noLogs')
    }
  }

  const logDo = (action: 'open' | 'refresh' | 'clean') => {
    if (!existsSync(file.value)) {
      MessageError(I18nT('base.noFoundLogFile'))
      return
    }
    switch (action) {
      case 'open':
        shell.showItemInFolder(file.value)
        break
      case 'refresh':
        getLog()
        break
      case 'clean':
        writeFile(file.value, '')
          .then(() => {
            log.value = ''
            MessageSuccess(I18nT('base.success'))
          })
          .catch(() => {
            IPC.send(`app-fork:tools`, 'writeFileByRoot', file.value, '').then((key: string) => {
              IPC.off(key)
              MessageSuccess(I18nT('base.success'))
            })
          })
        break
    }
  }

  const initEditor = () => {
    if (!monacoInstance) {
      const inputDom: HTMLElement = logRef.value as HTMLElement
      if (!inputDom || !inputDom?.style) {
        return
      }
      monacoInstance = EditorCreate(inputDom, EditorConfigMake(log.value, true, 'on'))
    } else {
      monacoInstance.setValue(log.value)
    }
  }

  watch(log, () => {
    nextTick().then(() => {
      initEditor()
    })
  })

  onMounted(() => {
    nextTick().then(() => {
      initEditor()
    })
  })

  onUnmounted(() => {
    monacoInstance && monacoInstance.dispose()
    monacoInstance = null
    if (watcher) {
      watcher.close()
      watcher = null
    }
  })

  getLog()

  watch(file, () => {
    getLog()
  })

  return {
    isDisabled,
    logDo,
    logRef
  }
}
