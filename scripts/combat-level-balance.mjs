// 从正式属性与战斗运行时生成等级平衡报告；--write 保存文档与完整数表，否则输出 JSON。
import {writeFile} from 'node:fs/promises';
import {combatLevelTable,equipmentLevelTable,measureLevelFight} from '../src/balance/combat-levels.js';

const levels=combatLevelTable(),equipment=equipmentLevelTable();
const cases=[
 {label:'旧：手枪3 / 猫5 → 怪20',weapon:0,weaponLevel:3,heroLevel:5,health:173},
 {label:'旧：加特林15 / 猫5 → 怪20',weapon:2,weaponLevel:15,heroLevel:5,health:173},
 {label:'手枪3 / 猫5 → 怪20',weapon:0,weaponLevel:3,heroLevel:5},
 {label:'加特林15 / 猫5 → 怪20',weapon:2,weaponLevel:15,heroLevel:5},
 {label:'手枪10 / 猫10 → 怪15',weapon:0,weaponLevel:10,heroLevel:10,enemyLevel:15},
 {label:'加特林10 / 猫10 → 怪15',weapon:2,weaponLevel:10,heroLevel:10,enemyLevel:15},
 {label:'手枪15 / 猫15 → 怪20',weapon:0,weaponLevel:15,heroLevel:15},
 {label:'加特林15 / 猫15 → 怪20',weapon:2,weaponLevel:15,heroLevel:15},
 {label:'手枪20 / 猫20 → 怪20',weapon:0,weaponLevel:20,heroLevel:20},
 {label:'加特林20 / 猫20 → 怪20',weapon:2,weaponLevel:20,heroLevel:20},
 {label:'机枪主炮20 / 猫20 → 怪20',kind:'vehicle',vehicle:0,turretLevel:20,heroLevel:20},
 {label:'125主炮20 / 猫20 → 怪20',kind:'vehicle',vehicle:1,turretLevel:20,heroLevel:20},
 {label:'火神主炮20 / 猫20 → 怪20',kind:'vehicle',vehicle:2,turretLevel:20,heroLevel:20},
 {label:'手枪20 / 猫20 → 怪5',weapon:0,weaponLevel:20,heroLevel:20,enemyLevel:5},
].map(({label,...options})=>({label,...measureLevelFight(options)}));
const report={conditions:'栗子；无改装、无熟练度、一级附属部件、无祝福；关闭暴击，固定站桩靶、全部命中；包含真实弹道、起转和装填。',levels,equipment,cases};

