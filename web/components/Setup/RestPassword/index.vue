<template>
  <div class="plant-title">{{ $t('base.resetPassword') }}</div>
  <div class="main reset-pass">
    <el-input
      v-if="show"
      v-model="password"
      type="text"
      placeholder="Please input password"
      readonly
    />
    <el-input
      v-else
      v-model="password"
      type="password"
      placeholder="Please input password"
      readonly
    />
    <el-button-group>
      <el-button @click="doShow">
        <yb-icon v-if="show" :svg="import('@/svg/eye.svg?raw')" :width="15" :height="15"></yb-icon>
        <yb-icon v-else :svg="import('@/svg/eye-slash.svg?raw')" :width="15" :height="15"></yb-icon>
      </el-button>
      <el-button @click="resetPassword">
        <yb-icon :svg="import('@/svg/icon_refresh.svg?raw')" :width="15" :height="15"></yb-icon>
      </el-button>
    </el-button-group>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { ElMessageBox } from 'element-plus'
  import { AppStore } from '@web/store/app'
  import { waitTime } from '@web/fn'
  export default defineComponent({
    components: {},
    props: {},
    data() {
      return {
        show: false
      }
    },
    computed: {
      password() {
        return AppStore().config.password
      }
    },
    methods: {
      doShow() {
        if (!this.show) {
          ElMessageBox.prompt(this.$t('base.inputPassword'), {
            confirmButtonText: this.$t('base.confirm'),
            cancelButtonText: this.$t('base.cancel'),
            inputType: 'password',
            customClass: 'password-prompt',
            beforeClose: (action, instance, done) => {
              if (action === 'confirm') {
                // Remove trim, as some computers have passwords with spaces...
                if (instance.inputValue) {
                  waitTime().then(() => {
                    done && done()
                    this.show = true
                  })
                }
              } else {
                done()
              }
            }
          })
            .then(() => {})
            .catch((err) => {
              console.log('err: ', err)
            })
        } else {
          this.show = false
        }
      },
      resetPassword() {
        ElMessageBox.prompt(this.$t('base.inputPassword'), {
          confirmButtonText: this.$t('base.confirm'),
          cancelButtonText: this.$t('base.cancel'),
          inputType: 'password',
          customClass: 'password-prompt',
          beforeClose: (action, instance, done) => {
            if (action === 'confirm') {
              // Remove trim, as some computers have passwords with spaces...
              if (instance.inputValue) {
                waitTime().then(() => {
                  done && done()
                  this.show = true
                })
              }
            } else {
              done()
            }
          }
        })
          .then(() => {})
          .catch((err) => {
            console.log('err: ', err)
          })
      }
    }
  })
</script>
