import { i18nText } from "../i18n/index.js";
// 数值工作台的就地说明：只解释用途与调整方向，不参与奖励、费用或模拟计算。
const PARAMETER_HELP = {
  'enemy.coinScale':[i18nText("balance.help.d580dfaf05"),i18nText("balance.help.9611ab05d2")],
  'enemy.woodRatio':[i18nText("balance.help.ed00fda43a"),i18nText("balance.help.e73ca3d62d")],
  'upgrades.exponent':[i18nText("balance.help.848eab9ac9"),i18nText("balance.help.d9ea6fb488")],
  'upgrades.woodRatio':[i18nText("balance.help.324691bf65"),i18nText("balance.help.d4fc1b20e7")],
  'upgrades.catchup':[i18nText("balance.help.85909801f9"),i18nText("balance.help.88df0eef2d")],
  'realms.coinsBase':[i18nText("balance.help.6c39cfb5a3"),i18nText("balance.help.14c8c40df4")],
  'realms.coinsStage':[i18nText("balance.help.a058df673d"),i18nText("balance.help.0ca0b9b549")],
  'realms.woodBase':[i18nText("balance.help.88b9ba0fce"),i18nText("balance.help.e3cc7d1e0b")],
  'realms.woodStage':[i18nText("balance.help.d06dfae790"),i18nText("balance.help.e20e7e6741")],
  'realms.tierScale':[i18nText("balance.help.13b950ebef"),i18nText("balance.help.36580f35ed")],
  'realms.core':[i18nText("balance.help.e9ac705b1f"),i18nText("balance.help.96be43ba4a")],
  'growth.weapon':[i18nText("balance.help.9c151e55fc"),i18nText("balance.help.e5f1186b10")],
  'growth.milestone':[i18nText("balance.help.d40e64e77e"),i18nText("balance.help.a0010a4b11")],
  'growth.heroAttack':[i18nText("balance.help.cb6f5922ff"),i18nText("balance.help.af92bce407")],
  'growth.heroMilestone':[i18nText("balance.help.fa2025aadd"),i18nText("balance.help.8e71684285")],
  'growth.heroHealth':[i18nText("balance.help.f72a552a50"),i18nText("balance.help.75e5acfe6d")],
  'growth.armor':[i18nText("balance.help.2e84fe54f6"),i18nText("balance.help.2c14959a4c")],
  'growth.survivalMilestone':[i18nText("balance.help.6b8caa14dd"),i18nText("balance.help.0451f2b4fd")],
  'challenges.forestWavePerBoss':[i18nText("balance.help.7c188699c0"),i18nText("balance.help.9db2586d64")],
};

