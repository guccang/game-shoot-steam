# 商队护送交互与失败返程任务单

依据[美术标准](../art-generation-standard.md)、[手机UI框架](../ui-foundation.md)与[AGENTS](../../AGENTS.md)，由美术生成任务单复制后按本次复用既有资产范围填写。

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 名称、标识、用途 | 商队护送，trade-cart / camp-trade-dialog；世界载具与订单页面 |
| 阶段与目标 | 动态交互开发；局部方向来敌、马车本体露营交互、失败返程、定金与放弃确认 |
| 数量和变体 | 复用同一马车、帐篷、床、营灯；新增返程状态标签，无新美术资产 |
| 保留项 | 森林配色、正式马步与车轮动画、世界脚底锚点、三波怪物和夜间迷雾 |
| 制作路线 | Canvas沿用现有正式绘制器；HTML沿用统一手机底板；无需imagegen/SVG/PNG新增资产 |
| 参考 | 用户三张护送截图、src/rendering/camp-trade.js、src/ui/camp-trade.js |
| 后续精修 | 无本轮必需精修项；PNG替换不适用，不重绘既有马车 |
| 使用场景 | 森林商路、野外夜宿、各营地交付 |

## 2 造型与空间

| 字段 | 填写内容 |
| --- | --- |
| 主体剪影、区别 | 车体不变；露营附带帐篷、床和营灯；返程取消露营物件、木牌改为“返程商队” |
| 主次关系 | 马车居中、来敌从单侧错开距离出现，留出其他逃生方向 |
| 地面衔接和邻接 | 沿用正式森林世界坐标与前后排序，林木、建筑、水界均用实际碰撞 |
| 活动空间 | 场景点击热点跟随马车，最低44px；返程A*绕障，临时目标避开障碍 |
| 明暗 | 沿用现有昼夜光照和营灯；本次不修改光源和材质 |

## 3 技术交付

| 字段 | 填写内容 |
| --- | --- |
| 尺寸、倍率、锚点 | 原版马车尺寸和脚底；场景热点120×150世界单位，foot=35，最小44px并随镜头投影；无新增像素资源 |
| 分层 | 既有世界深度队列；HTML热点透明；订单面板沿用ui-panel/ui-page |
| 程序职责 | 定金事务、失败状态、寻路和连续插值；既有图片和动作部件不变 |
| 替换接口 | 稳定trade-cart标识保留；返程对象独立motion，接入render-interpolation动态根分支 |
| 透明和碰撞 | 沿用现有透明资产；返程车仍使用正式半径10的寻路及碰撞；热点不生成世界障碍 |
| 昼夜处理 | 同一绘制器使用现有night参数，帐篷、马车与角色同屏 |
| 文件 | src/core/camp/trade-departure.js、trade-escort.js、camp-trade.js；src/rendering/camp-trade.js；src/ui/camp-trade.js |
| 预算 | 无新增图像、Canvas或全图扫描；单车沿用4096节点、每帧有界的任务A*；画外回收返程实体；重置游戏清空离场缓存 |
| 失败行为 | 定金/交付/放弃均先存档，保存失败不改钱包和订单；0HP停止护送并重试失败提交，不再完成运货；无素材回退 |

## 4 动画任务补充

沿用正式advanceVehicleWheels与现有马步序列，连续模拟dt驱动；失败后独立轮相和移动坐标进行渲染插值。返程取消跟随玩家，沿出发站方向按350单位分段A*绕障，整车离开视口后回收。减少动态继续走原绘制器。角色身体、独立操枪与挽具不变；本轮无新视频或图集，因此来源哈希、裁切和多朝向资产不适用。

## 5 生成指令

未调用imagegen：本次复用现有森林风格资产，新增部分为动态状态与中文交互文案，没有可精修的新增位图。正式绘制器入口为drawTradeObject/tradeObjects，返程依旧使用drawVehicleTracks/drawVehicleArmor，不能以静态马车替代连续动作。

## 6 验收记录

| 设计目标 | 实际证据 |
| --- | --- |
| 系列一致、变体可辨 | escort-deposit-survival/wave-day.png、camp-night.png；马车造型不变，露营可见帐篷床和灯 |
| 遮挡和活动空间 | 正式森林昼夜场景；无新增实体障碍；怪物集中一侧，另一侧开放 |
| 动作与独立部件 | escort-return-motion/video/及return-start.png、return-moving.png、return-gone.png；正式连续返程、车轮与马步 |
| 状态与点击 | 真实tap马车打开面板，tap休息完成天亮，tap放弃二次确认，交付返还定金；保存失败和重复操作专项测试 |
| 昼夜与手机 | 390×844白天/夜晚；320×568的night-panel-320.png、damaged-pay-320.png、abandon-confirm.png，无横向溢出 |
| 资源和预算 | 没有新增图片资源；浏览器无pageerror；返程画外回收验证 |
| PNG与桌面 | PNG未修改；只复用既有手机竖版框架，不增加桌面布局 |

正式绘制器：src/rendering/camp-trade.js；designCriterion：camp-trade（沿用既有inspectCampTrade），新增场景案例为escort-deposit-survival、escort-return-motion。

证据目录：output/playwright/escort-deposit-survival/、output/playwright/escort-return-motion/。

动态效果开发结论：通过：手机实测点击、结算、二次确认、连续返程和画外回收均通过；昼夜及短屏截图已检查。PNG精修不适用。长期参考为上述手机昼夜截图。
