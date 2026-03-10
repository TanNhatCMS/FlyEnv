<template>
  <div class="w-full h-full overflow-hidden app-podman-dashboard">
    <el-scrollbar>
      <el-descriptions
        v-if="info"
        class="w-full overflow-hidden"
        label-width="50%"
        border
        :column="2"
        direction="vertical"
      >
        <el-descriptions-item class-name="w-[50%] overflow-hidden" :label="t('podman.Machine')">
          {{ info.Name }}
        </el-descriptions-item>
        <el-descriptions-item class-name="w-[50%] overflow-hidden" :label="t('podman.State')">
          {{ info.State }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.CPU')">
          {{ info.Resources?.CPUs }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.Memory')">
          {{ info.Resources?.Memory }} MB
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.DiskSize')">
          {{ info.Resources?.DiskSize }} MB
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.rootful')">
          {{ info.Rootful ? t('podman.yes') : t('podman.no') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.userModeNetworking')">
          {{ info.UserModeNetworking ? t('podman.yes') : t('podman.no') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.rosetta')">
          {{ info.Rosetta ? t('podman.yes') : t('podman.no') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.Created')"
          >{{ info.Created }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.LastUp')">
          {{ info.LastUp }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.identityPath')">
          {{ info.SSHConfig?.IdentityPath }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.remoteUsername')">
          {{ info.SSHConfig?.RemoteUsername }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.SSHPort')">
          {{ info.SSHConfig?.Port }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('podman.PodmanSocket')">
          {{ info.ConnectionInfo?.PodmanSocket?.Path }}
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else :description="t('podman.machineIsEmpty')" />
    </el-scrollbar>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { PodmanManager } from '@/components/Podman/class/Podman'
  import type { MachineItemType } from '@/components/Podman/type'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const machine = computed(() => {
    return PodmanManager.machine.find((m) => m.name === PodmanManager.tab)
  })

  const info = computed<MachineItemType | undefined>(() => {
    return machine?.value?.info
  })
</script>
<style lang="scss">
  .app-podman-dashboard {
    .el-descriptions {
      width: 100%;
      overflow: hidden;

      .el-descriptions__body {
        width: 100%;
        overflow: hidden;

        .el-descriptions__table {
          width: 100%;
          overflow: hidden;

          > tbody {
            width: 100%;
            overflow: hidden;

            > tr {
              width: 100%;
              overflow: hidden;

              > th,
              > td {
                width: 50%;
                overflow: hidden;
                white-space: pre-wrap;
                word-break: break-word;
              }
            }
          }
        }
      }
    }
  }
</style>
