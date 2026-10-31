# 共用绘制主体与风格配置

依据：[美术标准](../art-generation-standard.md)、[现有风格说明](../art-styles.md)。

## 制作前约定

本轮优化已有两套风格的维护方式：颜色、线宽、形状数据与细节密度进入配置，共同坐标变换、分层、动作读取和绘制流程只保留一份。保留「原版森林 / 清澈卡通」的已确认外观、设置即时切换、缺图提示及显示偏好。不生成新图片、不新增玩法、不合并master，继续独立工作树。

参照为`fa99552`两套风格；在迁移前从其正式绘制器采样像素指纹，迁移后在同一浏览器同尺寸/相位比较。尺寸、锚点、图集倍率、角色视频帧、四轮/炮口/后坐与昼夜天气时钟不变。造型确有区别的麦穗/水纹等允许由配置选择局部细节实现，但不得继续复制整个场景或载具绘制模块。

目录目标：`src/rendering/`保留唯一主体；`src/art-styles/classic/`和`clear/`只保存数据配置；PNG沿用`assets/art-styles/`，不改尺寸与锚点。缓存改为共用并在切换时释放，不保留重复图集。新文件与函数附中文注释。

验收目标`shared-art-rendering`：迁移前后两种风格同相位绘制一致、配置键/数据类型完整；手机320/390实际昼夜雨雪、设置切换及原动态交互；缺图失败后可重试、缓存受限且无旧风格残留。针对性单测与依赖检查，不执行全量测试；证据放`output/playwright/shared-art-rendering/`，完成后补录。

PNG精修、物理手机GPU基准和新造型不属于本轮范围。

## 目标、结构与交付记录

| 项目 | 本轮实际结果 |
| --- | --- |
| 名称、稳定标识、阶段 | 共用绘制主体与风格配置 / shared-art-rendering / 既有动态效果的结构优化 |
| 数量与变体 | 56个公共模块；classic、clear两种配置；删除112个重复风格模块 |
| 主体剪影与空间 | 原版森林与清澈卡通各自保持已确认剪影；四轮、驾驶位、主炮、建筑入口及麦田范围不变 |
| 邻接、光向与主次 | 沿用原营地、树林、湖岸及秘境排列；原左上受光、接触影和昼夜材质流程保持 |
| 尺寸、锚点、透明 | 原函数参数、世界坐标和图集倍率保持；小屋360×328、逻辑180×164、门槛锚点(180,296)；地图720×560；未裁切或改透明边缘 |
| 分层与部件 | 共用前后车体、车轮、人物视频帧、独立主炮及后坐；地面、建筑、夜间窗光和雪层顺序保持 |
| 碰撞、遮挡与通行 | 未修改世界几何和碰撞文件；两种风格前后234张像素一致，行驶检查确认原位置与轮角继续推进；本轮不新增通行区域 |
| 格式与入口 | src/rendering/ 唯一主体；src/art-styles/config.js 实时绑定两份profile.json；controller.js 预载和释放共用缓存 |
| 图片与程序职责 | 本轮PNG内容零改动；程序继续控制状态、点击、动作时钟、进度、昼夜、雨雪和季节；后续精修仍按imagegen→独立PNG部件流程 |
| 必需素材失败 | 小屋缺图时中文报错、保留当前风格及战斗快照；解除阻断后同一页面重试成功 |
| 配置约束 | 普通只读数据，两份键和类型一致；单测检查所有正式绘制器style字段存在，接口清单保持 |
| 源码体积 | 同一56模块范围：原入口及双份实现624,972字节；共用主体含两份配置384,231字节，约减少38.5%；不是帧率提升声明 |
| 图集预算 | 切换提交时树木、景物、山体、怪物共用图集均为0字节；连续切换后地块12/64、地图缓存不超过2张，无contextLost；两张小屋原图仍约0.90MiB |

## 动作与生成记录

本轮没有使用imagegen：目标是保留已确认画面并合并代码，重新生成图片会引入无关视觉变化。未修改SVG、角色源视频、视频帧清单或运行PNG。角色真实连续帧仍由既有播放器使用；车轮位移相位、炮口与后坐由原玩法时钟输入共用绘制器，不重置游戏或天气对象。

程序动作入口为`src/rendering/pine-wheels.js`、`vehicle.js`、`vehicle-armaments.js`；场景入口为`ground-art.js`、`scenery.js`和原各公共模块。局部麦穗、水纹形状可由配置选择细节；世界变换、分层、碰撞与控制器不复制。后续PNG精修不属于本轮交付。

