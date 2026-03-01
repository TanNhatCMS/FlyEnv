<template>
  <div class="soft-index-panel main-right-panel">
    <el-radio-group v-model="tab" class="mt-3">
      <template v-for="(item, _index) in tabs" :key="_index">
        <el-radio-button :label="item" :value="_index"></el-radio-button>
      </template>
    </el-radio-group>
    <div class="main-block">
      <Service
        v-if="tab === 0"
        title="Deno"
        type-flag="deno"
        :fetch-data-when-create="true"
      ></Service>
      <Manager
        v-else-if="tab === 1"
        type-flag="deno"
        title="Deno"
        url="https://github.com/denoland/deno/releases/"
        :has-static="true"
        :show-port-lib="false"
      ></Manager>
      <ProjectIndex
        v-else-if="tab === 2"
        :title="t('host.projectDeno')"
        :type-flag="'deno'"
      ></ProjectIndex>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Service from '@/components/ServiceManager/base.vue'
  import Manager from '../VersionManager/index.vue'
  import { AppModuleSetup } from '@/core/Module'
  import ProjectIndex from '@/components/LanguageProjects/index.vue'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const { tab } = AppModuleSetup('deno')
  const tabs = [t('base.service'), t('base.versionManager'), t('host.projectDeno')]
</script>
