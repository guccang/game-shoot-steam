# 机械伙伴动作、生命与车载挂载任务单

## 1 目标与范围
- 稳定标识：mechanical-companions；武器、召唤物、车载部件及配置 UI。
- 目标：3–10 只机械猫分散追敌、预备挥爪、收招归队；远程共用枪械槽；独立生命与核心能源补召；三类控制器均可车载。
- 路线：沿用程序化分层与正式弹道，无新位图。参考 mechanical-core-gallery.png、mechanical-core-day.png、mechanical-core-night.png。
- 保留：角色真实连续帧、小手枪口、无人机与浮游炮独立主体、履带旋翼、地形与建筑道路。

## 2 造型与空间
- 机械猫保留双耳面甲、四条关节腿、两节尾巴；近战蓄爪与前腿展开，远程背部增加可转向枪架。
- 以主角为主体，伙伴分散在半径 64–105 的归队环；近战按目标分配接敌角，额外局部分离防重叠。
- 接触影随脚底，沿用左上受光/森林绿描边/奶油黄面甲。树木、岸线与道路不改变；猫仍是地面单位。

## 3 技术交付
- 猫约 54×44 世界单位，脚底 (x,y)，背部支座 (x,y−22)、枪轴 (x,y−37)，枪械独立旋转/后坐/枪口。
- 无位图倍率或解码图集；程序化绘制随现有 Canvas 镜头缩放。接触影、腿、主体、枪架、血条分层；脚底参与深度排序。
- 每核心最多 10 个状态；每车每已用模块独立供给，收起冻结。无新增场景缓存或全屏画布；沿用 32 地块上限。
- 昼夜使用现有场景色调，不复制夜间资产。路径：src/combat、src/config、src/rendering；证据 output/playwright/mechanical-companions。

## 4 动画
- 追敌/归队步相只随真实位移；预备 .12 秒、挥爪 .24 秒、死亡折叠 .65 秒、补召等待 2 秒。
- 每只生命 60，死亡消耗 6 格核心能源补召；原生挥爪仍耗 1 能源。挂载枪有各猫独立弹仓，不挪用手持供给。
- 状态保留起停步相；减少动态关闭密集特效，保留位置、瞄准和生命反馈。非视频资产，源帧/裁切不适用。

## 5 制作约束
延续森林绘本风格，有限平涂、局部关节动作；背枪锚点和真实弹道统一。禁止整体缩放模拟动作、递归挂载控制器、免费复活/换枪补给、修改通行规则。

## 6 验收记录

证据目录：`output/playwright/mechanical-companions/`，长期参考保留于 `docs/art-reference/`。本次均使用隔离端口 4197 的正式应用；运行游戏没有下载或生成新的位图。

| 设计目标 | 实际运行与验收结果 |
| --- | --- |
| 近战追敌、分散攻击与归队 | `melee-chase.png`、`scene.webm`；十猫均分五个目标的正式规则回归通过。预备 0.12 秒、挥爪 0.24 秒，按接敌角与局部分离避开完全重叠，空场回到分散队形。 |
| 关节连续、背枪独立 | `formal-frames.png` 六个正式采样帧均不相同；四肢、尾部与收爪各自变化，背部支座连接枪轴，枪口/后坐使用同一锚点。`final-weapons.webm` 记录脉冲射击与混合车载阵列。初稿背枪遮脸，已将枪轴从 y−22 调至 y−37。 |
| 独立生命、死亡与能量补召 | `death.png`、`recall.png`、`scene.webm`；实机由怪物正常扑击击毁单猫，等待后自然补召。规则测试验证 60 HP、等待 2 秒、每次扣 6 格能源，欠能源完整充能，换装/暂停不复活。 |
| 近战/远程配置 | `config-320.png`、`config-390.png`、`config-final.png`；鼠标、键盘 Enter、真实触控均能切换整队枪架，选中高亮、生命与费用短标签清楚。保存失败不变更配置；刷新保留选择。工坊显示背枪的实际伤害、间隔、射程、每猫弹仓及装填参数。 |
| 三类召唤武器车载 | `vehicle-0/1/2/3-12/13/15.png` 完成四车型×三控制器的真实键盘挂载和试射。独立供给不借用手持状态，编辑不切换出战车；十二次舞台包围盒均为 891×490，上沿位置相同。`vehicle-mixed-supply.png` 验证车载浮游炮另挂脉冲及原生核心。 |
| 完整靶场取景 | `pulse-hits.png`、`vehicle-mixed-supply.png`；十猫环列完整可见，飞行阵列使用固定安全取景避免左侧炮体被裁掉。脉冲在 8.4 秒内击破 19 靶并进入第 4 批，持续补靶。 |
| 白天/夜晚和比例 | `scene-320/390/1280-day/night.png`：真实视频角色、怪物、战车、车载无人机、机械猫、营地与 UI 同屏；保留森林配色、主体比例、阴影与图标可读性。 |
| 通路与遮挡 | `scene-after-move.png`、`scene.webm`：真实四向按键移动，脚底参与前后排序，树干及水岸阻挡检查通过；不新增建筑或地形碰撞。减少动态见 `scene-reduced.png`。 |
| 资源与预算 | 新增七个功能模块共 15,767 字节；没有图集、音频或常驻场景缓存增量；新配置面板 13 个 240×150 卡片画布合计 1,872,000 字节，嵌套打开时两面板合计约 6.73 MB（预算 7 MiB）。工坊画布实测最大 4,857,832 字节，低于 5 MiB；场景地块 12/32，共 14,452,224 字节。每核心最多 10 猫，每猫最多 12 个合法枪槽状态；每车模块独立缓存，无递归控制器挂载。 |
| 项目与规则回归 | 项目 235 模块语法/导入/分层/无循环检查通过；全量 596 项通过，补充混合车载弹仓后最终相关 47 项全部通过（涵盖新增用例）。`rules.log`、`final-targeted.log`、`browser.log`、`scene.log`、`final-browser.log`。浏览器无 pageerror。 |

