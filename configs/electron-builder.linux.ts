import type { Configuration } from 'electron-builder'
import AfterPack from '../build/afterPack'
import PublishConfig from './publish'

const desktop: any = {
  Name: 'FlyEnv',
  Comment: 'All-In-One Full-Stack Environment Management Tool',
  Exec: '--no-sandbox %U',
  Icon: 'com.xpf0000.flyenv',
  Terminal: false,
  StartupNotify: true,
  Type: 'Application',
  Categories: 'Development;Utility;'
}

const conf: Configuration = {
  productName: 'FlyEnv',
  executableName: 'FlyEnv',
  buildVersion: '4.11.1',
  electronVersion: '35.7.5',
  appId: 'com.xpf0000.flyenv',
  asar: true,
  npmRebuild: false,
  directories: {
    output: 'release'
  },
  files: [
    'dist/electron/**/*',
    'dist/render/**/*',
    '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme,LICENSE}',
    '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
    '!**/node_modules/*.d.ts',
    '!**/node_modules/.bin',
    '!**/node_modules/node-pty/build/node_gyp_bins',
    '!**/node_modules/nodejieba/dict'
  ],
  deb: {
    packageName: 'flyenv'
  },
  rpm: {
    packageName: 'flyenv'
  },
  artifactName: '${productName}-${version}.${ext}', // 自定义打包文件名格式
  linux: {
    icon: 'build/icons',
    asarUnpack: ['**/*.node'],
    category: 'Development',
    packageCategory: 'Development',
    desktop: {
      entry: desktop
    },
    target: [
      {
        target: 'deb'
      },
      {
        target: 'rpm'
      }
    ]
  },
  afterPack: (...args) => {
    return AfterPack(...args) as any
  },
  publish: [PublishConfig]
}

export default conf