## 验收结果

正式检查入口：`src/rendering/visual-review.js#inspectSharedArt`；合同：`visual-contract.json#sharedArtRenderingCriterion`。

| 设计目标 | 证据及结论 |
| --- | --- |
| 保留系列风格与变体 | [像素基线](../art-reference/shared-art-rendering/pixel-baseline.json)来自fa99552；同浏览器234个样本逐像素无差异，覆盖装备、动态相位、场景、建筑、四季及昼夜。通过 |
| 实际同屏观感 | 人工查看390×844的[清澈白天](../art-reference/shared-art-rendering/clear-day-sun.png)、[清澈夜雨](../art-reference/shared-art-rendering/clear-night-rain.png)、[原版白天](../art-reference/shared-art-rendering/classic-day-sun.png)、[原版夜雨](../art-reference/shared-art-rendering/classic-night-rain.png)与[冬季积雪](../art-reference/shared-art-rendering/clear-day-snow.png)。结构、描边与色块保持，通过 |
| 动态与交互 | 手机触控设置切换前后战斗快照相同；两种风格行驶推进轮角；射击扣弹且主炮后坐；昼夜、天气、季节过渡保留原实例；连续切换与重载记忆通过 |
| 手机及既有竖版容器 | 390×844及320×568，风格按钮127×46，未横向溢出；[短屏设置](../art-reference/shared-art-rendering/settings-320.png)。使用Chromium手机视口与触控模拟，未做物理手机GPU测试，不新增PC布局 |
| 资源完整与释放 | 缺图、重试、旧图集释放、地图按风格加载、HUD跟随切换通过；重新导出的10张地图PNG字节不变，只更新递归源码指纹 |
| 遮挡、通行边界 | 本轮未改几何数据、缩放或脚底排序；固定画面完全一致，场景行驶通过。不扩展至全地图碰撞专项验收 |
| PNG替换 | 不适用，本轮只合并程序绘制并复用全部既有PNG；后续精修单独验收 |
| 针对性单测 | 共20项，19项通过。唯一失败为tests/lighting.test.mjs:51的旧亮度阈值，在未修改的fa99552也同样失败；未为通过测试改变已确认外观。配置专项5项全部通过 |

汇总：[verification.json](../art-reference/shared-art-rendering/verification.json)。本地原始日志、前后采样、录制与完整截图位于`output/playwright/shared-art-rendering/`，连续操作录制为`switching.webm`。

本轮结论：按保留外观、共用绘制和配置切换的范围通过；已记录既有照明测试问题。独立分支`codex/shared-art-rendering`，不合并master。开发验证4177，交付预览4176；默认开发端口规则仍为4175。

## 2026-10-28 合并master补充

用户确认合并后，与master的faa97bd整合。保留实景种地、足球站牌计分、手机地图入口、双季缓存预热及剧情插值修复。场景冲突采用共用主体，并补入玩家田区跳过静态耕地及足球统计牌面。

合并范围另包含双季缓存适配：切换风格重建current/staged/source中的派生纹理，不更换SeasonGroundCache和SeasonTransition对象，不丢失请求、遮罩或已开始渐变的来源。新增专项验证覆盖预制阶段和渐变阶段的纹理释放、时钟保持及双池上限。原234张一致性结果属于合并前重构基线；master新增农田与计分牌属于预期画面变化，地图底图需按合并后正式绘制器重新导出。

合并验收结果：41项针对性单测通过（风格、换季与预热门禁、农田、足球统计、剧情插值及地图资源）；风格切换、缺图恢复、地图经手机打开与足球牌面浏览器检查通过，零页面异常。人工复核合并后的白天/夜雨场景和足球牌面。证据：[合并汇总](../art-reference/shared-art-rendering/merge-verification.json)、[白天](../art-reference/shared-art-rendering/merge-day.png)、[夜雨](../art-reference/shared-art-rendering/merge-night.png)、[足球](../art-reference/shared-art-rendering/merge-football.png)。四季森林底图随农田布局更新，九寨沟底图不变。

合并后由master提供4176预览，保留原有4175服务；前序art-style-options与art-style-switch工作树已归档移除，本地原始验收记录另存主仓库output/art-archive/。当前shared-art-rendering被应用标记为任务主检出，归档工具拒绝移除，因此保留该干净工作树；代码已完整合并，4176不再依赖它。
