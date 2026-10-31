# 剩余UI图标统一PNG任务单

> 当前状态（2026-10-27）：用户认为图案与真实游戏对象不一致且效果没有提升，本轮PNG运行替换已撤回，恢复原程序/SVG入口。下文仅保留当时的生成与验收历史，不作为当前运行效果或后续批量精修批准；见[回退任务单](ui-art-rollback.md)。

执行[美术生成标准](../art-generation-standard.md)，按[任务单](../art-generation-brief.md)记录，沿用环境样品风格。

## 1 目标与范围

最终交付96枚独立PNG，覆盖资源、祝福、战斗状态、通用控件、故事导航、8辆载具、6个领主、6只猫、18种武器、加载车身和车轮、工具与地图。详细中文名称、稳定标识及结构差异见 assets/ui/source/png-v1/catalog.json；运行清单为 assets/ui/manifest.json。11批共生成98个图案，其中锤子、背包没有运行入口，仅保留源图，不计入运行资源。连同上一轮12枚环境图标，共108枚。
使用game-engine的generate-service/gpt-image-2.5重新设计，参考已批准的environment-png-sample.png。用途为菜单、钱包、奖励、祝福、状态、导航、分类及静态画像。保留动态进度、数值、存档、点击、键盘和导航规则；工坊动作预览及世界角色/武器/载具实体继续使用正式绘制器。

## 2 造型与空间

统一森林绿描边、奶油高光、有限平涂，左上受光；结构差异逐项记录于catalog。透明底、无文字；等级底徽中央留空叠程序数字。导航箭头与状态开关分别提供图案。加载车身与车轮分离，轮辐真实独立旋转。界面图标不改变世界通路与碰撞，不新增阴影和场景实体。

## 3 技术交付

标准图案128×128，几何中心(64,64)，最大边112px，透明边距8px。运行显示16–88px，按钮保持44px触控。运行目录assets/ui；原图、请求、响应、处理脚本在source/png-v1，由既有打包规则排除。DOM图片或Canvas drawImage共用PNG缓存，数值与进度独立。预算PNG≤2MiB，RGBA≤6MiB，昼夜共用、不重复缓存。加载车身另保持横向比例。

## 4 动画任务补充

静态图案不适用身体动作。保留圆环实时时钟、导航角度、加载进度及暂停/减少动态；加载车轮独立转动，车身不代替轮辐运动。猫视频帧、手持武器、旋翼和履带不改。

## 5 生成指令

11批透明图集，分别使用4×3、4×2、2×2及单图排布，严格对应catalog顺序；全套使用同一参考图和提示规范。原生透明、禁止字母数字和底板；详见每批request.json、response.json、upload.json和atlas.source.png。生成预览不作为实机验收。服务请求指定gpt-image-2.5；响应未提供实际模型名和token计费字段，不推测计费。

## 6 验收记录

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 系列一致、变体可辨 | [图标1–48](../art-reference/ui-png-sheet-1.png)、[图标49–96](../art-reference/ui-png-sheet-2.png)。已人工检查轮廓、透明边缘、森林绿与奶油色；修正四批图集裁切边界，消除相邻图案碎片。 |
| 落地与遮挡合理 | 本轮为UI图案，无新场景实体、地面投影或碰撞。世界采集图标沿原绘制位置替换。工坊中央装备动作、改装部件结构对比、玩法插画和地图仍为原正式绘制器内容，不用静态图标覆盖。 |
| 保留活动空间与真实边界 | 不修改世界几何、坐标、通路或深度排序；白天、夜晚截图可见猫、怪物、载具、麦田与环境。 |
| 动作与部件独立 | 实际点击开始，连续帧采样车轮至少两个不同旋转矩阵；车身与轮子分图。弹药外环25%、内环65%使用同一动态SVG节点；PNG导航随位置旋转。角色真实视频与操枪、载具履带旋翼未改动。 |
| 白天夜晚可读 | [390白天](../art-reference/ui-png-complete/hud-390-day.png)、[390夜晚](../art-reference/ui-png-complete/hud-390-night.png)同屏人工检查通过。 |
| 手机和既有桌面容器合格 | 320×568、390×844、844×390、1100×844各昼夜两组，无横向溢出；截图位于docs/art-reference/ui-png-complete/hud-*.png。未新增桌面布局。 |
| 真实交互保持 | 资源说明关闭、6猫头像、综合工坊货架选择、声音开关、寻路开关、地图打开、秘境祝福选择均通过；关闭寻路不推进任务。见[菜单](../art-reference/ui-png-complete/menu.png)、[武器](../art-reference/ui-png-complete/weapons.png)、[载具](../art-reference/ui-png-complete/vehicle-workshop.png)、[关闭寻路](../art-reference/ui-png-complete/navigation-off.png)。 |
| 资源完整及预算 | 96张128×128透明PNG全部解码，1,663,794字节，RGBA共6,291,456字节；在2MiB压缩、6MiB基础解码预算内。六任务并发预载，昼夜共用；实际浏览器/GPU额外开销不计入基础像素预算。源图、请求记录由现有assets/**/source打包排除。 |
| 素材缺失明确失败 | 拦截settings.png后首页提示错误、开始按钮禁用；[缺图实机截图](../art-reference/ui-png-complete/missing.png)。 |

正式绘制器入口：src/platform/ui-art.js（loadUiArt/uiIcon/paintUiIcon）、src/rendering/resource-icons.js、src/rendering/blessing-icons.js、src/ui/status-rings.js、src/ui/workshop.js；验收采样绑定src/rendering/visual-review.js#inspectUiPng。动态圆环、倒计时与引导曲线继续使用SVG几何，它们不属于静态美术图标。

`designCriterion`：ui-png-complete。浏览器脚本tests/ui-png-browser.cjs使用隔离存档，11项交互与资源检查、8组昼夜布局通过，页面错误0；[结构化结果](../art-reference/ui-png-complete/result.json)。录制和详细日志在output/playwright/ui-png与output/ui-png，保留在主目录。

针对性单测共25项，23通过；story-navigation与wave-tail-navigation各1项旧世界环绕预期失败，已在未改动master复现相同失败，本轮未修改坐标逻辑。没有运行全量测试。合并主分支地图缓存和工坊入口变更后，冲突仅为visual-contract.json新增条目，双方保留。

结论：通过。2026-10-27合并到master，4175实机核对版本a1b944d：隔离存档重新进入、展开菜单、点击地图均正常；[4175菜单](../art-reference/ui-png-complete/4175-menu.png)、[4175地图](../art-reference/ui-png-complete/4175-map.png)、[4175结果](../art-reference/ui-png-complete/4175-result.json)。网络map.png与主目录SHA256一致，服务返回Cache-Control: no-cache，普通刷新获得新文件。本记录提交只补充验收证据，不再改变运行代码。
