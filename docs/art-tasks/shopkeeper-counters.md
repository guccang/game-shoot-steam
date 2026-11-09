# 所有售货员柜台任务单

## 2026-11-02 点击与正面候停修复

目标：售货员本体和名牌恢复点击交互；候停区域从右侧单点改为柜台完整前沿的可站区域，正面松手站稳一秒打开服务。保留原柜台、角色、地板、光照、碰撞与手机布局，不新增图像资源。点击与倒计时共用提交和关闭防重弹状态，主动再次点击可以重开；透明热点随室内镜头裁切，拖动仍用于行走。正式入口 `src/ui/shopkeeper-interaction.js`、`src/core/workshop/workshop-display-entry.js`，`designCriterion` 沿用 `shopkeeper-counters`。

验收通过：18 项专项测试覆盖 12 类营业房的真实直行碰撞、正面与两侧候停、柜后排除、暂停、点击与防重弹。弹药铺、种子店、武器工坊和载具工坊通过 320×568 夜间及 390×844 白天实机触控、正面步行计时、关闭防重弹、点击重开与恢复移动检查；页面异常为 0。截图位于 `output/playwright/shopkeeper-click-front/*-countdown.png`，脚本为 `tests/shopkeeper-click-front-browser.cjs`。角色、售货员、柜台和倒计时同屏可读，热点不增加可见浮层或图像缓存；PNG 制作不适用，未运行全量测试。

依据：[美术标准](../art-generation-standard.md)与[仓库合同](../../AGENTS.md)。

## 1 目标与范围

开发阶段程序绘制增补，稳定标识 `shopkeeper-counters`。十间营业房各有一位售货员和一张柜台；补齐武器及载具工坊，原八间营业房保持柜台外观。参考家具店实机图 `../art-reference/furniture-shop-inside.png`。保留点击服务、猫连续动作、展品与车辆、进出门计时，不向巡林小屋增加售货员。

## 2 造型与空间

沿用奶油木质台面、暖木面板和森林绿轮廓。柜台位于售货员正前方 30 单位，底座 130×36；使用原亮顶和暗侧，底座阴影贴地，按深度遮住售货员下半身。武器及车辆展厅保留两侧绕行和出入口，正常房间不叠加第二张柜台。本轮不增加材质变体。

## 3 技术交付

`src/config/workshop-interiors.js` 集中计算柜台，碰撞与正式绘制共同使用；`src/rendering/workshop-interior.js` 复用 `drawTools`。房间局部坐标以底座中心为锚点，无位图、透明背景贴图或新缓存；新增图片解码预算 0。昼夜沿用室内照明。稳定 ID `counter`，售货员热点与原服务事件不变。

## 4 动画补充

柜台静态，无新动画；猫身体仍使用现有连续帧，操作部件不修改。实测行走、绕行、起停与遮挡。

## 5 制作方式

复用已有 Canvas 柜台造型，本轮无需 imagegen 或 PNG 替换。精修为后续阶段，截图仅作验收参考。

## 6 验收记录

- 正式入口：`drawWorkshopInterior` 与 `drawTools`；`inspectShopkeeperCounters` 直接检查真实房间，`visual-contract.json` 绑定 `designCriterion: shopkeeper-counters`。
- 专项单元检查 3 项通过：十间营业房柜台唯一、与售货员同步定位、实体碰撞、两侧与柜后及出口可达、停放车辆保留、真实行走受阻后可横移。家具店原 3 项回归通过。
- 手机实测共 50 个检查点通过：十间房屋昼夜截图、真实点击各自售货员打开服务再出门、武器与载具工坊迎面行走被柜台阻挡；320×568、390×844、844×390 和 900×1280 布局无溢出。短屏保留人物、柜台与出口，服务按钮仍可点击。
- 造型、落地与遮挡人工复核通过：同一木质柜台与既有营地配色一致，售货员在柜后，玩家在柜前；载具展品和正式室内 UI 同屏。室内无怪物，室外地形与战斗未修改，室外怪物同屏检查不适用本次局部柜台增补。猫动作与独立武器源码未改动。
- 参考截图：[武器工坊](../art-reference/shopkeeper-counters-weapons.png)、[载具工坊](../art-reference/shopkeeper-counters-vehicle.png)、[手机夜晚](../art-reference/shopkeeper-counters-night.png)。完整截图位于 `output/playwright/shopkeeper-counters/`，成功实测录像为 `video/page@e6d92918259628c743a375d62070b60d.webm`。
- 运行资源新增位图 0、解码与派生缓存 0；两座展厅各增加一个静态绘制对象。没有生成或替换动画与 PNG，精修为后续阶段。
- 本轮结论：通过，十位售货员各有一张柜台，原服务保持可用。
