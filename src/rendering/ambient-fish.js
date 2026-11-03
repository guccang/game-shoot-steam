// 常态游鱼复用正式鱼体，绘制在水域之上、桥梁与角色之下。
import {FISH_SPECIES} from '../config/outdoors.js';
import {drawOutdoorFish} from './outdoors.js';
import {surfaceAmbientFish,mineAmbientFish} from '../world/ambient-fish.js';
// 有界鱼群使用正式时钟，暂停和减少动态不会偷偷推进路径或鱼尾。
export function drawAmbientFish(c,game,view,reduced=false,night=0,layer=null){
 const time=reduced?0:(layer?.age??game.time),fish=layer?mineAmbientFish(layer,view,time):!game.realm&&!game.story&&!game.cottage?surfaceAmbientFish(game.mapId,view,time):[];
 c.save();for(const f of fish){c.globalAlpha=night>.3?.7:.78;drawOutdoorFish(c,f.x,f.y,f.angle,f.clock,FISH_SPECIES[f.species].color,f.small?.65:.82,FISH_SPECIES[f.species]);}
 c.restore();return fish;
}