// 根据完整字段路径区分同名参数，尤其避免把产出比例解释成消费比例。
export function parameterHelp(path, legacy = false, perKill = false) {
  const [group, key, last] = path, full = path.join('.');
  if(group==='taskRewards')return ['这项主线成功交付一次获得的永久资源。','降低会减少任务期间的余额堆积；任务要求的升级和购买费用不变，必须检查交付前的资金是否足够。'];
  if(group==='clearing')return [key==='perKill'?'开启：基准单价乘扩容前配额得到整波预算；关闭：字段直接代表整波预算。':key==='coins'?(perKill?'该位置的基准金币单价乘历史配额与组增幅，再按当前怪群逐只分摊。':'该位置整波金币预算，按击杀序号分摊。'):key==='attempts'?'整波材料抽取总次数，不随怪数放大；零次抽取不推进保底。':key==='woodRatio'?'默认0：清缴怪物不掉木材；大于0会重新开启怪物木材产出。':key==='groupGrowth'?'每完成一组五波，下组金币与材料预算增幅；默认0。':'预算倍率上限，默认1。','前两次清缴每波怪物数量按原配额的70%四舍五入，第三次起恢复正常；整波奖励与材料预算不随怪数改变。'];
  if (legacy && (group==='growth'||full==='upgrades.catchup'||full==='upgrades.woodRatio'||group==='upgrades'&&last==='part'||group==='challenges'&&key!=='forestWavePerBoss'))
    return [i18nText("balance.help.3075063b93"),i18nText("balance.help.e925ba3308")];
  if (PARAMETER_HELP[full]) return PARAMETER_HELP[full];
  if (group==='upgrades'&&key==='base') return [i18nText("balance.help.1ad1bc0cb3"),i18nText("balance.help.27626c2184")];
  if(group==='upgrades'&&key==='woodCeilings')return ['单次升级的独立木材上限，先封顶再应用追赶折扣；默认180。','金币费用继续增长时，木材不会同比膨胀。调低减少采集需求，调高增加；前五级未到上限的费用不变。'];
  if (group==='upgrades'&&key==='ceilings') return [i18nText("balance.help.f898c78d77"),i18nText("balance.help.a2322f1d13")];
  if (group==='upgrades'&&key==='stages') return [i18nText("balance.help.632d64a9ce", { p0: (['1–4','5–9','10–14','15–19'][Number(last)]) }),i18nText("balance.help.3aa5be2622")];
  if (group==='challenges'&&['forest','realm'].includes(key)) return [i18nText("balance.help.4f8d6ded0e", { p0: (Number(last)+1), p1: (key==='forest'?i18nText("balance.help.c8e1529d77"):i18nText("balance.help.38b5e3dbff")) }),
    i18nText("balance.help.f05bfbc010")];
  if (['weapons','turrets','vehicles'].includes(group)) return last==='gate'
    ? [i18nText("balance.help.ad5e04dc98"),i18nText("balance.help.8e3b2b3421")]
    : [i18nText("balance.help.1c84284f63", { p0: ({coins:i18nText("balance.app.bbece6f829"),wood:i18nText("balance.app.30a9333b4f"),parts:i18nText("balance.app.04480d568c"),crystal:i18nText("balance.app.00aedb5fc7"),core:i18nText("balance.help.e6550a880a")}[last]) }),i18nText("balance.help.0b133f4780")];
  if (group==='drops') {
    if (last==='chance'||last==='favoredChance') return [last==='chance'?i18nText("balance.help.225e88738d"):i18nText("balance.help.d1227db00c"),i18nText("balance.help.8bc30d09c5")];
    if (last==='pity'||last==='favoredPity') return [last==='pity'?i18nText("balance.help.9c3d08e3cb"):i18nText("balance.help.4473408063"),i18nText("balance.help.391d58b1c2")];
    if (last==='elite') return [i18nText("balance.help.97707b355d"),i18nText("balance.help.74de078a5c")];
  }
  if (group==='realms'&&['parts','crystal'].includes(key)) return [i18nText("balance.help.0ee4a6273a", { p0: (key==='parts'?i18nText("balance.help.b6be82f97f"):i18nText("balance.help.c16229837e")) }),i18nText("balance.help.97afa2a5d6")];
  if (group==='tree') return [i18nText("balance.help.2e1ae7d945", { p0: (key==='wood'?i18nText("balance.app.30a9333b4f"):i18nText("balance.app.bbece6f829")) }),i18nText("balance.help.eb0286df88")];
  if (group==='boss') return [key==='firstCore'?i18nText("balance.help.4bfd13538e"):i18nText("balance.help.765a6a4c3a", { p0: ({coins:i18nText("balance.app.bbece6f829"),wood:i18nText("balance.app.30a9333b4f"),parts:i18nText("balance.help.b6be82f97f"),crystal:i18nText("balance.help.c16229837e"),core:i18nText("balance.app.a8a88ddbea")}[key]) }),
    i18nText("balance.help.9ebf98f803")];
  return null;
}

// 玩家路线参数仅影响模拟假设，与正式游戏的经济参数分别解释。
export const SCENARIO_HELP = {
  preset:[i18nText("balance.help.b9ab44cc60"),i18nText("balance.help.2ca65ee4ae")],
  route:[i18nText("balance.help.261b77c2ed"),i18nText("balance.help.4dbe3d2d48")],
  efficiency:[i18nText("balance.help.0459451e5a"),i18nText("balance.help.9baa4b7711")],
  minutes:[i18nText("balance.help.6ea9d3e1b5"),i18nText("balance.help.c8f75a421b")],
  strategy:[i18nText("balance.help.57d90a4c41"),i18nText("balance.help.10e8001f41")],
  priority:[i18nText("balance.help.d031615aa6"),i18nText("balance.help.4e6d3bd533")],
  failure:[i18nText("balance.help.84f2285bc4"),i18nText("balance.help.ead4173fa5")],
  movement:[i18nText("balance.help.ce9f762586"),i18nText("balance.help.5b39bb4375")],
  'rate-forestKills':[i18nText("balance.help.2cb66cae4a"),i18nText("balance.help.6ea9c7b52b")],
  'rate-treeRate':[i18nText("balance.help.ac45640571"),i18nText("balance.help.fc0ca5d2f5")],
  'rate-realmKills':[i18nText("balance.help.a52c820eca"),i18nText("balance.help.56026aab77")],
  'rate-bossSeconds':[i18nText("balance.help.e4ab8a9749"),i18nText("balance.help.eccac1b738")],
  'rate-upgradeShare':[i18nText("balance.help.60213ffb17"),i18nText("balance.help.bbff306c93")],
  'rate-workshopMinutes':[i18nText("balance.help.d17a6367c9"),i18nText("balance.help.a5f131bf85")],
  'rate-expeditionMinutes':[i18nText("balance.help.90cf8487b2"),i18nText("balance.help.90cf56cfe2")],
  'target-route':[i18nText("balance.help.82e8a2bd63"),i18nText("balance.help.7533dcc7c3")],
  'initial-progress':[i18nText("balance.help.2dcf7e1caf"),i18nText("balance.help.0297c80e79")],
  'bench-level':[i18nText("balance.help.7492d9a58e"),i18nText("balance.help.1f5e1d8056")],
};

