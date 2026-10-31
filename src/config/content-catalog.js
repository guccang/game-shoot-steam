// 内容数值工具入口：仅收录内容、战斗平衡与成长，不收录镜头、后坐力、动画和绘制参数。
import mainline from './content/mainline.json' with {type:'json'};
import vehicles from './content/vehicles.json' with {type:'json'};
import monsters from './content/monsters.json' with {type:'json'};
import growth from './content/growth.json' with {type:'json'};

export const CONTENT_DATA={mainline,vehicles,monsters,growth};
export const CONTENT_SOURCES=[
 {id:'mainline',label:'主线任务表',source:'src/config/content/mainline.json',identity:'tasks[].id',extension:'可追加使用已有条件、场景和操作的任务；发布后保持原有任务顺序和 ID。'},
 {id:'vehicles',label:'战车属性表',source:'src/config/content/vehicles.json',identity:'rows[].id',extension:'可调整既有型号属性与成长；新型号需接入车体、专属武器与资源绑定。'},
 {id:'monsters',label:'怪物属性与成长表',source:'src/config/content/monsters.json',identity:'ranged 的稳定物种键',extension:'可调整既有物种属性、解锁、混编和等级成长；新物种仍需行为及资源绑定。'},
 {id:'growth',label:'成长键值与熟练度表',source:'src/config/content/growth.json',identity:'稳定字段名；masteryThresholds 顺序表示等级',extension:'可增加熟练度阶梯、调整等级上限、成长倍率与资源消耗。'},
];
// 已有玩法数据继续引用原正式来源，不复制为另一套可写配置；逐项说明扩展边界。
export const CONTENT_RELATED_SOURCES=[
 {label:'购买配方、升级费用、挑战门槛、产出',source:'src/config/economy.js',status:'已有表和验证器；正式价格以此处读取的经济方案为准'},
 {label:'手持武器',source:'src/config/weapons.js',status:'属性已成表；新武器类型的开火及绘制仍需代码'},
 {label:'车载专属武器',source:'src/config/vehicle-armaments.js',status:'已有型号挂载表；固定装备编号关联存档'},
 {label:'角色属性',source:'src/config/heroes.js',status:'已有表；新角色须接入资源'},
 {label:'怪潮数量与清缴节奏',source:'src/config/waves.js',status:'部分成表；五波一组及历史波次换算仍有固定规则'},
 {label:'领主',source:'src/config/bosses.js',status:'属性已成表；领主技能阶段仍有代码分支'},
 {label:'无尽远征、塔与守护',source:'src/config/realms.js',status:'属性和奖励部分成表；阶段目标与生成仍有固定规则'},
 {label:'守护布防与敌人',source:'src/config/guardian.js',status:'已有表；玩法执行器保留机制实现'},
 {label:'故事章节',source:'src/config/story-campaign.js',status:'已有章节目录；增加全新章节流程仍需注册场景与触发'},
 {label:'邻里委托与森林生活',source:'src/config/living-world.js',status:'已有委托表；新增条件类型仍需事件记录与结算支持'},
 {label:'材料与掉落',source:'src/config/materials.js',status:'已有配方表；新增资源类型仍需存档和展示支持'},
];
// 返回独立快照，工具编辑候选不会提前污染正在运行的正式配置。
export function contentCatalog(){return structuredClone({version:1,sources:CONTENT_SOURCES,related:CONTENT_RELATED_SOURCES,data:CONTENT_DATA});}
