import type { GithubOptions } from 'builder-util-runtime'
import pkg from '../package.json'

const isBeta = false // Đặt thành true khi phát hành bản beta
const allowBetaUpdate = false // Đặt thành true để cho phép cập nhật beta

const conf: GithubOptions & { version: string; isBeta: boolean; allowBetaUpdate: boolean } = {
  provider: 'github',
  owner: 'TanNhatCMS',
  repo: 'FlyEnv',
  releaseType: isBeta || allowBetaUpdate ? 'prerelease' : 'release',
  version: pkg.version,
  isBeta,
  allowBetaUpdate
}

export default conf
