import BaseTask from '@/components/AI/Task/BaseTask'
import { AIStore } from '@/components/AI/store'
import { I18nT } from '@shared/lang'

export class BrewPHP7Issues extends BaseTask {
  constructor() {
    super()
    this.task = [
      {
        content: () => {
          const aiStore = AIStore()
          aiStore.chatList.push({
            user: 'ai',
            content: I18nT('ai.brewPhp7Issues')
          })
        },
        run: () => {
          return new Promise(async (resolve) => {
            resolve(true)
          })
        }
      }
    ]
  }
}
