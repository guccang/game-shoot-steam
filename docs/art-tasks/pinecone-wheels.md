# 松果轮式战车美术任务单

依据：[美术生成标准](../art-generation-standard.md)，由[任务模板](../art-generation-brief.md)填写。

## 1 目标与范围

| 字段 | 内容 |
| --- | --- |
| 资源名称与稳定标识 | 松果轮式战车；保留 pine-tank、车型编号 0，兼容旧存档 |
| 类别和用途 | 默认载具、收藏画像、工坊及战场 |
| 目标和数量 | 一款四轮轻型战车，以四个分离轮胎替换两条连续履带 |
| 保留项 | 绿色装甲、暖黄灯、猫驾驶员、独立机枪及手持枪、装甲成长、速度、碰撞、其他三款载具 |
| 制作路线 | Canvas 独立轮胎、轮毂、车体与装甲绘制，实际位移推进滚动 |
| 参考 | src/rendering/vehicle.js、vehicle-models.js；docs/art-reference/landscape-six-day.png 与 landscape-six-night.png |
| 使用场景 | 森林、秘境、工坊与收藏页 |

## 2 造型与空间

| 字段 | 内容 |
| --- | --- |
| 主体剪影 | 左右各两只圆润越野轮，前后轮之间明显留空，轮毂露在车身外侧 |
| 结构差异 | 与重坦的连续宽履带区分；轻型车窄底盘和短护轮板，不新增第二套透视 |
| 主次关系 | 车体及驾驶员为主，四轮承担结构识别，灯和松果色徽记作点缀 |
| 地面衔接 | 四轮底部接触影及原车影；无需新增地形 |
| 活动空间与邻接 | 沿用原半径及营地、桥梁、林间、水界；不新增碰撞和场景摆件 |
| 光向与明暗 | 左上亮面、冷绿暗胎和森林绿描边，沿用场景昼夜转换 |

## 3 技术交付

| 字段 | 内容 |
| --- | --- |
| 逻辑尺寸 | 车体含轮约 90×60 世界绘制单位，保持原车宽度与落脚比例（原约 98×54） |
| 像素尺寸与倍率 | 程序化矢量，无图集；实际镜头和 DPR 负责缩放 |
| 锚点与原点 | 角色世界坐标为原点；独立炮架仍为 (0,5) |
| 分层 | 接触影→轮胎/底盘→猫身体→前装甲→独立炮塔/枪口 |
| 透明与碰撞 | 无不透明背景；沿用半径12地面移动及河岸、树干阻挡 |
| 昼夜处理 | 共用形体、正式 SceneTone 与 EnvironmentTransition |
| 文件位置 | src/rendering/pine-wheels.js、src/combat/vehicle-motion.js；验收 output/playwright/pinecone-wheels/ |
| 资源预算 | 不新增位图、解码内存、离屏画布或缓存；每车一个有界相位值，四轮固定数量绘制 |

## 4 动画任务补充

| 字段 | 内容 |
| --- | --- |
| 动作和时长 | 行驶按实际位移循环滚动；刹停保留最终角度；受击沿用装甲闪光 |
| 帧率、帧数和循环 | 正式渲染帧率连续采样，无固定帧格；相位按 2π 取模 |
| 源视频与裁切 | 不适用：独立程序化机械部件，无生成视频、裁切或拉伸 |
| 起停和状态 | 惯性滑行继续滚动；碰撞停止不空转；暂停、下车不推进；减少动态只显示静态轮形 |
| 局部真实动作 | 胎纹沿胎面逐条滚动，侧面轮毂辐条在椭圆透视内转动；车壳不旋转或缩放 |
| 独立部件 | 猫手、枪、炮塔、后坐和枪口继续使用正式运行时锚点 |

## 5 制作指令

延续二维森林绘本风格，将默认松果战车改为四只独立越野轮和短护轮板，保持俯视比例、森林绿描边、柔和绿色与奶油黄有限平涂。按原坐标与分层接入，轮毂和胎纹独立滚动。排除连续履带、整车旋转假动作、写实金属、强辉光、烘焙驾驶员/枪械及额外资源缓存。

## 6 验收记录

验收日期：2026-10-22。正式本地服务端口 4217；不是静态预览替代运行验收。

| 设计目标 | 实际证据与结果 |
| --- | --- |
| 系列一致、变体可辨 | `continuous-and-roster.png` 六帧及四车型并排：四轮有明确间隙，重坦仍是长履带；森林绿描边、有限平涂与暖黄灯延续原版。人工检查通过。 |
| 落地、前后遮挡 | `occlusion-back.png`、`occlusion-side.png`、`occlusion-front.png`：实际键盘绕营地树，从 (755,1048) 经侧面到树群前；树冠原有透显、实体排序和轮下接触影保持。通过。 |
| 通行和边界 | 真实森林绕行未新增碰撞；`vehicle-wheels.test.mjs` 正式平台撞墙后轮角不变；原 `vehicle-roster.test.mjs` 地面河岸/树干阻挡、直升机安全落地及循环边界通过。未改地形，地块接缝和湖形制作不适用。 |
| 动作和独立部件 | `continuous-and-roster.png` 胎纹/辐条局部连续变化，车壳不变形；实际键盘正反驾驶、刹停与手机触摸通过，暂停/下车/长距离相位边界单测通过。战场两套枪械继续独立攻击，重坦与直升机使用原绘制分支。 |
| 昼夜同屏 | `field-1280-day/night.png`、`field-390-day/night.png`、`field-320-day/night.png` 六场景均同屏包含猫、四轮车、怪物、营地与 UI。人工查看：夜色下轮廓可辨，手持枪与车载机枪各有枪口。通过。 |
| 手机与桌面 | 1280×960 桌面、390×844、320×844；`workshop-390.png`、`workshop-320.png` 和 `collection-desktop.png` 工坊可操作，无页面或弹窗横向溢出；手机真实触摸拖动向上移动。通过。 |
| 资源与预算 | 浏览器两套脚本均零页面异常，原猫图集就绪后才运行；无新位图或解码内存、昼夜副本、派生缓存。只增加四轮固定图元及每车一个相位数值；新增 PNG 仅在文档/验收目录。通过。 |
| 减少动态 | `reduced.png` 保留轮胎形体，停止细部滚动；游戏速度、枪械及碰撞规则不变。通过。 |

自动验证：37 项相关规则测试全部通过；286 个模块的语法、导入路径、分层与循环依赖检查通过。浏览器分别运行 `tests/vehicle-wheels-browser.cjs` 和 `tests/vehicle-wheels-scene-browser.cjs`，交互及尺寸断言通过。

完整证据目录：`output/playwright/pinecone-wheels/`。此目录为验收产物，不进入运行资源包。

正式绘制器入口：`src/rendering/pine-wheels.js#drawPineRear`、`drawPineFront`，由 `src/rendering/vehicle.js` 的战场、工坊、收藏入口共享；运动由 `src/combat/vehicle-motion.js#advanceVehicleWheels` 读取正式移动结果。

`designCriterion`：`visual-contract.json → vehicleWheelCases → vehicle-wheels`，对应 `src/rendering/visual-review.js#renderVisualCase` 连续帧与停轮段。

结论：**通过**。无待修订项。

版本：pinecone-wheels v1。长期参考：[结构与连续帧](../art-reference/pinecone-wheels-roster.png)、[桌面白天](../art-reference/pinecone-wheels-day.png)、[手机夜晚](../art-reference/pinecone-wheels-night.png)。
