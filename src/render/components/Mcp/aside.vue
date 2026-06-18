<template>
  <li
    v-if="showItem"
    class="non-draggable"
    :class="'non-draggable' + (currentPage === '/mcp' ? ' active' : '')"
    @click="doNav"
  >
    <div class="left">
      <div class="icon-block" :class="{ run: serviceRunning }">
        <yb-icon style="padding: 5px" :svg="import('@/svg/mcp.svg?raw')" width="30" height="30" />
      </div>
      <span class="title">MCP Server</span>
    </div>

    <el-switch
      v-model="serviceRunning"
      :loading="serviceFetching"
      :disabled="serviceFetching"
      @click.stop="stopNav"
      @change="switchChange"
    >
    </el-switch>
  </li>
</template>

<script lang="ts" setup>
  import { AsideSetup, AppServiceModule } from '@/core/ASide'
  import { McpStore } from './mcp'
  import { computed } from 'vue'
  import { BrewStore } from '@/store/brew'

  const { showItem, serviceDisabled, currentPage, nav, stopNav } = AsideSetup('mcp')

  const brewStore = BrewStore()
  const mcpStore = McpStore()

  const module = brewStore.module('mcp')
  module.installed.push({} as any)
  module.stop = mcpStore.mcpStop
  module.start = mcpStore.mcpStart

  const serviceFetching = computed(() => {
    return mcpStore.fetching
  })

  const serviceRunning = computed(() => {
    return mcpStore.running
  })

  const groupDo = (isRunning: boolean): Array<Promise<string | boolean>> => {
    const all: Array<Promise<string | boolean>> = []
    if (isRunning) {
      if (showItem?.value && serviceRunning?.value) {
        all.push(mcpStore.mcpStop())
      }
    } else {
      if (showItem?.value) {
        all.push(mcpStore.mcpStart())
      }
    }
    return all
  }

  const switchChange = () => {
    if (serviceFetching?.value) return
    const fn = serviceRunning?.value ? mcpStore.mcpStop : mcpStore.mcpStart
    fn().then()
  }

  const doNav = () => {
    nav().then().catch()
  }

  AppServiceModule.mcp = {
    groupDo,
    switchChange,
    serviceRunning,
    serviceFetching,
    serviceDisabled,
    showItem
  } as any
</script>
