// 猫猫说明按功能入口提供用途和第一步操作，复用已有的猫耳问号图案。
import {HELP_EMBLEM} from './help-emblem.js';

const topics={
 'mine-controls':'打开工具选择挖矿或铺轨。靠近岩壁挥镐，沿轨道乘矿车运输矿物；更多建设里可以查看费用。',
 'cottage-controls':'在小屋休息、查看猫猫或整理布置。走到对应设施旁，再选择要使用的功能。',
 'farm-tools':'锄头开田，选择种子播种，浇水可加快成熟。用镰刀收获后，到快递站或种子小屋出售赚金币。',
 'farm-remove':'选中要清理的地块后确认移除，给新的农田或建筑腾出位置。',
 'farm-harvest-confirm':'查看收获后的载荷，再决定是否把这一茬收成装入库存。',
 'seed-shop':'查看种子来源，购买已经解锁的品种。把收成带到店里可以出售换金币。',
 'warehouse':'靠近仓库会存木材、出售未保留的作物。打开仓库，点物品、选数量并确认存取。',
 'warehouse-quantity':'选择本次存入或取出的数量，确认后物品才会转移。',
 'camp-land':'选择东西南北的扩建方向，查看费用和将解锁的建筑。支付金币和木材后整块地一起开放。',
 'camp-layout':'选择营地里的建筑，拖动或用方向按钮调整位置，再保存布局。',
 'camp-management':'这里可以扩建营地、安排车位和摆放装饰。先选要管理的项目。',
 'camp-world-placement':'在场景空地上选择位置，确认摆放选中的装饰。',
 'camp-calendar':'查看节日日期与活动，按日历安排营地生活。',
 'camp-trade':'查看订单的货物、目的地与佣金，接单后将货物送达并交付。',
 'camp-defense':'守住营地，击退来袭的怪潮。在这里查看守备准备并进入战斗。',
 'camp':'在武器工坊查看武器，比较购买或升级所需资源，选好后确认整备。',
 'current-cat':'查看当前猫猫的状态与装备，了解出发前的能力。',
 'cat-home':'查看猫窝里的伙伴，选择要了解的猫猫。',
 'map':'查看当前位置和目的地，也可以打开「扩建营地」查看新地块。',
 'phone':'从手机查看地图、邮件和营地事务，或使用回小屋导航。',
 'keepsake':'查看随身纪念物。选择松伯的信，可以重读种地、伐木、扩建和仓库指南。',
 'arrival-letter':'读完松伯的信，收下种子开始自由探索。之后可从小背包重读。',
 'mailbox':'打开来信查看内容，按信里的提示处理邮件。',
 'settings':'在这里调整游戏选项，按自己的操作习惯设置。',
 'environment':'查看和调整时间、天气，观察森林环境变化。',
 'chronicle':'查看本次巡林的进度和已记录的经历。',
 'creature-codex':'按类别或名称查找已发现的生物和作物，查看发现记录。',
 'fish-discovery':'查看刚钓起的鱼，选择放生或收入鱼护。',
 'outdoor':'准备露营与钓鱼用具，去合适的地点开展户外活动。',
 'outdoor-gear-detail':'查看这件户外用具的用途和使用条件。',
 'field-equipment':'查看随身野外用具，选择适合当前活动的装备。',
 'vehicle-collection':'查看载具与解锁条件，选择要整备的车型。',
 'vehicle-repair':'查看受损载具和维修费用，选择需要维修的车辆。',
 'logistics':'查看载具仓库、货物重量和剩余载荷，安排运输。',
 'inventory-transfer':'选择物品和数量，在可用库存之间转移。',
 'load-cleanup':'查看占用载荷的物品，选择要清理的货物。',
 'load-cleanup-quantity':'选择要丢弃的数量，确认前核对剩余库存。',
 'supply-load-confirm':'核对购买后剩余的载荷，再决定是否继续购买。',
 'shop-checkout':'核对购物车里的数量和总价，确认后支付。',
 'workshop':'选择武器或载具，查看购买、升级与改装所需材料。',
 'arrival-workshop':'查看武器工坊的建设进度，材料齐备后可以修复。',
 'equipment-goal':'追踪想获得的装备，查看材料缺口和对应工坊。',
 'weapon-trial':'准备试用场景，体验当前武器的使用效果。',
 'weapon-rack':'查看和整理小屋中收纳的武器。',
 'legendary':'查看传奇装备和制作条件，备齐材料后在工坊制作。',
 'funnel':'配置浮游炮，让它在战斗中协助攻击。',
 'mechanical':'选择机械核心配置，查看各配置对应的战斗能力。',
 'spider':'查看蜘蛛主炮配置，选择适合载具的主炮。',
 'mine-build':'选择地下设施，查看建造条件后布置在矿井里。',
 'mine-map':'查看当前矿层、已探索区域和通道。',
 'mine-direction':'选择矿车在路口行进的方向。',
 'mine-removal':'选择要拆除的地下设施，核对可回收的材料后确认。',
 'industry':'查看原料和产物，安排矿产提炼或加工。',
 'production':'设置收成保留数量，选择配方把农矿原料加工成产品。',
 'home-construction':'查看小屋能建设的项目和材料需求，选择项目施工。',
 'home-decor':'选择装饰并摆放到小屋中，布置自己的住处。',
 'cottage-sleep':'选择醒来的时间，在小屋休息。',
 'waystations':'选择驿站目的地，查看距离并开始导航。',
 'treasure':'查看寻宝线索，按手记提示到森林里寻找宝物。',
 'fire':'在消防站查看火情、接取任务，前往现场灭火。',
 'clearing':'查看清剿地点与奖励，接取后前往目标，完成后回营交付。',
 'living':'查看森林邻里的需求，选择想帮忙的委托。',
 'resident-chat':'与居民交谈，了解近况和可办理的事务。',
 'npc-conversation':'与这位角色交谈，查看可选的话题或任务。',
 'story':'查看当前故事目标，按线索推进剧情。',
 'regional-camps':'查看当前营地的服务、商店和可接取的任务。',
 'monster-camps':'查看野外据点的情况，选择目标准备挑战。',
 'mainline':'在巡林簿里查看、选择或追踪任务，完成后按提示交付。',
 'task-reward':'查看刚完成任务的报酬，按页面提示领取或返回。',
 'restoration':'查看设施修复所需的材料与地点，准备好后前往建设。',
 'realm':'选择要体验的挑战，进入前查看玩法和条件。',
 'challenge-catalog':'查看营地等级提供的折扣和解锁条件。'
};

// 将说明挂到实际功能面板；已有的仓库说明沿用原有交互。
export function attachFeatureHelp(panel,showHelp){
 const text=topics[panel.id.replace(/-dialog$/,'')];
 if(!text)return;
 const warehouseHelp=panel.id==='warehouse-dialog'&&panel.querySelector('[data-help]');
 if(warehouseHelp){if(!warehouseHelp.querySelector('.help-emblem'))warehouseHelp.innerHTML=HELP_EMBLEM;return;}
 const button=panel.ownerDocument.createElement('button');
 button.type='button';button.className='cat-feature-help';button.innerHTML=HELP_EMBLEM;
 button.setAttribute('aria-label','猫猫问号：功能用途');
 button.addEventListener('click',()=>showHelp(text));
 const header=panel.querySelector(':scope > header, :scope > .ui-panel__header, :scope > .camp-story-heading, :scope > .task-reward-panel > header');
 // 说明放在关闭键左侧，沿用页面原有的按钮组和键盘顺序。
 const close=header&&Array.from(header.querySelectorAll('button')).find(node=>node.textContent.trim()==='×');
 if(close)close.before(button);
 else if(header)header.append(button);
 else panel.prepend(button);
}
