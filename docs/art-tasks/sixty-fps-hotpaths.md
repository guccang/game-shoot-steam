# 主线界面与插值热路径优化任务单

依据：[美术标准](../art-generation-standard.md)和[项目规则](../../AGENTS.md)。

## 目标与范围

标识：sixty-fps-hotpaths。当前阶段：现有动态效果性能优化，不生成美术资源或替换PNG。
目标：保留每帧世界投影与插值，减少主线寻路按钮、隐藏提示的无效DOM更新和表现集合分配。
交互：寻路开关、提示消息、主线交谈、目标切换、缩放旋转与暂停维持原行为。
数量、变体、主体剪影、光向、地面衔接、主次与邻接组合：沿用现有内容，不新增造型。
保留项：25Hz逻辑/60Hz绘制调度、原角色连续动作、独立操枪、字体、图标、坐标、深度与通行。
参考：src/ui/task-navigation.js、src/ui/mainline.js、src/rendering/render-interpolation.js及既有同屏画面。

## 技术与动作

逻辑尺寸、像素倍率、锚点、透明分层与昼夜处理：原CSS与绘制器保持不变；不新增图集、派生像素缓存和碰撞。
运行分支：主线卡、寻路开关、短提示与表现快照；集合复用必须保持成员删除、数组缩短、环引用及权威状态隔离。
视频、帧数与裁切不适用，沿用原动画素材；不能缓存整段动画或改变动作时钟。
后续PNG精修项：无，本任务不改变美术资源。

## 制作指令

只跳过值未变化的DOM写入；隐藏短提示不做布局。变更目标或显示消息时立即使用真实几何。
插值优化须与原算法逐字段对照，保持所有正式武器节拍和暂停/传送行为。

## 验收记录

实现：清缴、入职、故事及主线显隐去重，场景热点离屏跳过坐标写入，表现集合复用。开发中同步主分支的 SVG／程序 UI 恢复，不重新引入PNG。

| 项目 | 结果与证据 |
| --- | --- |
| 正式昼夜同屏 | 320×568、390×844、1080×921 六组通过；output/playwright/sixty-fps/ui-宽度-昼夜.png，宽屏仍为手机竖版 |
| 操作与锚点 | 实际点击开关不推进任务；44px触控、资源栏6px间距、提示位于任务卡下；100次稳定渲染无冗余DOM修改 |
| 对白 | 主线、故事实际进入、暂停、跳过后恢复；mainline-dialogue.png、story-dialogue.png及merged-ui.json |
| 动作与时钟 | 27项针对性测试通过；中间帧独立表现状态、25Hz射速、半小时模拟时间、传送/切地图不跨场插值；unit-final.log |
| 遮挡与通行 | 不改深度和碰撞；热点离屏隐藏、入镜使用新坐标、缩放保持44px下限的回归通过 |
| 缓存与资源预算 | 无新增图集或像素缓存；WeakMap按权威对象回收，数组缩短、Map删除和循环引用已验证 |
| 性能 | 最新主分支对照主线3.20ms→1.19ms；整帧波动较大，最终代码两轮约47～56fps，不能声称稳定60 |
| 物理手机 | 本环境未连接真机；Mate 50 Pro半小时热机待真实新日志验证，未以浏览器尺寸模拟冒充实机 |

正式入口：createMainline.renderFrame、createTaskNavigation.render、placeSceneHit、createRenderInterpolation.sample及src/rendering/visual-review.js#inspectSixtyFps。
designCriterion：sixty-fps-hotpaths；合同已登记至visual-contract.json。
结论：本轮无效提交削减与交互回归通过；稳定60fps和手机热机目标尚未验收。详细数据见[性能报告](../sixty-fps-performance.md)。
