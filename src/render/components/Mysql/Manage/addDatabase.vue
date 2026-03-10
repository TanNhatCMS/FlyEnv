<template>
  <el-dialog
    v-model="show"
    :title="t('mysql.addDatabase')"
    width="600px"
    :destroy-on-close="true"
    class="host-edit new-project"
    @closed="closedFn"
  >
    <template #default>
      <div class="main-wapper">
        <el-form ref="formRef" label-position="top" :model="form" :rules="rules" @submit.prevent>
          <el-form-item :label="t('mysql.databaseName')" prop="database">
            <el-input
              v-model="form.database"
              :placeholder="t('mysql.inputDatabaseName')"
              clearable
            ></el-input>
          </el-form-item>

          <el-form-item :label="t('mysql.charset')" prop="charset">
            <el-select
              v-model="form.charset"
              :placeholder="t('mysql.inputCharset')"
              style="width: 100%"
            >
              <el-option
                v-for="charset in charsetOptions"
                :key="charset"
                :label="charset"
                :value="charset"
              ></el-option>
            </el-select>
          </el-form-item>

          <el-form-item :label="t('mysql.databaseUser')" prop="user">
            <el-input v-model="form.user" :placeholder="t('mysql.inputUser')" clearable></el-input>
          </el-form-item>

          <el-form-item :label="t('mysql.databasePassword')" prop="password">
            <el-input v-model="form.password" :placeholder="t('mysql.inputPassword')">
              <template #append>
                <el-button :icon="Refresh" @click.stop="passwordChange()"></el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #footer>
      <div class="dialog-footer">
        <el-button :disabled="running" @click="show = false">{{ t('base.cancel') }}</el-button>
        <el-button :loading="running" :disabled="running" type="primary" @click="doSave"
          >{{ t('base.confirm') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<script lang="ts" setup>
  import { ref, watch } from 'vue'
  import { AsyncComponentSetup } from '@/util/AsyncComponent'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  import { uuid } from '@/util/Index'
  import { MySQLManage } from '@/components/Mysql/Manage/manage'
  import type { ModuleInstalledItem } from '@/core/Module/ModuleInstalledItem'
  import { Refresh } from '@element-plus/icons-vue'

  const props = defineProps<{
    item: ModuleInstalledItem
  }>()

  const { show, onClosed, onSubmit, closedFn } = AsyncComponentSetup()

  const running = ref(false)
  const formRef = ref()

  const charsetOptions = ['utf8', 'utf8mb4', 'gbk', 'big5']

  const form = ref({
    database: '',
    charset: 'utf8mb4',
    user: '',
    password: uuid(16)
  })

  watch(
    () => form.value.database,
    (val) => {
      form.value.user = val
    }
  )

  // 验证规则
  const rules = {
    database: [
      { required: true, message: t('mysql.inputDatabaseName'), trigger: 'blur' },
      {
        pattern: /^[a-zA-Z][a-zA-Z0-9_]{2,63}$/,
        message: t('mysql.databaseNameFormatError'),
        trigger: 'blur'
      }
    ],
    charset: [{ required: true, message: t('mysql.inputCharset'), trigger: 'change' }],
    user: [
      { required: true, message: t('mysql.inputUser'), trigger: 'blur' },
      {
        pattern: /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/,
        message: t('mysql.userFormatError'),
        trigger: 'blur'
      }
    ],
    password: [
      { required: true, message: t('mysql.inputPassword'), trigger: 'blur' },
      { min: 3, message: t('mysql.passwordSizeError'), trigger: 'blur' },
      {
        validator: (rule: any, value: string, callback: any) => {
          const regex = /['"，。？！；：“”‘’（）【】《》￥&\u4e00-\u9fa5]+/g
          if (regex.test(value)) {
            callback(new Error(t('mysql.passwordFormatError')))
          } else {
            callback()
          }
        },
        trigger: 'blur'
      }
    ]
  }

  const passwordChange = () => {
    form.value.password = uuid(16)
  }

  const doSave = async () => {
    if (running.value) {
      return
    }
    try {
      // 验证表单
      await formRef.value.validate()
      running.value = true
      MySQLManage.addDatabase(props.item, form.value)
        .then(() => {
          show.value = false
        })
        .catch(() => {
          running.value = false
        })
    } catch {
      running.value = false
    }
  }

  defineExpose({
    show,
    onSubmit,
    onClosed
  })
</script>
