# 蜂群加特林静态品质样板

依据：[美术生成标准](../art-generation-standard.md)。本单由美术任务单复制后填写。

## 1 目标与范围
- 标识：蜂群加特林 / gatling / weaponIndex=2；一把枪的主体、六类升级件及正式展示。
- 目标：正常游戏尺寸识别厚机匣、圆弹鼓与六管束，清楚呈现顶面/侧面和机械连接；改善通用色块拼装感。
- 路线：扩展现有 Canvas 程序部件，不新增位图、视频或 SVG。
- 参考：当前 characters.js、rotary-barrels.js 与 docs/art-reference/revert-svg 的森林实机场景。
- 保留：猫猫连续帧、手部锚点、六管相位/起停、真实后坐、热量、枪口43、升级数值、组装工具、所有其他枪械与载具。
- 使用：正式战场、重坦挂载、库存、工坊；另有内存存档的独立试玩入口。

## 2 造型与空间
- 轮廓：后置厚机匣、下挂圆弹鼓、顶部提把、前置六管束；与狙击长细管、火神车载机匣区分。
- 主次：机匣和弹鼓为大形，枪管用长明暗面，少量黄铜连接件；不铺满细纹。
- 明暗：森林绿描边，鼠尾草绿机匣、奶油受光面、冷灰绿钢管、暖棕握把，有限平涂。
- 地面、邻接和通路：手持/挂载部件，不新增地面影子或实体碰撞；与猫手、车座同屏复核。

## 3 技术交付
- 基础逻辑包围约 x=-29..47，y=-23..29；握持原点(0,0)，枪口(43,0)及 GUN_SCALE=0.78 不变。
- 六个部件由统一挂点配置驱动；原始、升级、拆卸及独立部件预览共用绘制器。
- 分层：握把/底架→机匣壳体→弹鼓与供弹→逐管深度排序→固定抱箍/准星→原枪口特效；后坐由正式外层变换驱动。
- 透明、倍率：Canvas 矢量图元，沿用上下文倍率，无透明底板、导出图集或新增解码纹理。
- 文件：src/rendering/gatling-art.js；接入 characters.js/equipment-parts.js；试玩 src/art/gatling-* 与 gatling-preview.html。
- 预算：六根枪管、六个部件有界绘制；无新增常驻图集、粒子或缓存，不声称帧率提升。
- 昼夜：沿用正式场景色调，不另做夜间副本。

## 4 动画任务补充
- 保留正式 rotor 相位、速度缓入缓出、heat、recoil；不修改伤害/射速/弹药配置。
- 枪管各自围绕枪轴投影并按深度排序；机匣、抱箍不随转子旋转；停火保留角度、暂停冻结。
- 猫身体不改；不生成视频，不适用帧率、源片哈希与裁切。
- 部件拆卸仅移除对应结构，仍保留其余六管运动；试装和正式升级来源一致。

## 5 制作指令
延续现有森林绘本平涂，用部件形体、顶面和接触暗面提升体积；先改善轮廓，再补稀疏结构。保持握持和弹道锚点。排除整束平面旋转、整枪拉伸假动作、满屏高光、额外方向与烘焙猫身体。

## 6 验收记录
上一轮技术验收通过，但用户复核退回造型定位：初始版本过于复杂，满级差异不足。以下为上一轮历史证据，不代表用户接受初始造型。

