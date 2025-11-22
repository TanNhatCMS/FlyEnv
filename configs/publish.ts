import type { GithubOptions } from 'builder-util-runtime'

export const isBeta = process.env.APP_CHANNEL === 'beta' // Đặt thành true khi phát hành bản beta
export const allowBetaUpdate = process.env.ALLOW_BETA_UPDATE === 'true' // Đặt thành true để cho phép cập nhật beta

const conf: GithubOptions = {
  provider: 'github',
  owner: 'TanNhatCMS',
  repo: 'FlyEnv',
  releaseType: isBeta || allowBetaUpdate ? 'prerelease' : 'release'
}

export default conf
