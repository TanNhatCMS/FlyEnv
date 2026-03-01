<template>
  <template v-if="MacPortsSetup.installing">
    <div class="w-full h-full overflow-hidden p-5">
      <div ref="xtermDom" class="w-full h-full overflow-hidden"></div>
    </div>
  </template>
  <el-table v-else v-loading="fetching" height="100%" :data="tableData" style="width: 100%">
    <el-table-column prop="name" class-name="name-cell-td" :label="t('base.name')">
      <template #header>
        <div class="w-full name-cell">
          <span style="display: inline-flex; padding: 2px 0">{{ t('base.name') }}</span>
          <el-input
            v-model.trim="search"
            :placeholder="t('base.placeholderSearch')"
            clearable
          ></el-input>
        </div>
      </template>
      <template #default="scope">
        <div style="padding: 2px 0 2px 24px">{{ scope.row.name }}</div>
      </template>
    </el-table-column>
    <el-table-column align="center" :label="t('base.status')">
      <template #default="scope">
        <div class="cell-status">
          <yb-icon
            v-if="scope.row.status"
            :svg="import('@/svg/ok.svg?raw')"
            class="installed"
          ></yb-icon>
        </div>
      </template>
    </el-table-column>

    <el-table-column width="150px" align="left" :label="t('base.action')" class-name="operation">
      <template v-if="version?.version" #default="scope">
        <template v-if="scope.row.status">
          <el-popover :show-after="600" placement="top" width="auto">
            <template #default>
              <span>{{ t('base.copyLink') }}</span>
            </template>
            <template #reference>
              <el-button type="primary" link :icon="Link" @click="copyLink(scope.row)"></el-button>
            </template>
          </el-popover>
          <template v-if="scope.row.name === 'xdebug'">
            <el-popover :show-after="600" placement="top" width="auto">
              <template #default>
                <span>{{ t('php.copyConfTemplate') }}</span>
              </template>
              <template #reference>
                <el-button
                  type="primary"
                  link
                  :icon="Document"
                  @click="copyXDebugTmpl(scope.row)"
                ></el-button>
              </template>
            </el-popover>
          </template>
          <el-popover :show-after="600" placement="top" width="auto">
            <template #default>
              <span>{{ t('base.del') }}</span>
            </template>
            <template #reference>
              <el-button type="primary" link :icon="Delete" @click="doDel(scope.row)"></el-button>
            </template>
          </el-popover>
        </template>
        <template v-else>
          <el-popover :show-after="600" placement="top" width="auto">
            <template #default>
              <span>{{ t('base.install') }}</span>
            </template>
            <template #reference>
              <el-button
                :disabled="MacPortsSetup.installing"
                type="primary"
                link
                :icon="Download"
                @click="handleEdit(scope.row)"
              ></el-button>
            </template>
          </el-popover>
        </template>
      </template>
    </el-table-column>
  </el-table>
</template>

<script lang="ts" setup>
  import { type SoftInstalled } from '@/store/brew'
  import { MacPortsSetup, Setup } from './setup'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()
  import { Link, Document, Download, Delete } from '@element-plus/icons-vue'

  const props = defineProps<{
    version: SoftInstalled
  }>()

  const { tableData, handleEdit, xtermDom, copyLink, copyXDebugTmpl, search, doDel, fetching } =
    Setup(props.version)
</script>