### 2026-10-23 修订目标（制作前）
- 以用户图2的圆角机匣、简单弹鼓和短顶把为初始基准，图3复杂结构作为满级目标；不推广其他枪械。
- 机匣升级增加后部壳体、开放提把与装甲盖；射速增加后置散热模块；弹仓增加下挂鼓体和轮毂；装填增加供弹盒；射程强化抱箍；精度增加前部准星。各自只由对应等级驱动，不靠整枪缩放或换色表达升级。
- 保持握持原点与枪口(43,0)，各部件共享正式与工坊绘制入口；改造前后包围联合用于工坊热点，不增加碰撞。分层为握把、机匣、转管、供弹/弹鼓/散热/抱箍/准星。
- 六管相位、后坐、热量、组装交易、猫连续帧与车体动作保留；无新增位图或运行缓存。
- 样板提供初始、中期、满级同尺度对照和实际游戏切换；检查320/390/桌面昼夜、单件升级拆装与连续起停。修订验收见文末记录。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 静态轮廓、体积与系列一致 | [同尺度前后对比](../art-reference/gatling-quality/before-after.png)：机匣顶面/侧面分开，圆弹鼓有侧厚与连接，提把留空，管束保留完整轴线。正常尺寸也能区分主体，不依赖放大细纹 |
| 手持昼夜与设备宽度 | [320昼](../art-reference/gatling-quality/hand-320-day.png)、[320夜](../art-reference/gatling-quality/hand-320-night.png)、[390昼](../art-reference/gatling-quality/hand-390-day.png)、[390夜](../art-reference/gatling-quality/hand-390-night.png)、[桌面昼](../art-reference/gatling-quality/hand-1280-day.png)、[桌面夜](../art-reference/gatling-quality/hand-1280-night.png)：猫、枪、怪物与环境同屏可读，枪口及双手连接未断裂 |
| 重坦挂载与遮挡 | [320昼](../art-reference/gatling-quality/tank-320-day.png)、[320夜](../art-reference/gatling-quality/tank-320-night.png)、[390昼](../art-reference/gatling-quality/tank-390-day.png)、[390夜](../art-reference/gatling-quality/tank-390-night.png)、[桌面昼](../art-reference/gatling-quality/tank-1280-day.png)、[桌面夜](../art-reference/gatling-quality/tank-1280-night.png)：车体、猫和独立炮架层序保留；手持和车载两把枪均沿用原玩法 |
| 转管起停、后坐、转向、移动 | [手持录像](../art-reference/gatling-quality/motion-hand.webm)、[重坦录像](../art-reference/gatling-quality/motion-tank.webm)为 Canvas 实时录制，非抽帧拼接。各9秒：连射→停火→再启动/转向→移动；[手持状态](../art-reference/gatling-quality/motion-hand.json)、[车载状态](../art-reference/gatling-quality/motion-tank.json)各36样本，停火期间弹药分别恒为47/79，转速趋近0，恢复后约38，真实后坐存在。停火验收只在更新时排除采集树候选，绘制时恢复树木，避免无怪物时自动采集继续开火 |
| 暂停、逐级部件与局部拆卸 | [检查结果](../art-reference/gatling-quality/checks.json)：六类部件全部等级输出有差异、移除确实改变局部外形；最高级与六种拆件状态都仍随转子变化，暂停冻结；猫图集ready |
| 实际装配交互 | [试装与工具](../art-reference/gatling-quality/assembly-before.png)、[完整枪身](../art-reference/gatling-quality/assembly-model.png)、[完成结算](../art-reference/gatling-quality/assembly-complete.png)：320宽度完成选择弹仓→试装→扳手就位→按住施工→保存；容量80→88，原余弹79保留，金币/木材按正式报价扣除。其他五件逐级与拆卸已检查，未重复每件交易施工 |
| 其他武器与载具 | [逐像素对照](../art-reference/gatling-quality/other-weapons.json)：除加特林外16类武器在相同绘制状态下与修改前一致。火神炮沿用原 rotary-barrels.js；车体、猫动画、碰撞与战斗数值未修改 |
| 通行与边界 | 实际移动录像经过正式更新与碰撞；武器为纯表现，不增加通路/水界或新碰撞；不涉及全地图镜像、桥头和水界改造，无需扩大全地图验收 |
| 资源与预算 | 新正式美术模块4548字节、挂点模块442字节；无新位图、SVG、视频运行资源或纹理缓存，六管及部件循环有界。试玩录制仅调试按钮触发，结束停止流；两张静态预览720×320，总基础RGBA约1.76MiB，仅试玩页使用。录像/截图在docs，不进入战斗资源加载。增加图元细节，未做帧率基准，不声称性能提升 |

正式绘制入口：src/rendering/characters.js#drawWeapon → src/rendering/gatling-art.js#drawGatling；独立部件为 drawEquipmentPart → drawGatlingPart；工坊挂点来自 src/config/gatling-art.js。六管相位仍读取正式弹仓，未重写动作时钟。

designCriterion：visual-contract.json 的 gatling-art-quality，绑定 src/rendering/visual-review.js，静态与运动检查按上述逐项证据通过。试玩入口 gatling-preview.html 使用正式 createApplication、内存存档及隔离耐久靶；不读写玩家正式进度。320/390为浏览器内正式页面宽度模拟，未冒充物理手机测量。

