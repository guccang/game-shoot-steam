// 武器演练按正式稳定 ID 配置目标布阵，距离与目标强度只属于隔离场景。
export const TRIAL_ORIGIN={x:5400,y:4200};
export const TRIAL_RADIUS=560;
// 目标点以玩家起点为原点，朝上展开，适合手机竖屏观察完整射线。
const line=[[0,-130],[0,-200],[0,-270],[0,-340]];
const cluster=[[-45,-170],[0,-160],[45,-170],[-48,-220],[0,-215],[48,-220]];
const surround=[[-150,-120],[0,-225],[150,-120],[-160,60],[160,60]];
export const WEAPON_TRIAL_SCENES={
 pistol:{name:'巡林基础靶道',hint:'移动接近目标，观察单发命中与换弹节奏。',points:[[-70,-150],[65,-205],[0,-290]],hp:72},
 laser:{name:'贯穿林道',hint:'让目标排成一线，观察一道光束穿过多个目标。',points:line,hp:80},
 gatling:{name:'持续压制阵地',hint:'持续锁定耐久目标，观察转管、连续火力与长弹匣。',points:[[-55,-200],[55,-215],[0,-290]],hp:480},
 shotgun:{name:'近距散射场',hint:'靠近扇形目标，观察多颗弹丸同时命中；拉远对比散布。',points:[[-46,-85],[0,-100],[46,-85],[-80,-190],[80,-190]],hp:100},
 ricochet:{name:'弹跳石滩',hint:'目标错落分布，观察子弹在相邻目标之间跳转。',points:[[-45,-140],[40,-185],[-40,-245],[50,-295]],hp:95},
 water:{name:'水流阻击线',hint:'面对缓慢来敌，观察连续水流与击退，边退边打。',points:[[-55,-180],[0,-220],[55,-180]],hp:180,speed:18},
 grenade:{name:'密集爆破场',hint:'向密集目标开火，观察爆炸覆盖相邻敌人。',points:cluster,hp:150},
 flame:{name:'近身燃烧带',hint:'靠近密集来敌，观察火焰覆盖与持续燃烧。',points:[[-42,-110],[0,-100],[42,-110],[-30,-165],[30,-165]],hp:210,speed:12},
 sniper:{name:'长距贯穿射道',hint:'远处两组目标相隔数百米，观察远射与贯穿；走位调整射线。',points:[[0,-430],[0,-500],[0,-610]],hp:200,long:true},
 pulse:{name:'蓄能贯穿射道',hint:'等待蓄能后贯穿纵列，观察释放、后坐与恢复。',points:[[0,-350],[0,-420],[0,-500],[0,-610]],hp:360,long:true},
 arc:{name:'连锁导电阵',hint:'目标间距适合传导，观察电弧逐个连接。',points:[[-60,-170],[35,-210],[-55,-280],[65,-300]],hp:160},
 frost:{name:'霜冻拦截道',hint:'来敌缓慢接近，对比被命中目标的减速与未命中目标。',points:[[-65,-220],[0,-260],[65,-220]],hp:220,speed:30},
 funnel:{name:'浮游炮环形场',hint:'移动控制器，观察独立浮游炮展开、索敌和回收。',points:surround,hp:200},
 drone:{name:'无人机巡航场',hint:'向不同方向走位，观察无人机巡航与多目标攻击。',points:surround,hp:180},
 chainsaw:{name:'林缘采伐场',hint:'靠近左侧树木伐木，再切向近身目标，观察电锯的近战范围。',points:[[45,-90],[-20,-125],[65,-155]],hp:160,trees:true,speed:8},
 'mechanical-core':{name:'机械小队推进场',hint:'带领机械小队前进，观察独立站位、追击与攻击。',points:surround,hp:220,speed:8},
 'mechanical-spider':{name:'蛛群包围场',hint:'在开阔地移动，观察母体、小蛛孵化与包围攻击。',points:surround,hp:250,speed:10},
 'energy-shield':{name:'护盾驻车演练',hint:'站稳后让借用战车自动攻击。观察护盾抵挡来敌、破盾和恢复；拖动离开怪群等待充能。',points:[[-95,-140],[95,-140],[0,-200]],hp:1200,speed:60,damage:60},
 'gravity-gun':{name:'引力聚合场',hint:'分散目标进入引力场后会被拉向中心；观察聚拢过程。',points:[[-90,-220],[90,-220],[-120,-320],[120,-320],[0,-370]],hp:300}
};
// 载具优先展示实际挂载武器；无手持同类配置时使用密集机动场。
export function weaponTrialScene(weapon,kind='weapons'){
 // 红狼使用耐久靶，基础主炮直击约掉半血，保留多次命中与溅射范围观察时间。
 if(kind==='vehicle'&&weapon?.id==='wolf-256')return {name:'载具机动演练场',hint:'拖动走位，对比主炮直击与周围目标的爆炸掉血。',points:cluster,hp:1200};
 return WEAPON_TRIAL_SCENES[weapon?.id]||{name:kind==='vehicle'?'载具机动演练场':'林间火力演练场',hint:'拖动走位，观察实际火力覆盖、装填和车辆运动。',points:cluster,hp:240};
}
