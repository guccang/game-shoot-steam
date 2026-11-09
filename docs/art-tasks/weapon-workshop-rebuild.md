# 武器工坊破败与重建美术任务单

## 1 目标与范围

- 标识：weapon-workshop-rebuild；类别：正式Canvas建筑、施工表现与屋顶计时。
- 目标：剧情初见明确是破败工坊，280份木材重建历时5秒，成功后立即出现完整新工坊。与巡林小屋通过低斜顶、宽开放工作间、侧排烟筒和工具墙区分。
- 变体：破败版有缺损屋板、裸露梁架、裂墙和封门板；新版有完整草木绿金属屋面、浅木墙、开放工作台与器械标牌。施工不是整栋建筑拉伸或旋转，而是独立屋面板落位。
- 参考：docs/art-reference/landscape-six-day.png、landscape-six-night.png，以及src/rendering/garage.js、原workshop-building.js的工具细节。
- 保留：原建筑位置、停车位、门前点击范围、通行几何、角色连续帧、独立操枪和昼夜绘制。

## 2 造型与空间

低宽非对称轮廓取代尖顶小屋，左上受光、右侧冷影。底座贴地，工作间居中，工具墙靠右；烟筒在后层，屋面与立柱在前层。破败两种主要差异为屋顶缺口与封闭破损门面，而非仅换色。脚手架只在重建期间显示并收在原轮廓附近，不新增碰撞或占用停车位。

## 3 技术交付

原世界锚点(500,610)、size=0.82保留；局部主体约150×125，原180×164双倍Canvas可容纳。房屋脚底为锚点，地面投影沿用原地面层；实体正式排序与屋后透显保留。静态完好/破败共两种图集键，最多各含非雪/雪与昼/夜四份，约3.78MB RGBA上限；施工板和计时即时绘制，不逐帧生成图集。无位图、视频或新增外部资源，透明背景、雪层贴合各自屋面。倒计时以固定屏幕尺寸位于屋顶上方，中文5至1秒和完成状态。

## 4 动画任务

五秒与正式施工时钟同步；屋面分片从上方短距离落位，脚手架固定，暂停保留施工进度。保存失败保持施工待重试，成功才切完整建筑并显示短暂完成提示，随后延续首枪制作引导。没有新角色、腿部或机械运动，原猫连续帧不变，源视频和图集动画项不适用。

## 5 制作说明

用程序化独立建筑替换原小屋叠加门面，森林绿轮廓、奶油木墙、灰绿屋面、柔和少量高光。新工坊可辨识为制作与修理场所，不使用圆拱家门、花盆门廊或橙瓦尖顶。破败保留同一底座与梁架，不画成废墟大坑，不改变道路。

## 6 验收记录

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 工坊与小屋不同、破败和新建可辨 | 通过：ruined/ready-{1280,390,320}-{day,night}.png；overview-{1280,390}-{day,night}.png实际同屏对照低斜顶工坊和橙瓦尖顶小屋，开放工作间/工具墙可辨，破败版缺面裸梁与封门板明确 |
| 五秒施工、屋顶提示可读 | 通过：rebuilding-{1280,390,320}-{day,night}.png与success-live.png；320宽的任务卡遮挡问题已修订，施工及完成短展示期间收起卡片和操作引导，屋顶计时完整可见；成功后留1.2秒看新建筑再接首枪制作 |
| 实际点击与剧情延续 | 通过：workshop-rebuild-browser.cjs实际点击建筑、提交280份木材、等待五秒、显示新造型并自动接制作；首枪仍3秒且消耗8份，页面错误0 |
| 停车与通行 | 通过：parked-live.png，真实上车、驶离原泊位保护范围、返回候停倒入、自动下车和打开武器工坊；门前实际方向键行走畅通。未改变泊位和任何碰撞数据 |
| 落地、前后遮挡与原动作 | 通过：behind.png、in-front.png，角色真实走过屋后和门前，正式脚底排序与透显保留；原猫连续帧和独立武器保持，施工屋面片独立运动，未拉伸整栋建筑 |
| 施工连续性 | 通过：motion-{0,0_4,0_8,1_6,2_4,3_2,4_4,4_9}.png连续取样，屋面片分次落位且计时5至1秒同步；时钟暂停/恢复由规则测试覆盖 |
| 昼夜、季节与同屏 | 通过：camp-context-day/night.png、overview系列包含角色、怪物、停驻车、建筑和HUD；winter-{ruined,ready}-{day,night}.png积雪沿斜屋面分片铺设，缺顶保留空洞，不残留旧民居三角雪顶 |
| 资源预算 | 通过：只生成两种静态形态×无雪/有雪×昼夜，180×164的2倍Canvas共至多3,778,560字节RGBA，施工100帧采样前后图集count/bytes不增加；无新增位图、视频或外部素材，无缺失资源替代 |

截图与机器结果位于output/playwright/workshop-rebuild/，共40张实机截图。规则检查：tests/workshop-rebuild.test.mjs和tests/ranger-arrival.test.mjs共17项通过，入职操作提示的2项针对性检查通过；覆盖五秒边界、暂停、刷新、保存失败、原报价和单次扣料。未运行全量测试。

正式入口：src/rendering/weapon-workshop-building.js#drawWeaponWorkshop / drawWeaponWorkshopConstruction、src/rendering/scenery.js#drawScenery、src/rendering/ranger-arrival.js#drawWorkshopBuildCountdown、src/rendering/renderer.js。验收投影：src/rendering/visual-review.js#inspectWorkshopRebuild及workshop-building-ruined/rebuild昼夜案例，visual-contract.json绑定designCriterion=weapon-workshop-rebuild。结论：通过。


## 2026-10-29 全建筑三秒修复

首次武器工坊及后续13项营地设施从开工投料至完工统一3秒，包含0.9秒木料飞行；施工段为2.1秒。统一时长源为src/config/building-repair-timing.js，屋顶圆环、横条和入职提示均读取相同时间。沿用原建筑图集、屋面施工动作、锤子、颜色、尺寸与层级，无新增美术资源；本次仅修改时长及剩余秒数，无需生成图片。

验收：tests/building-repair-timing.test.mjs、repair-ui-house-entry.test.mjs、fire-station-render.test.mjs、workshop-rebuild.test.mjs共19项通过。2.95秒仍施工，累计3秒完成；全部13项后续设施均覆盖，暂停冻结、读档续修、旧进度超过3秒、保存失败重试和单次扣料通过。旧工坊测试同步三秒规则及现有完工木料谢礼预期，奖励规则未改。

浏览器tests/building-repair-timing-browser.cjs覆盖320×568、390×844昼夜的武器工坊与巡林小屋，共8组；正式修复事务启动后显示3秒，推进1秒显示2秒，2.95秒未开放，3秒开放，页面错误0。已复核武器工坊320白天和小屋390夜晚的施工圈、横条、屋面与角色同屏。证据位于主工作区output/playwright/building-repair-three-seconds/，4175已有服务，隔离验收使用4176。

正式入口：src/core/camp/ranger-arrival.js#updateArrival / workshopBuildView、src/core/camp/town-restoration.js#updateRestoration、src/ui/ranger-arrival.js；继续使用weapon-workshop-rebuild设计目标及既有正式绘制器。结论：通过，本节替代前文五秒施工时长，不改变建筑费用、开放条件和施工效果。
