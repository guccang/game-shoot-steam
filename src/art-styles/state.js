// 风格选择属于显示偏好；仅保存稳定ID，不读取或修改游戏进度。
import {playerStorage} from '../platform/player-profile.js';
export const ART_STYLE_KEY='forest-art-style-v1';
export const ART_STYLES=Object.freeze([{id:'classic',name:'原版森林'},{id:'clear',name:'清澈卡通'}]);
let current='clear';
try{const saved=playerStorage().getItem(ART_STYLE_KEY);if(ART_STYLES.some(s=>s.id===saved))current=saved;}catch{}
const listeners=new Set();
// 正式绘制入口在调用时读取风格，连续动作仍使用调用方的原参数。
export function artStyle(){return current;}
// 监听显示资源更换；返回注销函数，避免应用重复装配遗留监听。
export function onArtStyleChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
// 资源预载成功后才提交选择，失败的风格不进入正式绘制。
export function commitArtStyle(id){
 if(!ART_STYLES.some(s=>s.id===id))throw Error('未知美术风格');
 if(id===current)return false;current=id;for(const listener of listeners)listener(id);return true;
}
// 按需保存显示偏好，存储受限时允许本次切换并明确提示不能记忆。
export function persistArtStyle(id){try{playerStorage().setItem(ART_STYLE_KEY,id);return true;}catch{return false;}}