验证：weapon-turn-hovercraft.test.mjs、weapon-heat.test.mjs、recoil.test.mjs 共17项通过；workshop-components.test.mjs 按名称筛选旧档补齐、部件叠加、升级状态保留及车速/炮塔4项通过。npm run check:i18n通过（2544键）；浏览器无 error/warn；未运行全量测试。新试玩显示文案全部进入语言表。

长期参考：[前后对比](../art-reference/gatling-quality/before-after.png)与[完整装配枪身](../art-reference/gatling-quality/assembly-model.png)。本轮以单把枪做品质样板，后续美术方向仍可按实际体验继续修订。


## 7 改装成长修订验收（2026-10-23）

结论：实现与实机检查通过，供用户继续审美复核；本次将复杂结构定位为满级外观，取代上一轮复杂原装方案。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 原装保留、改装有成长 | [三阶段同尺度对照](../art-reference/gatling-growth/progression.png)：原装为圆角机匣、无纹弹鼓与短顶把；中期出现散热块、开放提把和下挂鼓体；满级补全机匣装甲盖、供弹盒、分层轮毂、强化抱箍与前部准星。不是把整枪统一放大 |
| 原始外观准确还原 | [检查结果](../art-reference/gatling-growth/checks.json)的 originalRestored 为 true：固定转子角度、无热无后坐状态，与改造前四个图元及原六管绘制器逐像素一致。其他状态由连续动作实测覆盖，不将单帧相等外推为所有状态逐像素相等 |
| 六件独立成长与拆装 | 每件依自身等级改变，伤害20级、其他5级逐级输出不同，满级移除对应件后图像改变，仍保留六管运动。原装射速驱动及供弹件位于壳内，只在独立旧件卡与拆出时显示；外露模块从2级开始。工坊图卡用全等级联合边界，施工前后保持相同倍率 |
| 真实工坊操作 | [完成结算](../art-reference/gatling-growth/assembly-complete.png)、[单件改装枪身](../art-reference/gatling-growth/assembly-model.png)：320宽度完成弹仓1→2的选择、试装、扳手施工、保存；容量80→88，金币100000→99935、木材100000→99974，其他部件保持原装 |
| 昼夜与小屏同屏 | gatling-growth 下 max-hand/max-tank 的320、390、1280各昼夜截图共12张；猫、枪、重坦、怪物、环境与HUD同屏。另有base-hand的390昼夜和1280白天原装复核。浏览器模拟页面宽度，不声称实体手机硬件测试 |
| 连射、停转、后坐和驾驶 | [手持录像](../art-reference/gatling-growth/motion-max-hand.webm)、[重坦录像](../art-reference/gatling-growth/motion-max-tank.webm)各约9秒真实Canvas录制；连射→停火减速→反向再射→移动，猫动作与履带继续。对应JSON各36样本，停火余弹分别固定36/113，转速从约13衰减至0，恢复射击有真实后坐。无复制帧或整枪旋转伪造转管 |
| 遮挡、通路及资源 | 只修改枪体和工坊取景，碰撞、地形和水界不变；移动录像核对手/枪/车体连接和前后层序。无新增运行位图、SVG、视频或常驻纹理；正式美术模块约9KB、挂点约0.6KB，有界六管与部件循环。试玩三张720×320画布基础RGBA约2.64MiB；截图录像仅在docs，非战斗加载资源；未做帧率基准，不声称性能改善 |
| 国际化与范围 | 三阶段选择及说明进入中英文语言表。21项后坐/热量/转向/部件相关测试通过，check:i18n通过（2546键、两个语言包）；浏览器无error/warn。只验证本枪与直接影响的工坊，不运行全量测试 |

正式入口仍为 characters.js#drawWeapon → gatling-art.js#drawGatling；工坊 drawEquipmentPart → drawGatlingPart，图卡 drawWorkshopPartComparison；visual-review.js 的 gatling-art-quality 同屏绘制原装/满级，visual-contract.json 同名 designCriterion 已改为成长层级目标。试玩可选原装、中期、满级的真实进度与手持/重坦，均在内存中，不修改玩家存档。

本轮保留上一轮的六管投影和复杂满级结构；未推广其他武器，也未引入多方向实验分支。
