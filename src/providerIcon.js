// 接口图标：按接口主键（后端字段 providers.id）取 public/ 下的固定文件名
export const providerIconSrc = (id) => (id == null || id === '' ? '' : `/avatars/${id}.png`)
