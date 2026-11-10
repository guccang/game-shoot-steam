# 默认营地矩形边界

依据美术任务单记录；本轮为既有程序场景几何调整，无新增图片。

## 1 任务与目标

用户截图 c8429781-afe6-431a-979b-dd18cbd13b12 显示南部邻里小院造成阶梯突出。默认营地与邻里外围统一矩形，保留已购地契、扩建区域、玩家设施和通行规则。

## 2 造型与空间

围栏继续使用正式材质、尺寸与底座锚点，只调整世界分布。默认矩形包围既有营地和邻里设施，删除南侧内折围栏。东侧分两处开门，保留营地与消防站接驳。玩家历史扩建按区域并集保留，重叠处不生成内部围栏。

## 3 技术交付

src/world/camp-boundary.js 的 campBoundary 同供规划预览、场景围栏和碰撞；outline 支持重叠扩建边界裁剪。src/world/camp-layout-roads.js 将可通行广场支路连接到中心，避免南侧目标落入邻接工坊。
沿用当前坐标、地面与主体分层、日夜色调，无新增位图、透明处理、素材或动作时钟。缓存沿用64项上限，无新缓存或PNG。面积报价及土地所有权不变，默认外框整齐不自动授予未购地契。

## 4 动画任务

不适用：几何布局调整，角色、怪物、武器与载具动作不修改。

## 5 生成方式

未调用 imagegen；复用正式程序围栏和规划绘制，不需要美术精修或PNG替换。

## 6 验收

- designCriterion：camp-management-decor 的规划与真实边界一致、通行和手机昼夜可读。
- tests/rectangular-camp-boundary.test.mjs 两项通过：起始/完整营地四边矩形，旧内折无阻挡、新南界有阻挡，历史南扩重叠无内部围栏。
- tests/camp-area-expansion.test.mjs 四项通过；四方向连续扩建中 warehouseDepot 道路不可达断言失败，在未修改主分支同样失败，记录为既有问题。
- tests/rectangular-camp-boundary-browser.cjs 正式手机规划与昼夜场景通过，无页面运行错误。人工检查原南侧内折已消失、场景地面正常。
- 证据：output/playwright/rectangular-camp-boundary/layout-map.png、layout.png、day.png、night.png、video/。
- 新资源、动画、桌面布局、UI改造不适用；本轮不新增这些内容。沿用手机底板与按钮。
- 结论：本次矩形边界修复通过，已说明既有扩建道路测试失败，不以此冒充全量测试通过。
