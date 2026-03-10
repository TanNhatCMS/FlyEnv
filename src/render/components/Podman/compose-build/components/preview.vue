<template>
  <el-form-item>
    <el-button type="primary" @click="generateCompose"
      >Docker Compose {{ t('base.preview') }}</el-button
    >
  </el-form-item>

  <el-dialog
    v-model="dialogVisible"
    class="el-dialog-content-flex-1 h-[75vh]"
    title="Docker Compose"
    width="750px"
  >
    <el-scrollbar class="h-full overflow-hidden">
      <pre>{{ composeYaml }}</pre>
    </el-scrollbar>
    <template #footer>
      <el-button @click="dialogVisible = false">{{ t('menu.close') }}</el-button>
      <el-button type="primary" @click="copyToClipboard">{{ t('base.copy') }}</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { ComposeBuildForm } from '@/components/Podman/compose-build/Form'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()
  import { ComposeBuildSetup } from '@/components/Podman/compose-build/setup'

  const props = defineProps<{
    formName: any
  }>()

  const form = computed(() => {
    return ComposeBuildForm[props.formName]
  })

  const { dialogVisible, composeYaml, generateCompose, copyToClipboard } = ComposeBuildSetup(form)
</script>

<style scoped>
  pre {
    background: #f5f7fa;
    padding: 16px;
    border-radius: 4px;
    overflow: auto;
  }
</style>
