<template>
  <Conf
    ref="conf"
    :type-flag="'nginx'"
    :default-file="defaultFile"
    :file="file"
    :file-ext="'conf'"
    :show-commond="true"
    @on-type-change="onTypeChange"
  >
    <template #common>
      <Common :setting="commonSetting" />
    </template>
  </Conf>
</template>

<script lang="ts" setup>
  import { computed, ref, watch, Ref, reactive } from 'vue'
  import Conf from '@/components/Conf/index.vue'
  import Common from '@/components/Conf/common.vue'
  import type { CommonSetItem } from '@/components/Conf/setup'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()
  import { debounce } from 'lodash-es'
  import { uuid } from '@/util/Index'
  import { join } from '@/util/path-browserify'

  const conf = ref()
  const commonSetting: Ref<CommonSetItem[]> = ref([])
  const file = computed(() => {
    if (window.Server.isWindows) {
      return join(window.Server.NginxDir!, 'conf/nginx.conf')
    }
    return join(window.Server.NginxDir!, 'common/conf/nginx.conf')
  })
  const defaultFile = computed(() => {
    if (window.Server.isWindows) {
      return join(window.Server.NginxDir!, 'conf/nginx.conf.default')
    }
    return join(window.Server.NginxDir!, 'common/conf/nginx.conf.default')
  })

  const names: CommonSetItem[] = [
    {
      name: 'keepalive_timeout',
      value: '60',
      enable: true,
      tips() {
        return t('apache.Timeout')
      }
    },
    {
      name: 'gzip',
      value: 'off',
      enable: true,
      options: [
        {
          value: 'off',
          label: 'off'
        },
        {
          value: 'on',
          label: 'on'
        }
      ],
      tips() {
        return t('nginx.gzip')
      }
    },
    {
      name: 'gzip_min_length',
      value: '1k',
      enable: true,
      tips() {
        return t('nginx.gzip_min_length')
      }
    },
    {
      name: 'gzip_comp_level',
      value: '2',
      enable: true,
      tips() {
        return t('nginx.gzip_comp_level')
      }
    },
    {
      name: 'client_max_body_size',
      value: '50m',
      enable: true,
      tips() {
        return t('nginx.client_max_body_size')
      }
    },
    {
      name: 'server_names_hash_bucket_size',
      value: '128',
      enable: true,
      tips() {
        return t('nginx.server_names_hash_bucket_size')
      }
    },
    {
      name: 'server_names_hash_max_size',
      value: '512',
      enable: true,
      tips() {
        return t('nginx.server_names_hash_max_size')
      }
    },
    {
      name: 'client_header_buffer_size',
      value: '32k',
      enable: true,
      tips() {
        return t('nginx.client_header_buffer_size')
      }
    },
    {
      name: 'client_body_buffer_size',
      value: '32k',
      enable: true,
      tips() {
        return t('nginx.client_body_buffer_size')
      }
    }
  ]
  let editConfig = ''
  let watcher: any

  const onSettingUpdate = () => {
    let config = editConfig.replace(/\r\n/gm, '\n')
    commonSetting.value.forEach((item) => {
      const regex = new RegExp(`^[\\s\\n#]?([\\s#]*?)${item.name}\\s+(.*?)([^\\n])(\\n|$)`, 'gm')
      if (item.enable) {
        let value = ''
        if (item.isString) {
          value = `    ${item.name} "${item.value}";`
        } else {
          value = `    ${item.name} ${item.value};`
        }
        if (regex.test(config)) {
          config = config.replace(regex, `${value}\n`)
        } else {
          config = config.replace(/http(.*?)\{(.*?)\n/g, `http {\n${value}\n`)
        }
      } else {
        config = config.replace(regex, ``)
      }
    })
    conf.value.setEditValue(config)
    editConfig = config
  }

  const getCommonSetting = () => {
    if (watcher) {
      watcher()
    }
    const config = editConfig.replace(/\r\n/gm, '\n')
    const arr = [...names].map((item) => {
      const regex = new RegExp(`^[\\s\\n]?((?!#)([\\s]*?))${item.name}(.*?)([^\\n])(\\n|$)`, 'gm')
      const matchs =
        config.match(regex)?.map((s) => {
          const sarr = s
            .trim()
            .split(' ')
            .filter((s) => !!s.trim())
          const k = sarr.shift()
          const v = sarr.join(' ').replace(';', '')
          return {
            k,
            v
          }
        }) ?? []
      console.log('getCommonSetting: ', matchs, item.name)
      const find = matchs?.find((m) => m.k === item.name)
      let value = find?.v ?? item.value
      if (item.isString) {
        value = value.replace(new RegExp(`"`, 'g'), '').replace(new RegExp(`'`, 'g'), '')
      }
      item.enable = !!find
      item.value = value
      item.key = uuid()
      return item
    })
    commonSetting.value = reactive(arr) as any
    watcher = watch(commonSetting, debounce(onSettingUpdate, 500), {
      deep: true
    })
  }

  const onTypeChange = (type: 'default' | 'common', config: string) => {
    console.log('onTypeChange: ', type, config)
    if (editConfig !== config || commonSetting.value.length === 0) {
      editConfig = config
      getCommonSetting()
    }
  }
</script>
