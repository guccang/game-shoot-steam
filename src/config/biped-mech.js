// 机甲车体与速射炮追加到独立存档槽位，价格供购买、改装和维修共用。
export const MECH_HULL=23;
export const MECH_MODEL={id:'biped-mech',name:'苍鹭两足机甲',shortName:'苍鹭',description:'双足巡林机甲，以铰接长腿交替迈步。三发弹仓的隼式速射炮消耗标准炮弹，适合移动中接连点射。',purchaseRecipe:{coins:28000,wood:1800,parts:100,crystal:40,core:2}};
export const MECH_GUN={id:'heron-cannon',weaponIndex:30,hullIndex:MECH_HULL,name:'隼式速射炮',description:'三发弹仓，连续点射后集中装填，使用标准炮弹。',mass:290,ammo:'shell',damage:115,interval:.38,range:500,speed:1010,pellets:1,spread:.018,magazineSize:3,reloadTime:1.65,impulse:420,color:'#ace8d8',hitRadius:4,aimAssist:true,muzzle:57,blastRadius:54,blastRatio:.35};

// 单步行进距离决定支撑脚的后移量，使脚掌在地面上停稳。
export const MECH_STEP=44;
// 返回指定一侧脚掌相对于车体原点的落脚位置，供腿部绘制与扬尘共同使用。
export function mechFoot(side,reach,dx,dy){
 return {x:side*27+reach*dx,y:35+reach*dy};
}
