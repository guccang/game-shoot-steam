// 地下专属团子集中配置；稳定kind与核心键独立于显示名称。
export const MINE_SPECIALS=Object.freeze({
 crystalguard:{name:'晶盾团子',hp:105,speed:29,damage:10,range:190,windup:1.2,recover:2.1,reward:6,attack:'fan',color:'#91b8ac',height:42,width:24},
 coalspark:{name:'煤火团子',hp:78,speed:24,damage:13,range:210,windup:1.5,recover:2.4,reward:6,attack:'slam',color:'#8e8c7c',height:36,width:24},
 drill:{name:'钻头团子',hp:92,speed:40,damage:12,range:150,windup:1.1,recover:2,reward:7,attack:'charge',color:'#baa67c',height:46,width:18},
 coreking:{name:'矿心团王',hp:1400,speed:24,damage:18,range:270,windup:1.6,recover:2.6,reward:40,attack:'boss',color:'#929e8f',height:72,width:42},
});
// 每层独立晶核名称；深层循环矿物主题但保留明确层号，不能跨层代用。
export function mineCoreName(depth){return '地下'+depth+'层·'+['铜辉','银霜','熔金','紫晶','青曜','赤焰','星髓'][(depth-1)%7]+'晶核';}
// 天然栖地保留原有群落，三分之一矿点出现对应特种团子。
export function specialMineKind(terrain){if(terrain.hash%3!==0)return terrain.biome.animal;return ['crystal','stalagmite'].includes(terrain.biome.id)?'crystalguard':['spring','mushroom','moss'].includes(terrain.biome.id)?'coalspark':'drill';}
