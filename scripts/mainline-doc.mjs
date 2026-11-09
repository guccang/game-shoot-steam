// 从正式内容表生成玩法清单与任务表，避免设计文档和游戏条件各写一套。
import {writeFileSync} from 'node:fs';
import {MAINLINE_TASKS,MAINLINE_SITES,MAINLINE_NPCS} from '../src/config/mainline.js';
import {WEAPONS} from '../src/config/weapons.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
const names={coins:'金币',wood:'木材',parts:'零件',crystal:'晶体',core:'核心'};
const intro=`# 巡林簿：长期成长主线

正式配置：src/config/content/mainline.json；解释器：src/core/story/mainline-manager.js。运行 node scripts/mainline-doc.mjs 更新任务表。

## 经济与体验规则

主线负责介绍故事、装备特点和玩法。前期保留手枪、松果战车的基础培养；后期气垫船、直升机和高级控制器可在工坊免费演练，击破靶标才记入体验。已有对应装备也可核验，不要求重复购买。演练只用临时副本，不赠送永久装备，不消耗正式钱包。

主线直接金币合计 14,710，木材 7,510；这是毛收入，不包含故事、清缴、种田及其他玩法收入，也未扣除消费。后期取消大额购装和高等级养成补贴，原有材料奖励保留。高级装备的价格、独立故事资格和其他玩法奖励保持不变，玩家可按喜好积累资源购买。

两次载具整备允许沿用已有车辆，分别达到3级和4级。时空塔前3层只要求一件4级武器；末段要求一件5级武器、栗子3级、主力车炮4级和已有车体4级，不要求购买高级控制器。清缴和西门兽潮按接取后的正式胜利完成，不限制装备。

装备故事在对应建筑存在时可独立接取；装备购买不与其他主线故事串联。临时演练和剧情借装不等于永久所有权。玩家仍可选择配置自己拥有的控制器并在森林部署伙伴来完成协同教学，已完成演练的心得也予认可。

存档保留稳定任务 ID、已完成任务、当前阶段、已领取金币与装备；尚未领取的任务使用新奖励，包括旧版购船补贴。没有回收、补差或重复发奖。自定义经济工作台方案仍以其配置为准。

## 引导与验证

所有任务条件、操作入口、对白和奖励来自同一内容表。免费演练保留未购买装备的购买目录入口，不引导购买或跳到只列已有装备的升级页。只有真实击破记录才完成体验，记录经过正式保存并可在重载后继续。

预算脚本按正式交易和最低报价分支核算强制消费；免费体验没有购装成本。自动化验证不等同于真人从零完整通关，挑战难度和耗时仍需实际游玩调优。

## 装备目录

下表不代表主线赠送。

| 编号 | 武器 | 稳定ID |
|---|---|---|
`;
const weapons=WEAPONS.map((w,i)=>`| ${i} | ${w.name} | ${w.id} |`).join('\n');
const vehicles=COLLECTED_VEHICLES.map((v,i)=>`| ${i} | ${v.name} | ${i===4?'消防任务来源':'独立装备任务及原配方（如适用）'} |`).join('\n');
const rows=MAINLINE_TASKS.map((t,i)=>`| ${i+1} | ${t.chapter} | ${t.title} | ${MAINLINE_NPCS[t.npc].name} · ${MAINLINE_SITES[t.site].name} | ${t.text} | ${Object.entries(t.reward).map(([k,n])=>names[k]+' '+n).join('、')} |`).join('\n');
writeFileSync(new URL('../docs/mainline-learning.md',import.meta.url),intro+weapons+'\n\n| 编号 | 载具 | 获得方式 |\n|---|---|---|\n'+vehicles+'\n\n## 主线任务表（正式表生成）\n\n| 顺序 | 章节 | 故事任务 | 人物与地点 | 完成要求 | 一次性资源 |\n|---|---|---|---|---|---|\n'+rows+'\n\n## 维护与验证\n\n新增任务需配置稳定ID、地点、人物、对白、条件与资源；mainline-guide.js配置一句提示、收尾及短动作，按顺序绑定原all条件（any作为整体），可覆盖对应操作入口；不得在解释器按任务ID新增分支。测试覆盖配置合法性、条件、一次性交付与保存失败、购买资格、导航及UI互斥。主线链路使用明确进度夹具校验，不等同于从零资源自然打完所有关卡。\n');
