import { defineAsyncComponent } from 'vue'
import type { AppModuleItem } from '@/core/type'

const module: AppModuleItem = {
  moduleType: 'ai',
  typeFlag: 'mcp',
  label: 'MCP Server',
  icon: import('@/svg/mcp.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 102,
  isService: true,
  isTray: false
}
export default module
