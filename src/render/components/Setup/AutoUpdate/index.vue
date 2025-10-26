<template>
  <div class="plant-title">{{ $t('base.autoUpdate') }}</div>
  <div class="main reset-pass">
    <div class="flex items-center gap-3">
      <span>{{ $t('base.autoCheck') }}</span>
      <el-switch v-model="autoCheck"></el-switch>
    </div>
    <div class="flex items-center gap-3">
      <span>{{ $t('base.allowPrerelease') }}</span>
      <el-switch v-model="allowPrerelease"></el-switch>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { AppStore } from '@/store/app'
  const store = AppStore()
  const autoCheck = computed({
    get() {
      return store.config.setup.autoCheck
    },
    set(v) {
      store.config.setup.autoCheck = v
      store.saveConfig()
    }
  })
  const allowPrerelease = computed({
    get() {
      return store.config.setup.allowPrerelease ?? false
    },
    set(v) {
      store.config.setup.allowPrerelease = v
      store.saveConfig()
    }
  })
</script>
