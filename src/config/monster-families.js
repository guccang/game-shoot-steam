// 营地家族按领主登记；稳定物种编号与兵种行为分离，后续家族在此扩展而不覆盖团子。
export const MONSTER_FAMILIES=Object.freeze({
 dumpling:Object.freeze({name:'团子营地',lord:'dumpling',members:Object.freeze(['slime','leaf-bat','spore-spitter','acorn-slinger','reed-archer','bramble-buggy','stump-bombard','ironwood-bulwark'])})
});

// 普通团子按三个体型命名，稳定编号、地区属性和特色兵种名称保持独立。
export function dumplingSizeName(rank=0){return ['小团子','中团子','大团子'][Math.max(0,Math.min(2,rank))]||'小团子';}
