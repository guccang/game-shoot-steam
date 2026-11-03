// 百种幻想湖鱼目录；每行顺序与ID固定，旧有三种鱼保持原ID和经济数值。
export const FISH_RARITIES=['常见','少见','稀有','珍奇','传说'];
export const FISH_WATERS={forest:'森林湖泊',jiuzhaigou:'湖谷湖泊',mine:'地下水域'};
const families=[
 ['scale','鳞鱼','all','bait','shrimp',14,6,'宽圆躯干和短背鳍，喜欢在浅水植物旁觅食。','银鳞鲫鱼 青背鲈鱼 金鳍鲤鱼 芦花鳊鱼 柳叶鲮鱼 红尾鲴鱼 青玉鲤鱼 琥珀鳞鱼 月纹锦鲤 晨曦龙鲤'],
 ['stream','溪鱼','forest','worm','insect',15,4,'修长流线身体和分叉尾鳍，常在入湖溪流处逆流游动。','溪纹鲦鱼 石斑溪鱼 柳梢白鱼 赤鳍溪鱼 竹影马口 银线溪鱼 风纹鳟鱼 金线溪鱼 云瀑鳟鱼 逐风银梭'],
 ['leaf','叶鱼','forest','algae','bait',11,8,'侧扁的叶片形身体与展开的背鳍，习惯躲在水草之间。','浮萍叶鱼 苔背叶鱼 草纹叶鱼 青荷叶鱼 蕨影叶鱼 翠羽叶鱼 红枫叶鱼 银杏叶鱼 翡翠莲鱼 森灵冠鱼'],
 ['whisker','须鱼','forest','worm','shrimp',14,5,'宽头、细须和低背鳍，沿泥沙底部探寻食物。','泥须鲶鱼 短须塘鱼 溪底胡鱼 黑纹须鱼 石须鲶鱼 金须塘鱼 玉须鲶鱼 长须隐鱼 银须老鱼 古木龙须'],
 ['pearl','珠鱼','jiuzhaigou','shrimp','bait',10,8,'圆润短躯干与扇形尾鳍，身侧珠点在清水里显眼。','泉珠圆鱼 白沙珠鱼 碧潭珠鱼 桃鳃珠鱼 银点珠鱼 琉璃珠鱼 珊纹珠鱼 月露珠鱼 星泪珠鱼 天池明珠'],
 ['sail','帆鱼','jiuzhaigou','insect','shrimp',13,6,'高耸的帆状背鳍与尖头，擅长在开阔水面突然加速。','小帆湖鱼 碧帆湖鱼 芦帆鱼 蓝纹帆鱼 朱帆鱼 琥珀帆鱼 彩霞帆鱼 银月帆鱼 云海帆鱼 九彩云帆'],
 ['ribbon','带鱼','jiuzhaigou','algae','worm',17,3,'细长带状身体与低矮长鳍，喜欢在沉木附近缓慢巡游。','青带湖鱼 细纹带鱼 白练湖鱼 草带湖鱼 赤线带鱼 蓝绸湖鱼 银绦湖鱼 彩带湖鱼 月绸湖鱼 流光长绫'],
 ['cave','洞鱼','mine','glow','worm',13,5,'小眼与浅色鳞片适应昏暗洞穴，依靠水流寻找食物。','灰眼洞鱼 白鳍洞鱼 石纹盲鱼 苔须洞鱼 青石洞鱼 玉骨洞鱼 银晶洞鱼 黑曜洞鱼 月魄洞鱼 地心玉龙'],
 ['lantern','灯鱼','mine','glow','insect',11,7,'额前短触须和点状亮斑，使它在地下水中容易辨认。','微光灯鱼 萤点灯鱼 菌火灯鱼 蓝烛灯鱼 金星灯鱼 紫露灯鱼 水晶灯鱼 星河灯鱼 极光灯鱼 永夜星灯'],
 ['armor','甲鱼','mine','shrimp','glow',13,7,'硬质背甲和锯齿状背鳍保护身体，常沿岩壁活动。','砾背甲鱼 岩纹甲鱼 铜斑甲鱼 铁鳍甲鱼 青晶甲鱼 银盾甲鱼 赤金甲鱼 黑晶甲鱼 钻纹甲鱼 深渊王甲']
];
const colors=['#b7c8a3','#749c81','#d9a653','#94b5b3','#a8bdcc','#cfab9c','#a5b77e','#cabca4','#b8add0','#dccb91'];
// 一百条完整玩法配置由固定目录构成，体长不再依赖目录索引。
export const FISH_SPECIES=families.flatMap(([family,label,water,bait,second,bodyLength,bodyHeight,description,names],group)=>names.split(' ').map((name,j)=>{
 const legacy=group===0&&j<3,tier=legacy?1:Math.floor(j/2)+1;
 const id=legacy?['crucian','perch','carp'][j]:`${family}-${j+1}`;
 return {id,name,family,familyName:label,tier,rarity:FISH_RARITIES[tier-1],waters:water==='all'?Object.keys(FISH_WATERS):[water],favoriteBait:legacy?['bait','shrimp','bait'][j]:j%2?second:bait,
  color:legacy?['#c0cbb3','#749c81','#d9a653'][j]:colors[(group+j)%colors.length],bodyLength,bodyHeight,pattern:j%3,fin:family==='armor'?2:group%4,whiskers:family==='whisker'||family==='cave',lure:family==='lantern',
  mass:legacy?[.35,.65,1.1][j]:Math.round((.12+tier*.18+group*.025+j*.025)*100)/100,
  coins:legacy?[12,22,36][j]:8+tier*tier*12+group*3+j*2,strength:legacy?[.8,1,1.2][j]:.65+tier*.2+group*.025,
  minSize:legacy?18+j*9:12+tier*5+group,maxSize:legacy?43+j*9:28+tier*8+group,
  habitat:water==='all'?'森林、湖谷与地下湖岸':FISH_WATERS[water],description:`${name}属于${label}。${description}${tier>=4?'数量稀少，适合使用高阶鱼竿和偏好的鱼饵寻找。':'成群活动时可在湖面直接观察到身影。'}`,
  tip:'浮漂明显下沉时扬竿；张力升高就松线，并向逃窜的反方向控竿。'};
}));
const naturalPools=Object.fromEntries(Object.keys(FISH_WATERS).map(water=>{const entries=FISH_SPECIES.map((fish,index)=>({fish,index})).filter(e=>e.fish.waters.includes(water)),weights=[100,45,18,5,1];return [water,{entries,total:entries.reduce((s,e)=>s+weights[e.fish.tier-1],0),weights}];}));
// 常态鱼群按栖地和自然稀有度抽样，与玩家携带的装备无关。
export function naturalFishIndex(water,seed){const {entries,weights,total}=naturalPools[water];let point=((seed>>>0)%100000)/100000*total;for(const e of entries){point-=weights[e.fish.tier-1];if(point<0)return e.index;}return entries.at(-1).index;}
