// 调试预览只覆盖显示，真实环境、日期和统计始终按原时钟运行；弱引用不进入存档。
const previews = new WeakMap();
const keys = ['forestSeason', 'time', 'weather'];
// 取正式状态供保存与每帧逻辑使用，不携带预览选择。
export function actualEnvironment(environment) {
  return {...environment, ...previews.get(environment)?.actual};
}
// 首次选择保存实际值，后续只修改已明确选择的显示字段。
export function previewEnvironment(environment, patch) {
  let state = previews.get(environment);
  if (!state) {state = {actual: {}, selected: {}};previews.set(environment, state);}
  for (const key of keys) if (Object.hasOwn(patch, key)) {
    if (!Object.hasOwn(state.selected, key)) state.actual[key] = environment[key];
    state.selected[key] = patch[key];environment[key] = patch[key];
  }
}
// 进入自然时钟计算前恢复真实状态，防止预览天气污染天气占比。
export function beginEnvironmentTick(environment) {
  const state = previews.get(environment);if (state) Object.assign(environment, state.actual);
}
// 完成统计后重新投影预览，记录期间真实发生的换季和气候变化。
export function endEnvironmentTick(environment) {
  const state = previews.get(environment);if (!state) return;
  for (const key of Object.keys(state.selected)) state.actual[key] = environment[key];
  Object.assign(environment, state.selected);
}
// 恢复自然环境不跳时、不重置任何圆环或历史记录。
export function clearEnvironmentPreview(environment) {
  beginEnvironmentTick(environment);previews.delete(environment);
}
// 界面仅查询预览是否存在，不访问内部真实快照。
export function environmentPreviewActive(environment) {return previews.has(environment);}