// Markdown 只展示关键档位，JSON 保留每种武器、主炮和猫的完整二十级数列。
function table(headers,rows){return [headers,headers.map(()=>'---'),...rows].map(r=>'| '+r.map(v=>v??'无主炮').join(' | ')+' |').join('\n');}
// 正文明确成长公式、玩法边界和实测条件，避免把单发威力误读为持续秒伤。
function markdown(){
 const keyLevels=[1,5,10,15,20],sample=values=>keyLevels.map(l=>values[l-1]);
 return `# 怪物、枪械、载具与猫的等级平衡

本报告由 \`node scripts/combat-level-balance.mjs --write\` 自动生成。[完整 JSON 数表](combat-level-balance.json)包含所有装备和猫的 1～20 级结果。

## 问题与修复

原普通怪生命为 round(36 × (1 + 0.20 × (等级 − 1)))，20级只有173 HP。攻击却同时乘武器与猫的成长，造成等级脱节。栗子5级配手枪3级每发40伤害：无暴击5发，带暴击可能4发；配加特林15级每颗64伤害：3颗、约0.4秒。

新普通怪生命 = round(36 × W(怪物等级) × H(怪物等级) × (1 + 0.12 × (怪物等级 − 1)))。

- W：枪械和独立主炮共用等级倍率。1～4级为1 + 0.22 × (等级 − 1)；5级以后普通升级乘1.08，5/10/15/20级突破乘1.25。
- H：猫的攻击等级倍率。1～4级为1 + 0.10 × (等级 − 1)；5级以后普通升级乘1.04，5/10/15/20级突破乘1.12。
- 手持攻击 = round(有效枪械基础伤害 × 猫品种倍率 × W(枪级) × H(猫级) × 手持天赋 × 祝福)。主炮同理，读取独立主炮等级与主炮天赋。
- 保留已有玩家攻击成长和升级投入，统一两类武器的成长入口，修复怪物生命与攻击成长脱节。怪物永远按自身等级读取默认成长，不读取玩家当前装备或猫，换装不会把怪物一起变强。
- 车体等级提升装甲；主炮等级提升攻击；猫等级同时影响其属性和天赋。升级车体不会额外叠加攻击，手持升级不会免费提升主炮。

## 同级效果

低级普通怪约2～3发手枪，高级普通怪约4～6发；同级加特林约6～15颗。越5级需要更长持续输出，越15级用入门手枪极为吃力；高级装备打低级仍可一击。连发、范围和重炮有各自定位，不强求所有武器相同击杀时间。重型主炮同级一炮击杀普通怪是保留的定位，持续作战还受射击间隔和装填约束。

下表均为栗子，枪、主炮、猫与车体同级；猫的品种和天赋已经计入伤害，W/H列仅表示通用等级倍率。普通怪不带特殊形态减免。

${table(['等级','普通HP','精英HP','W','H','手枪/发','加特林/颗','机枪主炮/颗','猫HP','松果车装甲','手枪发数','加特林颗数'],levels.map(r=>[r.level,r.hp,r.eliteHp,r.weaponScale.toFixed(3),r.heroScale.toFixed(3),r.pistol,r.gatling,r.machinegun,r.heroHp,r.hullHp,r.pistolHits,r.gatlingHits]))}

## 实际战斗运行时测量

${report.conditions}这是理想持续命中的基准，不是移动、躲避、受击和多怪实玩通关时间。“命中数”是实际造成伤害的次数；这里只采单弹武器。

${table(['组合','怪物HP','单次伤害','命中数','击杀秒数'],cases.map(r=>[r.label,r.hp,r.damage,r.hits,r.seconds??'超时']))}

## 所有枪械的攻击曲线

固定栗子5级，仅改变枪械等级。数值是面板单次基础伤害，散弹、多段、范围武器须结合弹丸数、射速、目标数和装填比较，不可当作每扣一次扳机的总伤害。

${table(['枪械',...keyLevels.map(l=>l+'级')],equipment.weapons.map(r=>[r.name,...sample(r.damage)]))}

## 所有载具的主炮曲线

固定栗子5级，仅主炮等级影响下列伤害。消防车保留现有默认手枪；无主炮载具不赋予虚构火力。

${table(['载具',...keyLevels.map(l=>l+'级主炮')],equipment.vehicles.map(r=>[r.name,...sample(r.damage)]))}

## 所有猫的攻击成长效果

固定手枪5级，仅改变猫等级，结果包含各猫品种倍率和天赋。

${table(['猫',...keyLevels.map(l=>l+'级')],equipment.heroes.map(r=>[r.name,...sample(r.pistol)]))}

## 模式与边界

- 野外与常驻怪物营地使用新等级HP；强壮、精英分别乘1.55、2.25，随后继续应用正式物种和模式修正。
- 清缴保持早期生命预算下限，中后期普通怪至少跟上显示等级的成长；团怪、前两轮减免继续生效。领主生命、伤害、奖励不变；完成30轮后的独立难度上限保留。
- 守门团怪使用同级野外普通怪的一半HP，首波仍18；重复通关的既有增幅继续生效，领主独立预算不变。
- 剧情和秘境仍使用各自固定遭遇预算，本次没有重做其领主、任务或奖励。玩家存档等级、装备、资源不迁移；已生成敌人需要重新进入或重新生成才使用新HP。
- 实测使用正式靶场与战斗更新，无浏览器手动走位验收。新增回归覆盖真实20级野外生成、换装和读档稳定性、全部装备曲线、车体与主炮隔离，以及上述越级/同级案例。
`;
}
if(process.argv.includes('--write')){
 await writeFile(new URL('../docs/combat-level-balance.md',import.meta.url),markdown());
 await writeFile(new URL('../docs/combat-level-balance.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(`已写入等级报告：${levels.length}个等级，${equipment.weapons.length}种枪械，${equipment.vehicles.length}种载具，${equipment.heroes.length}只猫，${cases.length}组实测。`);
}else console.log(JSON.stringify(report,null,2));
