# 营地气候、环境预览与选时睡眠

日期：2026-11-10。由任务模板复制，执行[游戏美术资源生成标准](../art-generation-standard.md)与 [AGENTS.md](../../AGENTS.md)。本轮为程序动态开发，复用已确认Canvas与SVG，不进行PNG精修替换。

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 资源中文名称与稳定标识 | 营地气候与积雪 / camp-climate-sleep |
| 类别和用途 | 环境动态、房屋树冠积雪、Debug与休息界面 |
| 当前阶段与本轮范围 | 动态效果开发；不替换PNG |
| 本轮目标 | 五营地各有偏好天气，大雪渐积、晴天渐融 |
| 动态效果与交互目标 | Debug仅预览，时间统计独立；床边选早晨/黄昏/夜晚；手机天气只读 |
| 数量和变体 | 五种气候；晴、小雨、雷阵雨、大雪、大风 |
| 保留项 | 猫连续帧、独立操枪、原树冠屋顶、路径和碰撞 |
| 制作路线 | 复用正式Canvas雪层与SVG天气图标；本轮无需生成图片 |
| 参考与同类资产 | docs/art-reference/landscape-six-day.png、landscape-six-night.png；既有winter-art与building-architecture |
| 已确认效果与精修参照 | 在真实游戏的手机尺寸浏览器中确认降雪至融雪连续性 |
| 后续精修项 | PNG精修留待后续专门阶段；动态积雪仍由程序控制 |
| 使用场景 | 森林及五座地区营地 |

## 2 造型与空间

复用原树种剪影、屋顶受雪顶面、森林绿描边与奶油雪色；亮面朝左上。屋顶雪沿檐线，树冠雪沿叶团，结构不同。入口、道路和树根锚点不变，无新增阻挡。

## 3 技术交付

树画布256×320（2倍），逻辑128×160，脚底(64,145)；建筑沿用各自静态缓存边界。透明雪层与实体共用深度、风摆和透显。昼夜复用已有雪面色板。程序控制积雪量、渐变、选项和日期。树图集受96项缓存上限约束，建筑复用现有有雪/无雪端点，不按积雪进度缓存新图。既有素材缺失仍按原加载错误报告。本轮不增加运行位图下载。树混合画布256×320（327,680字节）；建筑共用512×400混合画布（819,200字节），不按建筑数或雪量创建缓存键；建筑原缓存上限仍为8MiB。原地面缓存的冬季雪地基底继续由季节控制，本轮连续天气积雪范围为房屋、树冠、树根雪坡及已有景物受雪顶面。

## 4 动画任务补充

积雪与融雪按有效游玩毫秒推进，暂停/后台不补跑，雪天约90秒积满，晴天约120秒融尽；不改变现有稳定雪花种子、近角色清晰度、数量上限及独立操枪。程序入口src/world/snow-cover.js；不新增角色、怪物或载具帧，视频来源字段不适用。

## 5 生成指令

本轮不使用imagegen：已有雪顶、雪冠和天气SVG可直接复用，仅开发动态效果。正式入口src/rendering/renderer.js、tree-art.js、camp-building-cache.js。

## 6 验收记录

