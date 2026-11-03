# 森林巡游美术生成任务单

复制本任务单，为每项美术任务保存一份至 `docs/art-tasks/<任务标识>.md`；已有对应任务单时继续更新。执行依据为[游戏美术资源生成标准](../art-generation-standard.md)与 [AGENTS.md](../../AGENTS.md)。复制到子目录后，将这两个链接分别改为 `../art-generation-standard.md` 与 `../../AGENTS.md`，其他相对链接也按实际位置调整。未确定的尺寸、锚点或碰撞关系，应先对照现有同类资源核实。

默认按 **imagegen + 程序绘制 + SVG 实现动态效果与交互 → 实机确认 → imagegen精修 → PNG替换与复核** 推进。本任务单分阶段填写，开发阶段不要求最终PNG齐备；后续精修项明确标注“后续阶段”，不得以空白模板或生成预览代替当前阶段验收。用户明确要求本次直接生成或替换PNG时，记录该范围并验证已有动态逻辑。

## 1 目标与范围

资源：独立湖鱼群与溜鱼反馈（lake-ecology-surveys）。阶段：程序动态效果与手机交互开发，复用现有百鱼形体，不生成新位图。目标：鱼群与落漂抽样同源，四类挣扎有可观察的力道、方向和动作差异；地表、地下都可接取调查。保留猫真实帧、独立操枪、鱼尾局部动作、昼夜和所有通行边界。

参考：src/rendering/outdoors.js 与 ambient-fish.js，docs/art-tasks/hundred-fish-tackle.md。本轮以实际湖岸鱼影、浮漂和手机动作条为确认目标。后续PNG精修不在本轮范围；没有新增静态插画需求。

## 2 造型与空间

沿用百鱼已有轮廓、鳍和触须差异。主体为实际鱼群与浮漂，提示为次要UI；不添加地面或阻挡。森林绿描边、奶油色提示和原水面光照保持。岸、桥、入口、角色活动空间不变。

## 3 技术交付

尺寸沿用鱼体约42×22世界单位、鱼尾独立；锚点鱼体中心，世界坐标投影。水面鱼群在水上、桥与角色下，竿线连真实手部。新增程序负责鱼种、选鱼、挣扎、调查与概率；不烘焙动态。无新增位图和解码预算，鱼群32条同屏、地下栖点缓存256、生态缓存256；缺失既有资源仍明确失败。地表轮廓与地下正式平滑水界维持碰撞，昼夜沿用正式转换。

## 4 动画任务补充

缓游、冲刺、下潜、折返使用正式钓鱼时钟；暂停冻结，鱼尾仍由 drawOutdoorFish 独立摆动，竿线由 drawOutdoorFishing 更新。不新增猫/载具动作或视频素材。浮漂运动限制在既有落点安全范围内，冲刺提前提示；减少动态沿用常态鱼群静止配置。

## 5 生成指令

无imagegen请求：本轮只改变既有鱼群生态、浮漂程序运动与手机文字控件，直接复用正式鱼体及统一UI。入口：src/world/fish-ecology.js、src/config/fish-struggles.js、src/rendering/outdoors.js、src/ui/outdoors.js。

## 6 验收记录

验收日期：2026-11-03。测试服务使用4176（4175由原有用户服务占用，未停止或重启）。

| 设计目标 | 实际结果与证据 | 结论 |
| --- | --- | --- |
| 系列一致与鱼群可辨 | 复用百鱼正式形体，未更换猫、武器或水域资产；地表可见鱼与本湖池同源，[白天](../art-reference/lake-ecology-surface-day.png)、[夜晚](../art-reference/lake-ecology-surface-night.png) | 通过 |
| 真实水界与活动空间 | 既有地表轮廓、地下平滑水界检查通过；鱼群仅采样开放水面，未新增碰撞、地形、建筑或道路，因此无需新增绕实体/载具碰撞测试 | 通过 |
| 动作与独立部件 | 四类正式抽选鱼均完整控线到岸；缓游、冲刺、下潜、折返的两次连续画面和录像见 output/playwright/lake-ecology-surveys/behavior-*.png 与 behaviors-video/；尾鳍独立，竿线连接真实手部；猫/载具肢体不在本轮改动范围 | 通过 |
| 同源鱼群与概率 | 本湖6–12种；地表所有鱼均有固定栖息湖，低阶竿每湖至少两种；附近可见鱼增加相对概率，保留其他本湖鱼机会。正式放手时锁定本次概率。两座湖、周期镜像、重载与地下层身份测试通过 | 通过 |
| 调查进度和保存 | 样本3条、多样性2种、指定鱼2条轮换；收进鱼护才计数；失败保存、放流、旧库存和别湖别层均不计。领奖失败重试且不重复发奖，地下刷新后保持委托。[手机调查页](../art-reference/lake-ecology-survey-320.png) | 通过 |
| 昼夜与地下 | [地下白天](../art-reference/lake-ecology-mine-day.png)、[地下夜晚](../art-reference/lake-ecology-mine-night.png)，角色、鱼群、景物和UI同屏；实际坡道往返第二层并收鱼，[二层控线](../art-reference/lake-ecology-depth2.png)。怪物/载具正式绘制未修改，沿用原合同 | 通过 |
| 手机与既有容器 | 320×568、390×844、844×390、1280×800中的原手机容器无横向溢出，底板完整可达；真实触控抛竿与滑条控竿，未新增桌面布局。桌面浏览器的手机触控模拟已验证，物理手机系统栏需安装包阶段检查 | 通过（当前开发范围） |
| 暂停与资源预算 | 暂停冻结正式挣扎和游鱼时钟；同屏鱼32、地下栖点256、生态池256的有界缓存；新增位图0字节，无资源加载错误 | 通过 |
| PNG替换 | 本轮只复用已有鱼体并增加程序动作及手机文字，没有新插画或PNG交付需求 | 不适用 |

正式入口：src/rendering/ambient-fish.js#drawAmbientFish、src/rendering/outdoors.js#drawOutdoorFishing、src/rendering/visual-review.js#inspectLakeEcologySurveys；对应 designCriterion 为 lake-ecology-surveys，已写入 visual-contract.json。

规则检查：tests/lake-ecology-surveys.test.mjs、tests/hundred-fish-tackle.test.mjs、tests/outdoors.test.mjs、tests/mine-fishing.test.mjs、tests/fish-creature-codex.test.mjs，合计36项通过。百鱼均用正式溜鱼状态机验证可上岸，旧档和旧装备保持。

实机浏览器：tests/lake-ecology-surveys-browser.cjs、tests/fish-struggles-browser.cjs 通过，pageerror为0；详细结果见 output/playwright/lake-ecology-surveys/browser.log、behaviors.log，截图和WebM录制在同目录。旧百鱼浏览器脚本同步当地概率规则，本轮不重复全量图鉴验收。

动态效果开发结论：通过。已交付独立湖泊鱼群、可见鱼关联抽选、四类挣扎和三类调查，地表及地下各层共用。无需修订项；未来如精修PNG，仅替换现有静态鱼体接口，不烘焙尾鳍、竿线、概率或任务状态。
