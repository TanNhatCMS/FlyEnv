<template>
  <div class="soft-index-panel main-right-panel">
    <el-radio-group v-model="tab" class="mt-3">
      <template v-for="(item, _index) in tabs" :key="_index">
        <el-radio-button :label="item" :value="_index"></el-radio-button>
      </template>
    </el-radio-group>
    <div class="main-block">
      <Service v-if="tab === 0"></Service>
      <Logs v-else-if="tab === 1"></Logs>
      <Tools v-else-if="tab === 2"></Tools>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Service from './dashboard.vue'
  import Logs from './Logs.vue'
  import Tools from './Tools.vue'
  import { AppModuleSetup } from '@/core/Module'
  import { I18nT } from '@lang/index'

  const { tab } = AppModuleSetup('mcp')
  const tabs = ['Dashboard', I18nT('base.log'), 'Tools']
</script>
