<template>
  <div class="module-config">
    <el-card class="app-base-el-card">
      <template #header>
        <span>MCP Tools Reference</span>
      </template>
      <template #default>
        <div class="tools-list">
          <div v-for="tool in tools" :key="tool.name" class="tool-item">
            <div class="tool-header">
              <el-tag type="primary">{{ tool.name }}</el-tag>
            </div>
            <div class="tool-desc">{{ tool.description }}</div>
            <div v-if="Object.keys(tool.params).length > 0" class="tool-params">
              <span class="params-label">Parameters:</span>
              <div class="params-list">
                <div v-for="(param, key) in tool.params" :key="key" class="param-item">
                  <el-tag size="small" type="info">{{ key }}</el-tag>
                  <span class="param-type">{{ param.type }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </el-card>

    <el-card class="app-base-el-card mt-4">
      <template #header>
        <span>Example Usage</span>
      </template>
      <template #default>
        <div class="example-section">
          <h4>Connect with Claude Desktop</h4>
          <pre class="code-block">
{
  "mcpServers": {
    "flyenv": {
      "url": "http://127.0.0.1:3847/sse"
    }
  }
}</pre
          >

          <h4 class="mt-4">Connect with curl</h4>
          <pre class="code-block">
# Start SSE connection
curl -N http://127.0.0.1:3847/sse

# Send tool call
curl -X POST http://127.0.0.1:3847/messages?clientId=YOUR_CLIENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "flyenv_list_services",
      "arguments": {}
    },
    "id": 1
  }'</pre
          >
        </div>
      </template>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
  const tools = [
    {
      name: 'flyenv_list_services',
      description: 'List all available FlyEnv services and their current status',
      params: {}
    },
    {
      name: 'flyenv_start_service',
      description: 'Start a FlyEnv service (e.g., nginx, mysql, php, redis)',
      params: {
        service: { type: 'string', description: 'Service name' }
      }
    },
    {
      name: 'flyenv_stop_service',
      description: 'Stop a running FlyEnv service',
      params: {
        service: { type: 'string', description: 'Service name' }
      }
    },
    {
      name: 'flyenv_get_service_status',
      description: 'Get detailed status of a specific service',
      params: {
        service: { type: 'string', description: 'Service name' }
      }
    },
    {
      name: 'flyenv_list_versions',
      description: 'List installed versions for a service',
      params: {
        service: { type: 'string', description: 'Service name' }
      }
    },
    {
      name: 'flyenv_get_config',
      description: 'Get configuration file path for a service',
      params: {
        service: { type: 'string', description: 'Service name' }
      }
    },
    {
      name: 'flyenv_get_logs',
      description: 'Get recent log entries for a service',
      params: {
        service: { type: 'string', description: 'Service name' },
        lines: { type: 'number', description: 'Number of lines (default: 100)' }
      }
    },
    {
      name: 'flyenv_get_system_info',
      description: 'Get FlyEnv system information',
      params: {}
    }
  ]
</script>

<style scoped>
  .tools-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .tool-item {
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }
  .tool-header {
    margin-bottom: 8px;
  }
  .tool-desc {
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }
  .tool-params {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
  .params-label {
    font-weight: 500;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .params-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }
  .param-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .param-type {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .code-block {
    background: var(--el-fill-color-light);
    padding: 12px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    overflow-x: auto;
  }
  .example-section h4 {
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
  }
</style>
