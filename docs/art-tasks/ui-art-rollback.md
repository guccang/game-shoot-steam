# UI图案回退任务单

执行[美术标准](../art-generation-standard.md)与[任务模板](../art-generation-brief.md)，2026-10-27。

## 1 目标与范围

当前阶段：恢复已验证的程序/SVG表现。本轮按用户要求撤回两轮UI的108枚PNG运行资产（96枚通用图标、12枚环境样品），恢复替换前的正式绘制入口。原因是武器、载具和任务等图案与游戏实体不一致，用户认为效果没有提升。参考为PNG迁移前的源码与SVG；不重新生成图片。

恢复资源、祝福、状态、导航、菜单、头像、装备与加载车等入口，保留稳定ID、数值、点击与存档、动态进度和动画时钟。地图缓存、工坊进出与后续HUD性能优化继续保留。AGENTS.md、生成标准和任务模板的新开发流程不回退。

## 2 造型与空间

武器缩略图恢复drawWeapon/drawFunnelIcon，载具恢复drawVehicleIcon，沿用正式实体绘制结构及当前装备选择；任务和环境恢复原SVG轮廓。保留原森林配色、既有界面尺寸与触控区域，不引入新场景实体、阴影、碰撞或通路变化。

## 3 技术交付

以两次PNG接入提交的运行代码差异为边界反向应用，避免覆盖后续无关提交。12个环境SVG恢复原路径；移除108个运行PNG、对应预载器和PNG专用样式、清单及失效验收入口。源图、生成请求与历史截图保留为非运行资料；旧任务单标记已撤回。

图案的逻辑尺寸、Canvas画布、SVG viewBox、锚点与层级恢复迁移前值，无新增图集或解码缓存；释放本轮PNG带来的加载与解码需求。运行包继续排除source。正式代码不依赖这些已撤回PNG，其他角色图集、地图预览及玩法插画维持既有交付格式。

## 4 动画与交互

恢复原独立车轮SVG动画；保留状态双圆环、环境圆环与导航箭头的实时更新。角色真实视频帧、独立操枪、怪物动作及载具履带/旋翼不更换。连续帧来源不适用本轮静态图案回退，沿用已有真实动作素材。验收使用隔离浏览器存档，不修改玩家存档。

## 5 生成指令

不适用：本轮直接恢复历史源码和SVG，没有imagegen请求。后续若重新精修PNG，应先以对应正式游戏对象为参考确认一致性，本轮不启动新的精修批次。

## 6 验收记录

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 图案与正式对象一致 | [菜单](../art-reference/ui-art-rollback/menu.png)、[工坊](../art-reference/ui-art-rollback/workshop.png)。菜单中手枪、加特林、浮游炮及载具与正式绘制器比对通过。前三项中的浮游炮因Canvas栅格化有平均通道0.754/255差异，低于1/255阈值，已人工检查[放大对照](../art-reference/ui-art-rollback/icon-comparison.png)轮廓与部件一致；其余三项误差0。 |
| 原环境资产完整 | 12个SVG字节内容（忽略换行格式）与迁移前版本一致；正常解码，环境设置切换后仍加载SVG。 |
| 动态反馈与交互 | 加载SVG轮辐逐帧采样有不同旋转矩阵；弹药外环25%、内环65%沿用原动态节点；导航SVG两态切换不改变已完成任务；资源说明、声音、工坊、地图、祝福实际点击通过。见[加载](../art-reference/ui-art-rollback/loading.png)、[导航关闭](../art-reference/ui-art-rollback/navigation-off.png)、[祝福](../art-reference/ui-art-rollback/blessings.png)。 |
| 手机昼夜及整体效果 | 320×568、390×844、844×390、1100×844各昼夜两组通过，无横向溢出；猫、怪物、载具、环境、UI同屏人工检查完成。[320白天](../art-reference/ui-art-rollback/hud-320-day.png)、[390夜晚](../art-reference/ui-art-rollback/hud-390-night.png)、[短屏夜晚](../art-reference/ui-art-rollback/hud-844-night.png)。 |
| 遮挡、通路与动作 | 本轮未改变世界几何、碰撞及实体动作；同屏环境与真实实体保留。无需新增绕行或动作素材生成，角色连续帧和独立操枪沿用既有实现。 |
| 资源与预算 | 已删除108个运行PNG及两个PNG清单、专用预载和样式；正常流程相关PNG请求0、PNG节点0、页面错误0。没有新增图集或图片解码缓存，源码与历史来源资料分离。 |
| 后续改动保持 | AGENTS.md、标准、模板及地图缓存、工坊进出、HUD性能相关10个文件与回退前HEAD逐字核对一致；正式验收合同保留地图、工坊与性能条目。 |

浏览器结果见[结构化记录](../art-reference/ui-art-rollback/result.json)，脚本tests/ui-art-rollback-browser.cjs。原始录制与日志保存至主目录output/playwright/ui-art-rollback及output/ui-art-rollback。

针对性单测30项：圆环、加载、导航、拾取、性能等26项通过；blessing-summary.test.mjs的4项在未修改master也全部同样失败，属既有夹具/状态问题，本轮未修改对应规则或存档代码。未运行全量测试。

正式入口：src/ui/inventory.js、src/rendering/characters.js、src/rendering/vehicle.js、src/rendering/resource-icons.js、src/ui/status-rings.js、src/ui/panels/environment.js；采样入口src/rendering/visual-review.js#inspectUiArtRollback。

designCriterion：ui-art-rollback。动态效果回退验收：通过。后续PNG精修：本轮未开展。

4175正式目录核对：合并版本a7a83a4，浏览器实际重新入场并打开菜单、资源说明和工坊；无页面错误、无已撤回PNG请求，环境实际加载SVG，服务返回no-cache。见[4175菜单](../art-reference/ui-art-rollback/4175-menu.png)、[4175工坊](../art-reference/ui-art-rollback/4175-workshop.png)、[4175结果](../art-reference/ui-art-rollback/4175-result.json)。本段后续提交仅补验收记录，不改运行代码。
