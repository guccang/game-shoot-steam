import {GAMEPLAY_VALUES} from './gameplay-values.js';
// 红狼铭牌识别的传奇工坊；高阶枪械与外观设计使用独立配置，不抬高其他成长上限。
export const LEGENDARY_WORKSHOP={x:4600,y:1600,mapId:'forest',radius:150,arrival:{x:4600,y:1730},weaponMax:30,normalMax:20};
export const LEGENDARY_STORY={title:'留给归来者的炉火',paragraphs:[
 '苔轮拆开红狼的旧电台时，发现一块刻着狼爪的铜铭牌。背面没有军令，只有赤榛的字迹：“如果有一天你能带它走得更远，就去山脊另一边。那里还有一盏为归来者留着的灯。”',
 '那是旧巡林队的传奇工坊。暴雨撤离之后，重车班把最后的图纸、调色罐和锻造炉藏进林间。隐蔽装置只回应红狼铭牌中的旧信号；旁人驶过，看到的仍是一片安静的草地。',
 '红狼停在门前，炉火终于重新亮起。工作台上压着一张开花的窗，旁边写着：“我们造车，是为了把伙伴带回家。至于远方的路，留给后来的人自己画。”',
 '从这里起，营地之外不再只有一张委托单。你可以选择自己的远行方向，积攒材料锻造武器，也可以给战车留下属于你的颜色。传奇并没有结束，它把下一段路交给了你。'
]};
export const TANK_PAINTS=[{name:'原厂',color:null},{name:'赤榛红',color:'#b45a49'},{name:'松林绿',color:'#698a66'},{name:'湖湾蓝',color:'#669caa'},{name:'麦穗金',color:'#c5a15e'},{name:'暮色紫',color:'#8a789c'}];
export const TANK_BADGES=['原厂狼徽','归途星','幼芽'];
// 高阶升级不受普通价格封顶或追赶折扣影响，所有入口共用同一报价。
export function legendaryUpgradeCost(kind,level,part=null){
 if(kind!=='weapons'||part&&part!=='damage'||level<20)return null;
 const step=Math.max(0,Math.min(9,Math.floor(level)-20)),factor=1.32**step;
 return {coins:Math.ceil(25000*factor/100)*100,wood:Math.ceil(10000*factor/100)*100};
}
// 旧存档缺省锁定；只有明确解锁的永久档可以突破枪械主等级。
export function equipmentLevelCap(progress,kind){return kind==='weapons'&&progress?.legendaryWorkshop?.unlocked===true?30:GAMEPLAY_VALUES.progress.maxEquipmentLevel;}
// 外观选项只接受有限目录编号，不能注入颜色字符串或越过部件目录。
export function normalizeTankDesign(raw={}){return Object.fromEntries(['hull','turret','tracks','badge'].map(key=>[key,Number.isInteger(raw[key])&&raw[key]>=0&&raw[key]<(key==='badge'?TANK_BADGES.length:TANK_PAINTS.length)?raw[key]:0]));}
// 最多保留三份外观方案；车体只开放已有重型坦克与红狼，不改战斗部件。
export function normalizeLegendaryWorkshop(raw){const unlocked=raw?.unlocked===true;return {unlocked,designs:Object.fromEntries([1,6].map(i=>[i,normalizeTankDesign(unlocked?raw?.designs?.[i]:undefined)])),schemes:(unlocked&&Array.isArray(raw?.schemes)?raw.schemes:[]).slice(0,3).filter(s=>[1,6].includes(s?.vehicle)).map(s=>({vehicle:s.vehicle,design:normalizeTankDesign(s.design)}))};}
