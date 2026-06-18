<template>
  <div class="module-config">
    <el-card class="app-base-el-card">
      <template #header>
        <span>MCP Server Configuration</span>
      </template>
      <template #default>
        <el-form :model="config" label-width="120px" class="config-form">
          <el-form-item label="Port">
            <el-input-number v-model="config.port" :min="1024" :max="65535" />
          </el-form-item>
          <el-form-item label="Auth Token">
            <el-input v-model="config.token" :type="showToken ? 'text' : 'password'">
              <template #append>
                <el-button @click="showToken = !showToken">
                  {{ showToken ? 'Hide' : 'Show' }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveConfig">Save Config</el-button>
            <el-button @click="resetToken">Regenerate Token</el-button>
          </el-form-item>
        </el-form>
      </template>
    </el-card>

    <el-card class="app-base-el-card mt-4">
      <template #header>
        <span>Connection Info</span>
      </template>
      <template #default>
        <div class="connection-info">
          <div class="info-item">
            <span class="label">SSE Endpoint:</span>
            <el-tag type="success">{{ endpoint }}</el-tag>
          </div>
          <div class="info-item">
            <span class="label">Messages URL:</span>
            <el-tag type="info">{{ messagesUrl }}</el-tag>
          </div>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import IPC from '@/util/IPC'
  import { MessageSuccess } from '@/util/Element'
  import { randomUUID } from 'crypto'

  const showToken = ref(false)

  const config = ref({
    port: 3847,
    token: ''
  })

  const endpoint = computed(() => `http://127.0.0.1:${config.value.port}/sse`)
  const messagesUrl = computed(() => `http://127.0.0.1:${config.value.port}/messages`)

  const loadConfig = () => {
    IPC.send('app-fork:mcp', 'getToken').then((key: string, token: string) => {
      IPC.off(key)
      if (token) {
        config.value.token = token
      }
    })
    IPC.send('app-fork:mcp', 'getPort').then((key: string, port: number) => {
      IPC.off(key)
      if (port) {
        config.value.port = port
      }
    })
  }

  const saveConfig = () => {
    IPC.send('app-fork:mcp', 'updateConfig', {
      port: config.value.port,
      token: config.value.token
    }).then((key: string) => {
      IPC.off(key)
      MessageSuccess('Config saved!')
    })
  }

  const resetToken = () => {
    config.value.token = randomUUID()
    saveConfig()
  }

  loadConfig()
</script>

<style scoped>
  .config-form {
    max-width: 500px;
  }
  .connection-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .info-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .info-item .label {
    font-weight: 500;
    min-width: 140px;
  }
</style>
