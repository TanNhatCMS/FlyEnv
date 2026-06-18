<template>
  <div class="soft-index-panel main-right-panel">
    <el-radio-group v-model="tab" class="mt-3">
      <template v-for="(item, _index) in tabs" :key="_index">
        <el-radio-button :label="item" :value="_index"></el-radio-button>
      </template>
    </el-radio-group>
    <div class="main-block">
      <Service v-if="tab === 0" title="MCP Server" type-flag="mcp">
        <template #tool-left>
          <template v-if="isRunning">
            <el-button
              style="color: #01cc74"
              class="button ml-[10px]"
              link
              @click.stop="copyEndpoint"
            >
              <yb-icon class="w-[20px] h-[20px]" :svg="import('@/svg/link.svg?raw')"></yb-icon>
            </el-button>
          </template>
        </template>
      </Service>
      <Manager
        v-else-if="tab === 1"
        type-flag="mcp"
        title="MCP Server"
        url=""
        :has-static="false"
        :show-port-lib="false"
        :show-brew-lib="false"
      ></Manager>
      <Config v-else-if="tab === 2"></Config>
      <Logs v-else-if="tab === 3"></Logs>
      <Tools v-else-if="tab === 4"></Tools>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Service from '@/components/ServiceManager/index.vue'
  import Manager from '../VersionManager/index.vue'
  import Config from './Config.vue'
  import Logs from './Logs.vue'
  import Tools from './Tools.vue'
  import { AppModuleSetup } from '@/core/Module'
  import { I18nT } from '@lang/index'
  import { computed } from 'vue'
  import { BrewStore } from '@/store/brew'
  import { MessageSuccess } from '@/util/Element'

  const { tab, checkVersion } = AppModuleSetup('mcp')
  const tabs = [
    I18nT('base.service'),
    I18nT('base.versionManager'),
    I18nT('base.configFile'),
    I18nT('base.log'),
    'Tools'
  ]
  checkVersion()
  const brewStore = BrewStore()

  const isRunning = computed(() => {
    return brewStore.module('mcp').installed.some((m) => m.run)
  })

  const copyEndpoint = () => {
    const endpoint = 'http://127.0.0.1:3847/sse'
    navigator.clipboard.writeText(endpoint).then(() => {
      MessageSuccess('Endpoint copied to clipboard!')
    })
  }
</script>
