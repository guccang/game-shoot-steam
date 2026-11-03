# 地下自然景观品质升级

## 1 目标、阶段与参考
依据[美术标准](../art-generation-standard.md)、[项目合同](../../AGENTS.md)。本轮为正式程序景观与已有作物图集复用：地下达到地表河湖、植被的结构与动态品质，消除逐格方块、单薄贴片。参考src/rendering/shore-art.js、river.js、landscape-ground.js及farm.js，保留森林描边、奶油与草木色、原猫连续帧、独立工具、怪物与载具动作。不是生成整张背景，不使用imagegen替代连续地形；本轮没有新增PNG生产，既有地表作物图集共享使用。

## 2 造型与空间
九景保持原标识及种子：荧菇林（高低菌伞与菌褶）、根木林（分叉根干、叶团与蕨叶）、晶簇花园（嵌入岩床的多面晶体）、苔藓草甸（地表品质草药群）、钟乳石厅（成组石柱与岩台）、暗河（连续流向水纹）、蓝萤湖（不对称浅滩、深水与萤光）、温泉（矿物岸台、气泡与蒸汽）、化石遗迹（破裂岩台、螺壳与骨节）。大形与过渡地面优先，细节稀疏，不能用满屏纹理弥补结构。

水岸、岩壁采用同源连续轮廓与碰撞采样；保留格子中心的地形身份、存档键、开矿产出、开发统计、桥梁和轨道。岩层仍需要挖掘，天然景观已存在。洞口九格平台、铁路及步行主通道留白，物体按实际脚底排序。两侧不对称浅滩，有限平涂，左上亮面与根部冷影。

## 3 技术、动态与资源
64单位为存档施工网格，不再直接绘成地板方块；轮廓16单位采样，同一连续场提供实体边界。静态可见区域网格缓存有界，动态流水、蒸汽、萤虫与局部茎叶独立更新，使用本层实际游玩时钟，暂停不动，减少动态降低环境动画。新位图0，复用地表作物图集，不为地下重复解码或创建昼夜副本；素材缺失明确报告。脚底固定，菌伞、叶尖局部弯动，不旋转整株代替动作。地表作物原锚点、成长/采集状态和渲染接口保留；地下只复用视觉，不新增地表农田数据。

## 4 正式入口与交付
src/world/mine-surface.js为同源轮廓，src/rendering/mine-landscape-ground.js绘制自然地形与水流，src/rendering/mine-flora.js绘制九景；接入drawMining正式镜头。designCriterion：underground-landscape-quality。后续PNG精修如有专门需求另立任务，不把本轮程序实现描述成图片生成。

## 5 验收计划
手机320/390与横向短屏；九景昼夜、原猫/怪物/矿车同屏；真实移动与挖掘、桥岸、水面限制、洞口保留、采集再生、动画连续与暂停、旧存档布局、缓存预算。截图与录像存output/playwright/underground-landscape-quality，最终挑选长期参考图。实际结果见下节。


## 6 实际验收（2026-11-03）

