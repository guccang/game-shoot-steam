# 营地订单与商路

## 营地订单板进度改版

参考本次实机截图中的单柱小木牌，将营地主牌改成双柱公告板，脚底仍锚定原交接点。主体宽 144、高 84 世界单位，上栏写名称，奶油色面板分栏显示任务总数和已完成数。地面影、支柱、木框、牌面与实时数字由正式 Canvas 绘制；使用现有字体与场景排序，无新增贴图或动画。原有驿站木牌、导航和道路沿用现有配置。手机触控区跟随新牌面大小，昼夜及桌面竖版用现有商路场景复核。

## 目标与范围

本轮为动态效果与交互开发。在晴叶营地设置订单板，在旧哨站和琥珀林设置交接点。玩家可在手机查行情、跟车领路，在场景里点木牌出售作物或交付任务。依据[美术标准](../art-generation-standard.md)、[手机底板](../ui-foundation.md)及[仓库动作合同](../../AGENTS.md)。

## 造型、空间与资源

- 营地和旧哨站沿用木牌，远站以单顶奶油色帐篷、收货桌和营灯围出交接空地。远站选在林道旁树冠留白处，桌前可步行和停车。三个地点的稳定标识和脚底坐标见 [商路配置](../../src/config/camp-trade.js)。
- 木牌宽度由正式短名称木牌决定，支柱高 40 世界单位。帐篷、桌台、营灯与人物按各自脚底排序。屋外点击区最小 44 × 44 CSS 像素，订单要在地标 110 世界单位内办理。
- 商队使用第 14 号铜箍货运马车的原车体尺寸、挽具、车轮和马匹锚点。轮相按真实位移更新，挽马沿用既有正面迈步、姿态匹配和待机序列。世界排序和昼夜调色沿用战场绘制器。猫和武器沿用主角独立动作层。
- 正式入口为 [商路世界物件](../../src/rendering/camp-trade.js) 的 `tradeObjects`、`drawTradeObject` 及[野外摆件](../../src/rendering/outdoors.js)的 `drawOutdoorObject`。动作来源为 [载具运动](../../src/combat/vehicle-motion.js) 和 [马匹清单](../../assets/vehicle-eras/horse.json)。本次复用已有图集和程序木牌，新增图片、解码纹理和离屏缓存均为零。没有图像生成请求、PNG 导出或视频源替换。

## 验收记录

| 设计目标 | 验收结果 |
| --- | --- |
| 昼夜、人物和场景比例 | 已查看 [390 宽白天](../../output/playwright/camp-trade/390-day.png)、[320 宽夜晚](../../output/playwright/camp-trade/320-night.png)、[桌面竖版白天](../../output/playwright/camp-trade/950-day.png)和[桌面竖版夜晚](../../output/playwright/camp-trade/950-night.png)。营地马车、持枪猫、怪物、路牌和 HUD 在同一正式画面。 |
| 落地、遮挡与活动空间 | 两条线路均通过正式森林寻路和商队移动碰撞。旧哨站走保护区内道路，远站遇袭位置限制在保护区外；远站木牌前可交货，[远站现场](../../output/playwright/camp-trade/outpost.png)。 |
| 动作与独立部件 | 检查正式运行中的商队实体、挽马帧和位移轮相。暂停读订单时车队停止，到站后实际领取佣金，[交互录制](../../output/playwright/camp-trade/trade-interaction.webm)。 |
| 短屏交接与导航 | [订单页](../../output/playwright/camp-trade/phone-orders.png)使用统一手机底板。触屏模拟实测订单板、手机二级入口、留货勾选、导航、交付三份作物、近站领佣和远站售货。320 宽正文可滚动，面板无横向溢出。 |
| 结算与恢复 | [规则用例](../../tests/camp-trade.test.mjs)覆盖库存预留、写盘失败、重复领取、限定掉落、满额拒绝、护送失败、读档后继续两条路线。 |
| 资源预算与后续精修 | 本阶段使用已有马车、摆件、图标与 Canvas 绘制，PNG 精修不在本轮范围。 |

`designCriterion` 为 `camp-trade`，对应[正式运行采样入口](../../src/rendering/visual-review.js)的 `inspectCampTrade` 和[浏览器交互用例](../../tests/camp-trade-browser.cjs)。动态效果开发阶段通过。

### 订单板改版复核

初次同屏检查发现，停靠的商队名牌挡住完成数。将牌面及触控区域上移 32 世界单位，延长双柱至原脚底。复查 [390 宽白天](../../output/playwright/camp-trade/390-day.png)、[320 宽夜晚](../../output/playwright/camp-trade/320-night.png)及上表两张桌面竖版截图，商队、持枪角色和 HUD 同屏时均可读到总数 4、已完成 1。沿用原世界遮挡排序与可通行地面，双柱和落影不参与碰撞。

实际触控接单、交货后，[订单页](../../output/playwright/camp-trade/phone-orders.png)与世界牌面同步更新。两条护送分别认定首次完成；重复交货、保存失败和读档由商路规则用例验证。复用 Canvas 图元、运行时字体和两列文字，无新增图像、离屏画布或动画。正式入口为 `drawTradeObject` 中的 `drawOrderBoard`，对应 `designCriterion: camp-trade`。本次程序绘制与手机交互验收通过。
