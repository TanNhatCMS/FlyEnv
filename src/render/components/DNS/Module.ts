import { defineAsyncComponent } from 'vue'
import type { AppModuleItem } from '@/core/type'

const module: AppModuleItem = {
  moduleType: 'dnsServer',
  typeFlag: 'dns',
  label: 'DNS Server',
  icon: import('@/svg/dns2.svg?raw'),
  index: defineAsyncComponent(() => import('./Index.vue')),
  aside: defineAsyncComponent(() => import('./aside.vue')),
  asideIndex: 15,
  isTray: true
}
export default module
