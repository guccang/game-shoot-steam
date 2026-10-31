# 建筑门口与猫猫头顶统一倒计时

## 1 目标与范围
- 标识：building-entry-countdown。类型：场景交互徽记和入口行为。
- 目标：小屋/工坊进出、床边休息及现有建筑/告示牌入口统一三秒候停，点击仍可用；数字与环形图标始终位于猫猫头顶。
- 参考：用户两张截图、现有停车徽记、action-countdown.js 与正式小屋/工坊/地图绘制器；遵循 docs/art-generation-standard.md。
- 保留：角色真实连续帧、独立武器、建筑与家具造型、碰撞、停车、任务与活动条件。
- 路线：代码原生 Canvas 徽记，不生成位图，不新增建筑或不存在的功能。

## 2 造型与空间
- 奶油色圆角底、森林绿描边；左侧独立功能图标、浅色完整圆环及进度弧，右侧数字。
- 68×34 屏幕像素，按真实脚底、猫身高与当前缩放计算位置；猫耳与徽记下缘留空，不随缩放压住头部。
- 场景徽记在天气/色调之后绘制；室内地垫先画再画猫，避免出口标签遮脸。
- 房间门、床与场景入口不堆文字倒计时；不改变通道或树木布置。

## 3 技术交付
- 新逻辑配置/控制器：config/building-entries.js、core/building-entry.js；入口完成复用原页面或场景方法。
- 绘制入口：rendering/player-action-countdown.js，原点为徽记中心，正式房间与世界投影共用。
- 透明程序绘制，无纹理、图集、解码内存或昼夜副本；单次最多一个人物交互徽记。
- 门口停留三秒、移开取消、暂停冻结、界面关闭后离开触发区才重启。房间与原剧情节点保持各自状态身份。

## 4 动画任务补充
- 新动画资源/抽帧/帧率不适用；圆弧读取正式交互秒数，不使用独立视觉时钟。
- 原猫身体、动作时钟、腿部与手持武器不修改；本次只调整徽记锚点和出口地垫层级。

## 5 制作指令
沿用用户图2的奶油色徽记，将床、家门、告示牌、守门点等动作放到同一猫头顶位置。先保证候停与取消、关闭后不重复弹出，再检查手机和昼夜，不能用页面内文字取代实际头顶徽记。

## 6 验收记录
验收日期：2026-10-25。截图与日志均保存于 `output/playwright/building-entry-countdown/`。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 图标、圆环与数字统一 | 正式 drawActionCountdown 增加完整浅色底环，进度弧围绕家门、出门、床、告示牌、盾牌或火焰图标；画布最终屏幕层绘制。所有页面不新增文字秒数。 |
| 猫头顶与缩放位置 | 68×34固定屏幕尺寸，头顶按56×PLAYER_SCALE×zoom计算，徽记下缘至少留出10像素；单元检查0.65–2倍率，实机检查320/390/1280三种尺寸。`home-exit-320-night.png`、`home-bed-390-day.png`、`weapons-exit-390-day.png`。 |
| 出口不遮挡猫 | 小屋与两间工坊的地垫改在人物之前绘制。猫脸、身体与脚底可见；`home-exit-live.png`、`vehicle-exit-320-night.png`。家具、角色比例与碰撞未改变。 |
| 所有正式入口候停 | 新增四个玩法建筑（高塔、远征、女神、消防）、两块故事/邻里委托板、清缴牌及两个守门盾牌，共9处；加上原小屋与两间工坊。完整真实3秒触发检查见 browser.txt；告示牌/守门/消防只打开原选择页，不自动接任务或开始挑战。 |
| 点击、取消与防重复 | 清缴牌真实键盘移动取消、重新停稳触发，关闭后3.3秒不重弹且仍可点击；两块委托板、消防、两处守门均检查关闭后保持关闭；三座秘境实际进入并返回原地不重入。暂停与后台冻结、驾驶/剧情/活动限制通过核心测试。 |
| 小屋与工坊兼容 | 小屋实际键盘走出、候床后展示休息选项、取消后不重弹、点击入门均通过；武器/载具工坊实际候门进入及键盘走到门口三秒退出通过。旧停车、小屋及入职推车专项检查继续通过。 |
| 昼夜同屏与多端 | `home-enter-{320,390,1280}-{day,night}.png` 同屏包含真实猫、原生敌人、实际停驻车、建筑、地形与HUD；其余8类场景共48张截图包含床边/三室出口/建筑门口徽记。逐项屏幕边界检查和人工看图通过，无页面溢出。 |
| 闲聊避让 | 初次清缴候停发现居民气泡会遮猫；已在buildingEntry/cottageEntry期间推迟闲聊。修订后全部视觉样本检查居民气泡隐藏，见 `clearing-320-night.png`。 |
| 动作与资源预算 | 不修改原猫视频帧、腿部动画、手持武器、轮胎/履带/炮塔；新位图/抽帧/动画源文件不适用。徽记只绘制一次小型矢量形状，不新增纹理、图集或昼夜缓存；两组浏览器脚本均无页面错误。 |

- 单元检查：`node --test tests/building-entry.test.mjs tests/camp-home.test.mjs tests/workshop-interiors.test.mjs tests/parking.test.mjs`，31/31通过，记录 `unit.txt`。
- 实机脚本：`tests/building-entry-browser.cjs`、`tests/building-entry-visual-browser.cjs`；日志 `browser.txt`、`visual.txt`。
- 正式入口：`src/rendering/player-action-countdown.js#drawPlayerActionCountdown`、`src/rendering/action-countdown.js#drawActionCountdown`；采样 `src/rendering/visual-review.js#inspectBuildingEntry`。
- designCriterion：`building-entry-countdown`，绑定 `visual-contract.json#buildingEntryCriterion`。
- 结论：通过。确认后的版本为本任务分支提交，以上正式运行截图作为本轮参考；建筑与猫资源沿用既有版本。