| 设计目标 | 实际结果与证据 | 结论 |
| --- | --- | --- |
| Debug切换不污染时间 | 四季、三时段、六天气实际点击；弹窗期间日期不变，返回场景后真实日期继续增长。纯时钟回归确认预览雨雪不进入天气统计，保存只取实际值，恢复不重启周期。`debug-390.png` | 通过 |
| 手机天气只读 | 天气节点改为DIV，移除点击切换、按钮状态和误导文案；仅Debug入口允许切换。季节/时段仍可查看日程。 | 通过 |
| 五地气候可辨 | 苔溪小雨、赤炉晴朗、雪松大雪、雨铃雷阵雨、层岩大风；主气候80%，余下按季节抽签。单测每地每季1000次精确800次，实机主循环验证逐地抵达与停留不重抽。允许实际抽到其他天气。`climate-report.json` | 通过 |
| 选时睡眠 | 床前候停1秒打开选择；取消不入睡；早晨/黄昏/夜晚落到下一次对应时段，分别标明今日/次日。保存失败不跳时、不回血、不完成首次休息；盆栽自然日期结算保留。`sleep-report.json` | 通过 |
| 积雪与融雪连续 | 实际运行雪量0.6633→0.8470；切晴2秒后降至0.8331，暂停保持0.6681不变。稳定雪花、树冠风摆、原雪顶材质保留，不添加全屏白雾。`snow-start.png`、`snow-building.png`、`actors-melting.png`与视频 | 通过 |
| 系列、落地与遮挡 | 沿用原树种、屋顶、底座、入口和世界深度；角色靠近屋顶的遮挡正常，实体和阴影位置一致。半雪端点使用预乘透明度混合，避免重复接触影。 | 通过；1343个半透明边界像素最大alpha差1/255，见blend-report.json |
| 动作和通行 | 实际触控移动从(37002,5978)至(37049.73,6074.79)，原猫动作与手持枪、怪物动作、载具保持独立；天气不修改碰撞。桥、水界无改动，不扩大测试。`climate-report.json`及视频 | 通过 |
| 昼夜同屏 | 手机画面同屏猫、怪物、停放载具、房屋、树冠、木栏和UI；日夜均可辨，夜间保留原光池。`actors-day.png`、`actors-night.png`、`blend-day.png`、`blend-night.png` | 通过 |
| 手机与现有竖版容器 | 战场320×568、390×844、844×390及1100×900的现有竖版容器；休息页320/360/390/430宽与844×390。所有按钮至少44px，横屏正文滚动、底部取消可达，无横向溢出。`layout-report.json`与`sleep-layout-*.png` | 通过；物理设备刘海/系统栏未测试 |
| 资源和预算 | 无新运行位图、无加载/游戏帧异常；树图集25项约8.13MiB，建筑缓存约5.27MiB，仍受原96项/8MiB约束。新增混合工作像素合计不超过1.1MiB。 | 通过 |
| PNG替换保持接口 | 本轮未生成或替换PNG；正式雪量和交互继续由程序控制。 | 后续专门精修阶段 |

正式入口：`src/rendering/renderer.js` → `drawTreeSprite` / `drawScenery` / `drawCachedCampArchitecture` / `drawRoofSurface`；`src/world/snow-cover.js`；`src/ui/panels/environment.js` / `src/ui/cottage-sleep.js`。气候概率、范围与积雪时长集中在 `src/config/camp-climate.js`。

验收入口：`visual-contract.json#campClimateSleep`、`src/rendering/visual-review.js#inspectCampClimate`，设计目标 `camp-climate-sleep`。

25项针对性逻辑回归通过：`camp-climate-sleep.test.mjs`、`cottage-auto-sleep.test.mjs`、`season-weather.test.mjs`、`weather-soft-cycle.test.mjs`、`gust-overlay.test.mjs`，以及 `cottage-rest-guide.test.mjs` 的选时睡眠/失败回滚/不合法场景3项和 `home-decor.test.mjs` 的睡眠成熟1项。仅运行这些相关用例，未运行全量测试。

浏览器脚本：[camp-climate-sleep-browser.cjs](../../tests/camp-climate-sleep-browser.cjs)。使用隔离浏览器存档，地址4175，路由读取本worktree正式资源（本机既有服务为较旧checkout，避免混用）。失败后仅复验受影响环节及新增范围；补充结果为`sleep-report.json`、`climate-report.json`、`layout-report.json`、`blend-report.json`，位于 `output/playwright/camp-climate-sleep/`。连续录制位于其`video/`目录。

已修订：四季按钮窄屏中文换行；小屋弹窗采用与武器架相同的body挂载方式，避免室内HUD隐藏规则误隐藏；建筑半雪混合避免接触影加深。

动态效果开发结论：通过。PNG精修替换结论：后续阶段。本次保留原角色、场景尺寸、稳定ID及交互接口，未增加新图集或改变季节地表基底。

长期参考：[昼景](../art-reference/camp-climate-day.png)、[夜景](../art-reference/camp-climate-night.png)、[Debug](../art-reference/camp-climate-debug.png)、[选时睡眠](../art-reference/camp-climate-sleep.png)。
