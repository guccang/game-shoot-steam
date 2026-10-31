// 怪物受击姿态按稳定物种分类，角度只控制局部关节，不参与伤害或冲量计算。
const PROFILES=Object.freeze({
 round:Object.freeze({id:'round',roll:true,lean:0}),
 armored:Object.freeze({id:'armored',roll:false,lean:.12}),
 rooted:Object.freeze({id:'rooted',roll:false,lean:.18}),
 wheeled:Object.freeze({id:'wheeled',roll:false,lean:.07}),
 flying:Object.freeze({id:'flying',roll:false,lean:0}),
});
const SPECIES=Object.freeze({'ironwood-bulwark':'armored','spore-spitter':'rooted','acorn-slinger':'rooted',
 'reed-archer':'rooted','stump-bombard':'rooted','bramble-buggy':'wheeled','leaf-bat':'flying'});
// 默认团怪的实体没有 species；未知具名物种保守采用站立姿态，不自动获得翻滚。
export function monsterHitProfile(body){
 if(body.type==='boss')return PROFILES.rooted;
 if(SPECIES[body.species])return PROFILES[SPECIES[body.species]];
 if(body.flying)return PROFILES.flying;
 return !body.species||body.species==='slime'?PROFILES.round:PROFILES.rooted;
}