正式入口：`src/rendering/mechanical.js#drawMechanicalCat`、`src/rendering/mechanical-armed.js#drawArmedMechanicalCat`、`src/rendering/funnel.js#drawFunnelArray`、`src/rendering/vehicle.js#drawVehicleArmor`。`src/rendering/visual-review.js#renderVisualCase` 绑定正式绘制，`visual-contract.json` 登记 **mechanical-companions** 的 designCriterion。

不适用：新增视频源片、位图裁切、图集倍率和外部生成记录——本任务全部使用代码分层与原有角色图集；未替换主体视频。

结论：通过。已修订背枪遮脸、靶场边缘裁切及车载浮游炮按各挂枪容量初始化的问题。秘境继续使用既有局内规则，不继承新永久枪槽。首次购买价格与旧档编号保持，三类车载控制器使用独立炮塔所有权。

长期参考：[动作与背枪](../art-reference/mechanical-companions-frames.png)、[白昼同屏](../art-reference/mechanical-companions-day.png)、[手机夜景](../art-reference/mechanical-companions-night.png)、[整队配置](../art-reference/mechanical-companions-config.png)。

## 载具周围间距微调（2026-10-22，制作规格）
用户参考：气垫载具与三只背枪伙伴贴身重叠。仅扩大驾驶时机械伙伴的归队椭圆：横、纵半轴各增加28世界单位；出生搜索起始半径由32提高到64。步行队形、近战接敌、真实地形碰撞及蜘蛛独立队形保留。无新造型、图层、贴图、动画或缓存；脚底/枪口锚点和原尺寸不变。目标为三只和十只队伍均与车壳留出空隙，追随和瞄准动作继续有效。正式入口 updateMechanical/deployNode，designCriterion mechanical-vehicle-spacing。待桌面/手机昼夜和规则验收。

### 载具间距验收结果
- 通过：桌面1280、手机390/320昼夜正式截图（output/playwright/mechanical-spacing/*-day.png、*-night.png），猫、怪物、气垫载具、地形与UI同屏，前后深度及原比例保留；车壳与三只背枪伙伴有可见空隙，建筑入口/地形遮挡仍按原规则处理。
- 通过：真实方向键移动后归队、背枪连续弹道；十只混编分别切换四种载具截图 ten-vehicle-0至3.png。录制 interaction.webm，浏览器日志 browser.log 无 pageerror。
- 通过：11项机械伙伴规则（含三/十只驾驶与步行队形精确对照）及15项蜘蛛/混编规则；249模块语法、导入、分层检查通过。蜘蛛共用部署接口仍沿原半径。
- 无贴图、字体、画布、单位数量或场景缓存增量；原地形导航及碰撞不变，动画继续按真实位移推进。
- 正式复核入口 src/rendering/visual-review.js#inspectMechanicalVehicleSpacing 读取运行节点；designCriterion mechanical-vehicle-spacing。长期参考 docs/art-reference/mechanical-vehicle-spacing.png。
- 结论：通过；无待修项。

## 行驶队形补充（2026-10-22，制作规格）
行驶时按运动方向形成分列后随，转向低通平滑，停车约一秒逐渐回到分散护卫圈。沿车壳外侧绕行且用正式碰撞推进避让，不把整个伙伴瞬移到目标；追随速度结合实际车速，保留四足步相、独立枪口和近战目标。三/十只、四车型、急转与停车为重点。车壳安全圈仅作用于机械伙伴，不扩大车辆碰撞，不套用蜘蛛。无新位图、画布或角色资源。designCriterion mechanical-driving-formation，待规则及昼夜手机实机验收。

### 行驶队形验收结果
- **通过 / mechanical-driving-formation**：隔离端口4202，正式浏览器键盘驾驶四车型，向右、向下、向左转弯后停车；`drive-0至3-Arrow*.png`、`park-0至3.png`、`interaction.webm` 留档。伙伴沿车体外缘步行，停止后渐变展开；车壳、角色脚底、枪架、履带和旋翼保持原比例与动作。
- 三只与十只、四车型、连续90度转弯和掉头逐帧规则通过：中心安全距离至少67.5世界单位，无瞬移，停车后恢复横向散布。实际地形仍限制移动，岸边/树旁伙伴允许绕行后归位，不为队形取消碰撞。
- 桌面1280、手机390/320的昼夜场景复核通过：`dogs-1280-day/night.png`、`dogs-390-day/night.png`、`park-3.png`；三枪七爪与车体留出空间，已有地形和建筑按脚底排序。完整同屏敌人/角色/载具/工坊/地形/UI见同目录 `swarm-*-day/night.png`。
- 全量650项规则通过；终版缩放修订后相关55项回归及254模块检查通过。浏览器流程无pageerror。正式入口 `src/combat/mechanical-formation.js`、`src/rendering/visual-review.js#inspectMechanicalVehicleSpacing`，合同已登记。
- 无新增图集、字体、Canvas或场景缓存；每队仍为10节点，仅增加运动方向、车速和展开进度状态。不适用新视频抽帧、图集透明边缘验收。
- 证据目录 `output/playwright/companion-formations-spider/`；长期参考 `docs/art-reference/companion-driving-park-phone.png`。结论：通过。
