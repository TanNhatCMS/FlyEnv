<template>
  <div class="w-full h-full overflow-hidden flex flex-col gap-2 items-start">
    <template v-if="PodmanManager.dockerComposeExists">
      <div class="flex items-center">
        <el-button size="small" class="flex-shrink-0" @click="addCompose(undefined)">
          {{ t('base.add') }}
        </el-button>
        <el-button size="small" class="flex-shrink-0" @click="buildCompose()">
          {{ t('podman.Build') }}
        </el-button>
      </div>
      <el-table
        border
        class="flex-1 overflow-hidden"
        show-overflow-tooltip
        :data="composeList"
        style="width: 100%"
      >
        <el-table-column prop="name" :label="t('base.name')" width="160" />
        <el-table-column prop="flag" :label="t('host.projectName')" width="160" />
        <el-table-column prop="path" :label="t('base.path')">
          <template #default="scope">
            <span class="truncate hover:text-yellow-500 cursor-pointer">{{
              scope.row.paths.join(' ')
            }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="comment" :label="t('host.comment')"></el-table-column>
        <el-table-column prop="running" :label="t('podman.Status')" width="110" align="center">
          <template #default="scope">
            <template v-if="scope.row?.statusError">
              <el-tooltip :content="scope.row?.statusError">
                <Warning class="w-[21px] h-[21px] text-yellow-500" />
              </el-tooltip>
            </template>
            <template v-else-if="scope.row?.running">
              <el-button loading link></el-button>
            </template>
            <template v-else-if="scope.row.run">
              <div class="service status running" :class="{ disabled: scope.row.running }">
                <yb-icon
                  class="w-[21px] h-[21px]"
                  :svg="import('@/svg/stop2.svg?raw')"
                  @click.stop="scope.row.stop()"
                />
              </div>
            </template>
            <template v-else>
              <div class="service status" :class="{ disabled: scope.row.running }">
                <yb-icon
                  class="w-[21px] h-[21px]"
                  :svg="import('@/svg/play.svg?raw')"
                  @click.stop="scope.row.start()"
                />
              </div>
            </template>
          </template>
        </el-table-column>
        <el-table-column :label="t('podman.Action')" width="100" align="center">
          <template #default="scope">
            <el-dropdown>
              <template #default>
                <el-button link class="status">
                  <yb-icon :svg="import('@/svg/more1.svg?raw')" width="22" height="22" />
                </el-button>
              </template>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="scope.row.run" @click.stop="scope.row.stopWithTerminal()">
                    {{ t('podman.StopWithTerminal') }}
                  </el-dropdown-item>
                  <el-dropdown-item v-else @click.stop="scope.row.startWithTerminal()">
                    {{ t('podman.StartWithTerminal') }}
                  </el-dropdown-item>
                  <el-dropdown-item @click.stop="scope.row.showLogsWithTerminal()">
                    {{ t('base.log') }}
                  </el-dropdown-item>
                  <el-dropdown-item @click.stop="addCompose(scope.row)">
                    {{ t('base.edit') }}
                  </el-dropdown-item>
                  <template v-for="(f, _i) in scope.row.paths" :key="_i">
                    <el-dropdown-item @click.stop="toEditFile(f)">
                      {{ t('base.edit') }} {{ basename(f) }}
                    </el-dropdown-item>
                  </template>
                  <el-dropdown-item @click.stop="removeCompose(scope.row)">
                    {{ t('podman.Delete') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-else>
      <div class="w-full h-full p-8 flex flex-col justify-center items-center gap-7">
        <div>{{ t('podman.DockerComposeNoExistsTips') }}</div>
        <el-button v-if="isNoWindows" type="primary" @click.stop="doInstallDockerCompose">
          <template #default>
            <span>{{ t('podman.DockerComposeInstallButton') }}</span>
            <template v-if="PodmanManager.dockerComposeInstalling">
              <el-button class="ml-2" link loading></el-button>
            </template>
          </template>
        </el-button>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted } from 'vue'
  import { PodmanManager } from '@/components/Podman/class/Podman'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()
  import type { Compose } from '@/components/Podman/class/Compose'
  import { AsyncComponentShow } from '@/util/AsyncComponent'
  import { Warning } from '@element-plus/icons-vue'
  import { basename } from '@/util/path-browserify'

  const isNoWindows = computed(() => {
    return !window.Server.isWindows
  })

  const composeList = computed<Compose[]>(() => PodmanManager.compose ?? [])

  function removeCompose(compose: Compose) {
    PodmanManager.removeCompose(compose)
  }

  const doInstallDockerCompose = () => {
    PodmanManager.installDockerCompose()
  }

  let ComposeAddVM: any
  import('./composeAdd.vue').then((res) => {
    ComposeAddVM = res.default
  })

  function addCompose(item?: Compose) {
    AsyncComponentShow(ComposeAddVM, {
      item
    }).then()
  }

  let ComposeBuildVM: any
  import('./composeBuild.vue').then((res) => {
    ComposeBuildVM = res.default
  })

  function buildCompose() {
    AsyncComponentShow(ComposeBuildVM).then()
  }

  const refreshState = () => {
    composeList.value.forEach((item) => {
      item.checkRunningStatus()
    })
  }

  let ConfigVM: any
  import('../config.vue').then((res) => {
    ConfigVM = res.default
  })

  const toEditFile = (file: string) => {
    AsyncComponentShow(ConfigVM, {
      file
    }).then()
  }

  PodmanManager.checkIsComposeExists()

  onMounted(() => {
    refreshState()
  })
</script>