// 权重会归一化，明确相对份额，避免误当百分比或奖励倍率。
export function activityHelp(key) {
  return [key==='logging'?i18nText("balance.help.128312e531"):i18nText("balance.help.d5c7c5da3b"),
    i18nText("balance.help.fb88e3e24c")];
}

// 新任务模型替换旧击杀近似的说明，参数改动只作用于模拟假设。
SCENARIO_HELP['rate-forestKills']=['一级基准每分钟击杀量；再结合波次生命、永久成长和保守车炮收益估算。','森林按营地清缴估算，不包含高阶野外狩猎。固定五波后挑战领主；中后期额外限制补怪吞吐，不能仅靠提高伤害无限加速。'];
SCENARIO_HELP['rate-upgradeShare']=['自由成长的计划预算比例，逐笔支付；主线必需升级优先。','平衡策略在四分钟没有成长后可用现有余额支付一次升级，避免预算欠债；优先攒装备策略保留严格储蓄。'];
SCENARIO_HELP.route=['玩法权重用于主线之间的自由活动，主线指定玩法仍需完成；装备购买只检查资源，并使用当前营地折扣。','所有任务、移动、施工与失败都占用同一时间预算；默认5%自由活动用于采集。零额外伐木需要靠任务、秘境结算补木材，可能明显变慢。'];

// 与当前活动执行器逐项一致；明确效率与固定时长、失败与返程的边界。
SCENARIO_HELP.preset=['推荐方案使用当前任务与清缴预算；旧费用对照使用历史购买/升级规则配合当前玩法结构。','旧费用对照不是旧版本完整复现。版本1/2导入补入当前任务与清缴规则；版本3保留整波计价，旧费用补无约束木材上限。导出为版本4。'];
SCENARIO_HELP.efficiency=['操作效率倍率：0.65较慢，1标准，1.35较快；不改变奖励和报价。','影响战斗、故事及生活委托、消防和往返耗时；球赛固定60秒、工坊施工固定15秒、交谈固定15秒。低效率建议使用1500分钟观察窗。'];
SCENARIO_HELP.failure=['基础失败率；0.08表示8%，每次活动按规则抽取。','秘境逐关判定并叠加难度影响；森林按本段时长折算且保留已击杀收益，死亡增加35秒恢复；故事失败重试不领奖。不是直接扣掉8%的收入。'];
SCENARIO_HELP.movement=['战斗现场与额外采集的移动占比；0.22表示22%。','战斗所需时间按1÷(1−占比)增加；回营往返另计40秒÷效率，剧情和生活任务已含各自活动耗时。'];
SCENARIO_HELP.strategy=['平衡策略持续强化主力，储蓄策略优先攒新装备。','主线要求的升级始终优先且真实扣费。平衡策略允许停顿4分钟后动用现有余额升级；储蓄策略将自由升级预算限制在累计收入的25%，可能延长成长空档。'];
SCENARIO_HELP.priority=['主力等级相同时的升级先后顺序。','weapons是手持武器，heroes是角色，turret是车载炮，vehicle是车体。先补较低等级，再按此顺序决策；任务必需升级优先于自由成长。'];
SCENARIO_HELP['target-route']=['购买清单决定自由消费顺序；当前29步主线的必需购买仍需完成。','完成目标还要求主线结束，以及当前武器15级、角色12级、车体10级、车载炮12级。修改清单不会跳过任务门槛；邻里赠礼另选路线并计委托耗时。'];

// 采集速度按正式电锯近邻样本保守折减，与原每分钟8棵假设分开说明。
SCENARIO_HELP['rate-treeRate']=['每分钟基础采集棵数，默认60；再乘效率与（1−移动占比），标准实际46.8棵/分。','正式自动操作采样40棵约24秒，含树间移动、不含返程；60是保守模型参数，不是真人平均。每棵8木材、0金币，减少采集权重可能导致木材瓶颈。'];
