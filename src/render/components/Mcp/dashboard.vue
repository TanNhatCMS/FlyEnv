<template>
  <div class="mcp-panel main-right-panel">
    <div class="top-tab" :class="{ running: running }">
      <span class="title">MCP IP:</span>
      <el-select
        v-if="ipList.length > 1"
        v-model="selectedIp"
        :style="ipSelectStyle"
        class="w-[200px]"
        @change="onIpChange"
      >
        <el-option v-for="item in ipList" :key="item.ip" :label="item.ip" :value="item.ip">
        </el-option>
      </el-select>
      <span v-else class="ip">{{ ip }}</span>
      <el-popover popper-class="mcp-tips-popper" :show-after="800" width="auto">
        <template #default>
          <div>MCP Server provides Model Context Protocol endpoints for AI assistants.</div>
        </template>
        <template #reference>
          <yb-icon :svg="import('@/svg/question.svg?raw')" width="17" height="17" />
        </template>
      </el-popover>
    </div>
    <div class="main-block">
      <el-card class="config-card">
        <template #header>
          <span>Configuration</span>
        </template>
        <el-form :model="configForm" label-width="120px" class="config-form">
          <el-form-item label="Port">
            <el-input-number v-model="configForm.port" :min="1024" :max="65535" />
            <el-button type="primary" class="ml-2" @click="saveConfig">Save</el-button>
          </el-form-item>
          <el-form-item label="Auth Token">
            <el-input v-model="configForm.token" :type="showToken ? 'text' : 'password'" readonly>
              <template #append>
                <el-button @click="showToken = !showToken">
                  {{ showToken ? 'Hide' : 'Show' }}
                </el-button>
              </template>
            </el-input>
            <el-button class="ml-2" @click="resetToken">Regenerate</el-button>
          </el-form-item>
          <el-form-item label="Endpoint">
            <el-tag type="success">{{ endpoint }}</el-tag>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="log-card">
        <template #header>
          <div class="table-header">
            <div class="left">
              <template v-if="fetching">
                <el-button :loading="true" link></el-button>
              </template>
              <template v-else>
                <template v-if="running">
                  <div class="status running" :class="{ disabled: fetching }">
                    <yb-icon :svg="import('@/svg/stop2.svg?raw')" width="20" height="20" @click.stop="mcpStore.mcpStop" />
                  </div>
                  <div class="status refresh" :class="{ disabled: fetching }">
                    <yb-icon
                      :svg="import('@/svg/icon_refresh.svg?raw')"
                      width="20"
                      height="20"
                      @click.stop="mcpStore.mcpRestart"
                    />
                  </div>
                </template>
                <div v-else class="status" :class="{ disabled: fetching }">
                  <yb-icon :svg="import('@/svg/play.svg?raw')" width="20" height="20" @click.stop="mcpStore.mcpStart" />
                </div>
              </template>
            </div>
            <el-button @click.stop="cleanLog">{{ I18nT('base.clean') }}</el-button>
          </div>
        </template>
        <div class="log-area">
          <div v-for="(item, index) in logs" :key="index" class="log-line">
            <span class="log-time">{{ item.time }}</span>
            <span class="log-level" :class="item.level">{{ item.level }}</span>
            <span class="log-message">{{ item.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="empty-log">{{ I18nT('base.noData') }}</div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue'
  import { McpStore } from './mcp'
  import { I18nT } from '@lang/index'

  const mcpStore = McpStore()
  mcpStore.init()
  mcpStore.loadConfig()
  mcpStore.getIP()

  const showToken = ref(false)

  const running = computed(() => mcpStore.running)
  const fetching = computed(() => mcpStore.fetching)
  const port = computed(() => mcpStore.port)
  const ip = computed(() => mcpStore.ip)
  const ipList = computed(() => mcpStore.ipList)
  const selectedIp = computed({
    get: () => mcpStore.selectedIp,
    set: (val: string) => mcpStore.setSelectedIp(val)
  })
  const ipSelectStyle = computed(() => {
    if (running.value) {
      return {
        '--el-select-multiple-input-color': '#01cc74',
        '--el-input-text-color': '#01cc74'
      }
    }
    return null
  })
  const logs = computed(() => mcpStore.log)
  const endpoint = computed(() => `http://127.0.0.1:${mcpStore.port}/mcp`)

  const configForm = reactive({
    port: computed({
      get: () => mcpStore.port,
      set: (val: number) => {
        mcpStore.port = val
      }
    }),
    token: computed({
      get: () => mcpStore.token,
      set: (val: string) => {
        mcpStore.token = val
      }
    })
  })

  const onIpChange = (val: string) => {
    mcpStore.updateConfig({ bind: val })
  }

  const saveConfig = () => {
    mcpStore.updateConfig({ port: configForm.port, bind: selectedIp.value })
  }

  const resetToken = () => {
    const token = crypto.randomUUID()
    mcpStore.token = token
    mcpStore.updateConfig({ token })
  }

  const cleanLog = () => {
    mcpStore.log.splice(0)
  }
</script>

<style scoped>
  .mcp-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .top-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
  }
  .top-tab .title {
    font-weight: 500;
  }
  .top-tab .ip {
    color: #01cc74;
  }
  .main-block {
    flex: 1;
    overflow: auto;
    padding: 0 16px;
  }
  .config-card {
    margin-bottom: 12px;
  }
  .config-form {
    max-width: 600px;
  }
  .log-area {
    height: 350px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 13px;
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 8px;
  }
  .log-line {
    display: flex;
    gap: 8px;
    padding: 2px 0;
  }
  .log-time {
    color: #888;
    white-space: nowrap;
  }
  .log-level {
    font-weight: bold;
    min-width: 50px;
  }
  .log-level.info {
    color: #4fc1ff;
  }
  .log-level.error {
    color: #f44747;
  }
  .log-level.warn {
    color: #cca700;
  }
  .log-message {
    flex: 1;
    word-break: break-all;
  }
  .empty-log {
    color: #888;
    text-align: center;
    padding: 40px;
  }
  .status {
    cursor: pointer;
    display: flex;
    align-items: center;
    margin-right: 8px;
  }
  .status.running {
    color: #f56c6c;
  }
  .status.refresh {
    color: #409eff;
  }
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .table-header .left {
    display: flex;
    align-items: center;
  }
</style>
