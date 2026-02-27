<template>
  <div class="soft-index-panel main-right-panel">
    <el-radio-group v-model="tab" class="mt-3">
      <template v-for="(item, _index) in tabs" :key="_index">
        <el-radio-button :label="item" :value="_index"></el-radio-button>
      </template>
    </el-radio-group>
    <div class="main-block">
      <Service v-if="tab === 0" type-flag="nginx" title="Nginx"></Service>
      <Manager
        v-else-if="tab === 1"
        type-flag="nginx"
        :has-static="true"
        url="https://nginx.org/en/download.html"
        title="Nginx"
      ></Manager>
      <Config v-if="tab === 2"></Config>
      <Logs v-if="tab === 3" type="error"></Logs>
      <Logs v-if="tab === 4" type="access"></Logs>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Service from '../ServiceManager/index.vue'
  import Config from './Config.vue'
  import Logs from './Logs.vue'
  import Manager from '../VersionManager/index.vue'
  import { AppModuleSetup } from '@/core/Module'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const { tab, checkVersion } = AppModuleSetup('nginx')
  const tabs = [
    t('base.service'),
    t('base.versionManager'),
    t('base.configFile'),
    t('base.errorLog'),
    t('base.log')
  ]
  checkVersion()
</script>
