// 地下快捷工具沿用种植图标的28像素尺寸，独立SVG轮廓不烘焙按钮状态或文字。
const shapes={
 pick:'<path d="M10 7 21 24" stroke="#b58d59" stroke-width="4"/><path d="M3 12Q9 0 22 4L26 10 18 7 10 8Z" fill="#bdcbb0"/>',
 rail:'<path d="M7 2 4 27M22 2 25 27" stroke="#667e69" stroke-width="3"/><path d="M5 7H24M4 15H25M3 23H26" stroke="#ac8f61" stroke-width="4"/>',
 cart:'<path d="M3 6H26L23 21H6Z" fill="#b4c295"/><path d="M6 10H23"/><circle cx="8" cy="24" r="3" fill="#839c80"/><circle cx="21" cy="24" r="3" fill="#839c80"/>',
 lamp:'<path d="M10 7V4Q14 0 18 4V7"/><rect x="6" y="7" width="16" height="18" rx="4" fill="#e8c87e"/><path d="M9 10H19L18 21H10Z" fill="#fff0b6"/>',
 sign:'<path d="M14 9V27" stroke="#ae8d5c" stroke-width="4"/><path d="M3 3H21L27 10 21 17H3Z" fill="#e7cf96"/><path d="M9 10H20M17 7 20 10 17 13"/>',
 shaft:'<path d="M5 26V10M23 26V10M5 17H23M5 24H23" stroke="#a78c60" stroke-width="3"/><path d="M14 18V2M8 8 14 2 20 8" stroke="#486d4c" stroke-width="3"/>'
};
// 仅接受固定工具ID，图形装饰交给按钮的中文无障碍名称描述。
export function mineToolIcon(id){return `<svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="#365b47" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes[id]||''}</svg>`;}
export const MINE_TOOLS=[['pick','矿镐'],['rail','铺轨'],['cart','造矿车'],['lamp','矿灯'],['sign','路牌'],['shaft','向上挖']];
