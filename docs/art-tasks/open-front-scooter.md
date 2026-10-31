# 森林巡游美术生成任务单

复制本任务单，为每批资源填写一份。执行依据为[游戏美术资源生成标准](../art-generation-standard.md)。未确定的尺寸、锚点或碰撞关系，应先对照现有同类资源核实。

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 资源中文名称与稳定标识 | 无挡风玻璃巡林小摩托 / open-front-scooter |
| 类别和用途 | 电动载具正式场景和工坊预览 |
| 本轮目标 | 删除高耸黑挡板，低坐垫、裸露车把、圆灯、短前罩明确读作无风挡摩托 |
| 数量和变体 | 原装一款；兼容现有装甲和动力升级 |
| 保留项 | 正面视角、双人同轴完整身体、独立手、无武器、电驱轮相位、入库 |
| 制作路线 | 沿用正式 Canvas 部件绘制 |
| 参考与同类资产 | 用户黑挡板截图、src/rendering/scooter.js、已有森林配色 |
| 使用场景 | 接送剧情、车库、单人驾驶、载具工坊 |

## 2 造型与空间

| 字段 | 填写内容 |
| --- | --- |
| 主体剪影 | 低扁坐垫、独立圆灯和双镜、外露前叉和短挡泥板 |
| 与其他变体的区别 | 原高黑矩形改为横向棕色软垫；横条灯改为圆灯，长前罩改为短罩 |
| 主次关系 | 人物为主；车辆用简单大色块托住乘坐，少量座垫缝线 |
| 地面衔接 | 继续轮下接触影，不增地面装饰 |
| 活动空间 | 车辆外宽和前轮接地点保持，既有车库门洞与通路保持 |
| 邻接组合 | 车库、道路和两位原版猫 |
| 光向与明暗 | 左上亮面、绿描边、奶油黄短罩、棕色坐垫 |

## 3 技术交付

| 字段 | 填写内容 |
| --- | --- |
| 逻辑尺寸 | 约74×97世界单位；车轮底部仍为y=36.5 |
| 像素尺寸与倍率 | 程序实时绘制；无新图片；正式工作台统一缩放 |
| 锚点与原点 | 沿用车体原点(0,0)、车把±28,-30、镜杆±28,-44 |
| 分层 | 后轮与座垫/完整乘客/司机/前叉车头/独立握把手 |
| 透明背景 | 透明，接触影仅车轮附近 |
| 碰撞与可通行性 | 不变更碰撞半径；24单位路径验证沿用 |
| 昼夜处理 | 正式场景昼夜合成，无独立夜版素材 |
| 文件格式与位置 | src/rendering/scooter.js；证据docs/art-reference/open-front-scooter |
| 内存与缓存预算 | 无新图集、纹理、缓存或网络请求，常数个Canvas图元 |

## 4 动画任务补充

静态资产标注“不适用”。猫身体当前仅生成正面待机和移动，不增加多方向身体序列。

| 字段 | 填写内容 |
| --- | --- |
| 动作和时长 | 车轮按位移连续滚动，停车冻结；猫待机和步态不改 |
| 帧率、帧数和循环 | 沿用原24FPS真实猫帧，车轮程序相位 |
| 源视频与连续片段 | 猫源清单assets/cat-front/animations.json；不重制 |
| 统一裁切和缩放 | 不裁猫头、不缩放/旋转身体，不逐帧修形 |
| 起停与状态衔接 | 沿用暂停、减少动态、刷新恢复及倒推顺序 |
| 局部真实动作 | 轮纹沿胎面滚动；身体真实步态与呼吸 |
| 独立部件 | 车把位置保持±28,-30，车灯和车壳不覆盖握把手 |

## 5 制作说明

延续原有森林绿描边与奶油黄、草木色，删除黑色高挡板。用低扁棕色软垫表达座位，细车架连接短前罩，独立裸露车把和圆灯形成无挡风玻璃的小摩托。双人身体完整且居中，司机位于乘客前；手、车轮、升级部件继续独立。实际空车、双人、单人和升级工坊预览均需验收。

## 6 验收记录

| 目标 | 实际结果与证据 |
| --- | --- |
| 无挡风玻璃造型 | [原装工坊近景](../art-reference/open-front-scooter/open-scooter-detail-1.png)：删除57/50高的黑色竖板，改为16高的棕色座垫、薄顶面和细后扶手；独立圆灯、细车把、短前罩、前叉及短挡泥板可辨。 |
| 升级外观兼容 | [满级近景](../art-reference/open-front-scooter/open-scooter-detail-20.png)：原升级装甲和侧边动力模块不遮灯、不盖脸、不变成风挡；[桌面工坊](../art-reference/open-front-scooter/open-scooter-workshop-1-desktop.png)共用正式绘制器。 |
| 乘坐层级与身体 | [双人白天](../art-reference/open-front-scooter/open-scooter-double-390-day.png)：完整猫身体与老猫居中，司机在乘客前，坐垫在人物后，独立握把手位置不变。 |
| 车库和入库 | [库内空车](../art-reference/open-front-scooter/open-scooter-parked-390-day.png)、[倒推中](../art-reference/open-front-scooter/garage-motion-10.png)、[连续录制](../art-reference/open-front-scooter/dismount-and-push.webm)：先下车再推，手接车把，前轮完整停在门槛内。正式步行验证进入、退出与左右后方绕行。 |
| 同屏昼夜及小屏 | [320夜间单人战斗](../art-reference/open-front-scooter/open-scooter-single-320-night.png)、[390满级白天](../art-reference/open-front-scooter/open-scooter-upgraded-390-day.png)。桌面1280×900、390×844、320×740下，双人/空车/单人/满级共24张昼夜图；工坊原装/满级各3尺寸，另2张部件近景，共32张。 |
| 动作真实性 | 真实键盘驾驶产生位移和轮纹变化；停车冻结，倒推保留反向轮程。猫主体资源ready，身体、车轮、手和升级部件独立。 |
| 资源预算 | 无新增运行位图、纹理、缓存或请求，原图集和内存预算不变；仅固定数量Canvas图元替换。完整采样见[检查记录](../art-reference/open-front-scooter/open-scooter-samples.txt)。 |

专项检查：`node --test tests/vehicle-wheels.test.mjs` 3项通过；`tests/open-front-scooter-browser.cjs` 的正式场景、工坊预览、真实驾驶和无挂载检查通过，无页面错误；既有 `tests/ranger-garage-walk.cjs` 完成实时下车倒推及车库绕行。单人战斗和满级展示采用空间/装备夹具，不作为本次修改玩法或教学流程的证据。本次未改玩法，不扩大到全量测试。

正式入口：`src/rendering/scooter.js#drawScooterRear` / `drawScooterFront`，剧情、驾驶和工坊共用；采样 `src/rendering/visual-review.js#inspectOpenScooter`。

`designCriterion`：`open-front-scooter`。结论：通过。当前车型以本任务单为准，替代旧版高黑色后座挡板；前后座同轴与完整身体要求继续保留。完整工作截图保留在主工作区 `output/playwright/open-front-scooter/`。