结论：通过。正式入口为 `src/rendering/mining.js#drawMining` → `drawMineLandscapeGround` / `drawMineFlora`，工作台读取 `inspectMineLandscapeQuality`，`visual-contract.json` 绑定 `underground-landscape-quality`。没有演示专用绘制器。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 连续河湖与自然岩壁 | 16 单位等值轮廓消除原地板方格；开放洞厅、浅滩、深水、湿岸和地表岸石分层。正式三角轮廓与碰撞逐点一致；水面仍需建桥，两栖例外保留。见[暗河白天](../art-reference/underground-landscape-river-day.png)、[湖泊夜晚](../art-reference/underground-landscape-lake-night.png)。 |
| 九景结构差异 | [根木](../art-reference/underground-landscape-roots-day.png)有不规则叶冠、分叉根干与蕨叶；[菌林](../art-reference/underground-landscape-mushroom-night.png)有独立菌柄、帽顶、菌褶与高低组合；[晶簇](../art-reference/underground-landscape-crystal-day.png)、[钟乳石](../art-reference/underground-landscape-stalagmite-day.png)、[温泉](../art-reference/underground-landscape-spring-night.png)、[化石](../art-reference/underground-landscape-fossil-day.png)分别使用多面晶体、成组石柱、矿物台蒸汽、埋藏螺壳肋骨。 |
| 地表品质作物 | [草甸](../art-reference/underground-landscape-moss-day.png)直接复用地表薰衣草、菠菜和雏菊的透明图集、尺寸与茎叶弯曲；不是重新画的简化图标。采集后使用幼芽阶段，原再生规则保留，不生成地表农田数据。 |
| 原位自然生态 | 九景固定种子 1847 定位的原格均 `dug:false`；不开掘也实际显示。种子、面积、旧档格键与矿石结算不变。局部岸线按新连续轮廓呈现。 |
| 动态与暂停 | 正式屏幕 2901 个深水像素采样随 650ms 时间变化；停止模拟后的两次采样完全相同，系统减少动态时两次也相同。水纹周期首尾透明衔接；叶尖、芦苇、菌帽、蒸汽、萤虫分别运动，根部不整体转动。真实建设弹窗冻结开采和本层时钟。 |
| 遮挡与路线 | 根部锚点落在干地，按真实脚底排序；靠近角色的前景实体淡化，猫的连续帧与独立矿镐仍可读。入口平台、已铺轨与路牌位置留白；[矿车白天](../art-reference/underground-landscape-cart-scene-390-day.png)与[夜晚](../art-reference/underground-landscape-cart-scene-390-night.png)可见实际猫、菌伞怪、矿车、轨道、路口方向箭头和景观。 |
| 手机与桌面承载 | 320×568、390×844、844×390 实际触屏场景昼夜通过，未增加桌面布局。320 最小工具宽约45.8、高44；无横向溢出。见[窄屏](../art-reference/underground-landscape-landscape-320-day.png)、[横向短屏](../art-reference/underground-landscape-landscape-844-night.png)。整合矿车用例另覆盖360、430与桌面1280承载的同一手机界面。 |
| 资源预算 | 新位图资源0，新离屏Canvas 0；地表作物共享既有解码图集，缺失明确报错；地理查询每层缓存最多4096格，正式绘制器只存1份可见区域路径。390样本2100节点、677真实边、22条水纹、2处岸石。本机40次已缓存正式地下绘制CPU中位5.1ms、P95 7.4ms；不作为其他设备帧率保证。 |

针对性检查：`mine-surface` 4项、`natural-mining` / `mining` / `mine-entrances` 合计26项、`mine-ecology` 14项、`mine-cart-directions` 9项，共53项通过。没有运行全量测试。

真实浏览器：`tests/mine-landscape-quality-browser.cjs` 完成触屏挖矿、4段自动铺轨与8木材扣除、造车乘坐行驶急停、矿灯路牌、开洞取消完成、刷新保存，共29次场景采样；最终造型和水纹再由 `tests/mine-landscape-motion-browser.cjs` 做25次昼夜/屏幕采样及动态冻结检查；合入 main 的矿车选向后由原 `mine-cart-directions-browser.cjs` 做22次场景/弹窗采样，路口持久选向、停车掉头、存档失败重试、刷新均通过，三组浏览器无页面异常。

整合时修正矿车浏览器用例的一处抢读：触屏开车后等待正式下一帧禁用选向按钮，再断言行驶状态；实际功能没有绕过条件。保留 main 新增矿车路由与全部原洞口修复。

完整截图、连续录像、日志和精简JSON结果在 `output/playwright/underground-landscape-quality/`，合并时复制到主仓库同一路径；长期参考图已进入上面的 `docs/art-reference/`。源测试默认4175，本轮为保留已有4175服务，在独立工作区以4176执行临时副本。

不适用：无新人物、怪物动作或武器资产，原视频连续帧、独立操枪、怪物步态与战车履带未修改；无新增PNG图集及图片生成服务记录。标准中的这些既有合同继续生效。
