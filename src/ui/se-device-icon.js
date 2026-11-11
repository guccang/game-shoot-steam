// 随车面板与驾驶 HUD 共用装置图形，名称由相邻文字或按钮读屏说明提供。
const shapes={
 autopilot:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="m4 9 6 2m10-2-6 2m-2 3v6"/>',
 combat:'<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
 flare:'<path d="m6 19 3-5m-5 1 3-4m7-8v2m5 1-2 2m4 3h-3"/><circle cx="12" cy="10" r="3"/>',
 rocket:'<path d="M8 14c2-6 5-10 12-10 0 7-4 11-10 13l-2-3Zm3-5-5 1-2 4 4-1m7 3-1 4-4 1 1-4m-4 0-3 3"/><circle cx="15" cy="9" r="1.5"/>',
 shield:'<path d="M12 3 20 6v5c0 4-3 8-8 10-5-2-8-6-8-10V6l8-3Z"/><path d="m8 12 3 3 5-6"/>'
};
// 输出同一枚圆形徽记，装置类型决定图形和配色。
export function seDeviceIcon(key){
 return '<span class="vehicle-mode-icon" data-mode="'+key+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+shapes[key]+'</svg></span>';
}
