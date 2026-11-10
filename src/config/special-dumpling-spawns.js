// 普通林区与战斗编成的地貌团子配额；不增加原有怪物总数。
import {BIOME_DUMPLINGS} from './biome-dumplings.js';
import {regionalDumpling} from '../world/dumpling-habitats.js';
export const SPECIAL_DUMPLING_QUOTAS=Object.freeze({field:{every:12,offset:0,alive:2},clearing:{every:6,offset:3,alive:3},horde:{every:5,offset:0,alive:4}});
const land=BIOME_DUMPLINGS.filter(p=>p.habitat!=='lake');
// 同区优先本地种类，无特殊地貌时轮换陆生变体，水团不进入陆地名额。
export function mixedDumpling(point,ordinal,mode,enemies=[],random=null){
 const q=SPECIAL_DUMPLING_QUOTAS[mode];if(!q||ordinal<=0||ordinal%q.every!==q.offset||enemies.filter(e=>e.hp>0&&e.dumplingVariant).length>=q.alive)return null;
 const index=random?Math.floor(Math.max(0,Math.min(.999999,random()))*land.length):Math.floor((ordinal-q.offset)/q.every);
 const local=regionalDumpling(point,index);return local?.habitat!=='lake'&&local?local:land[index%land.length];
}
