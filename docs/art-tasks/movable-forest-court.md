# 林间球场布局移动

依据美术生成任务单记录本次既有设施接入，不新增美术资产。

## 1 任务与阶段

开发阶段：让林间球场进入营地布局可移动列表，站牌、修复入口与任务导航共同迁移。参考用户截图 codex-clipboard-d53d7192-abc5-4b0f-9dab-a53d4fcc2ec3.png 与正式球场记分牌。保留累计进球、单场最高、玩法规则、角色动画及原始绘制。

## 2 造型与空间

正式场景沿用双柱记分牌，不改颜色、形体、光向与比例。规划图复用既有告示牌图标，以选择后的中文名称辨识。占地宽112高90，原位置来自 TOWN_LAYOUT.football；南侧候停点保持30单位偏移。布局沿用建筑避让，入口连接24单位细路。

## 3 技术交付

源码：src/config/camp-layout.js、src/config/camp-roads.js、src/rendering/camp-layout-icons.js。锚点复用 src/world/camp-layout-bindings.js，正式场景使用 src/rendering/town-restoration.js 与 football-scoreboard.js。
规划图标沿用160单位局部坐标和底边锚点，界面等比缩放。世界场景的地面、主体、实时进球文字与夜色保持原分层。不新增PNG、纹理、时钟或缓存；新增资源内存0。没有新增素材加载失败行为；保留原有通行规则和修复权限。

## 4 动画任务补充

不适用：只登记可移动设施并复用图标，既有角色、载具和怪物动画不变。保存失败不迁移锚点，重新读档不累积偏移。

## 5 生成指令

未使用 imagegen：复用已确认的站牌图标和正式记分牌，不需要生成或精修PNG。

## 6 验收记录

- designCriterion：对应 football-station-scoreboard 的实际站牌与统计显示，以及 camp-management-decor 的布局保存、道路连接与手机昼夜目标。
- tests/movable-forest-court.test.mjs 通过：失败回滚、成功迁移、候停点和任务导航同步、细路连接、读档与默认位置恢复。
- tests/movable-forest-court-browser.cjs 通过：390宽手机营地布局选择林间球场，点击方向移动并保存，正式场景昼夜检查，无页面运行错误。
- 人工复核 output/playwright/movable-forest-court/layout.png、day.png、night.png：布局提示放置可用、道路已连接，正式记分牌与道路位置一致，夜间可见。连续过程见同目录 video/。
- 无新增页面、按钮或文字布局，不新增桌面界面；复用现有手机框架。没有修改物理、动作和水界，本次不重复这些模块的独立验收。
- 本次结论：通过。无待精修资产，不宣称新增PNG或角色动作。
