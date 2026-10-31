// 无环境依赖的数值工具，供规则与绘制共同使用。
// 限制数值范围，避免异常存档或动画比例越界。
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
