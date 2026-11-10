// 营地管理与布局编辑器共用同级导航，稳定标识不依赖中文文案。
export const CAMP_MANAGEMENT_TABS=[['style','外观'],['shop','装饰铺'],['owned','我的装饰'],['layout','营地布局']];
// 所有入口保持相同顺序和选中反馈，手机窄屏由共用样式换行。
export function campManagementTabs(selected){return `<nav class="camp-manager-tabs camp-manager-primary-tabs" aria-label="营地管理分类">${CAMP_MANAGEMENT_TABS.map(([id,label])=>`<button type="button" class="ui-button" data-manager-tab="${id}" aria-pressed="${selected===id}">${label}</button>`).join('')}</nav>`;}
