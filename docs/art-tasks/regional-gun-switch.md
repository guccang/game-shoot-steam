# 森林巡游美术生成任务单

复制本任务单，为每项美术任务保存一份至 `docs/art-tasks/<任务标识>.md`；已有对应任务单时继续更新。执行依据为[游戏美术资源生成标准](../art-generation-standard.md)与 [AGENTS.md](../../AGENTS.md)。复制到子目录后，将这两个链接分别改为 `../art-generation-standard.md` 与 `../../AGENTS.md`，其他相对链接也按实际位置调整。未确定的尺寸、锚点或碰撞关系，应先对照现有同类资源核实。

默认按 **imagegen + 程序绘制 + SVG 实现动态效果与交互 → 实机确认 → imagegen精修 → PNG替换与复核** 推进。本任务单分阶段填写，开发阶段不要求最终PNG齐备；后续精修项明确标注“后续阶段”，不得以空白模板或生成预览代替当前阶段验收。用户明确要求本次直接生成或替换PNG时，记录该范围并验证已有动态逻辑。

## 1 目标与范围
地区营地主炮切换（regional-gun-switch）。本轮扩展既有车辆整备列表，所有已拥有主炮包含原厂炮可现场免费换装；保留当地销售目录、解锁条件与正式装配事务。参考现有 src/ui/regional-camps.js 与 docs/ui-foundation.md，不新增静态美术资源。

## 2 造型与空间
复用森林绿/奶油色手机底板与ui-section、ui-button；当前主炮禁用，未安装炮与来源车辆使用文字区分。纯界面，不涉及世界剪影、光向、活动空间或地形修改。

## 3 技术交付
列表随现有手机底板宽度排版，按钮至少44px，原生滚动；DOM锚点 regional-camps-body，动作 switch-gun，稳定key为主炮编号。正式入口 src/ui/regional-camps.js#renderOwnedMainGuns，业务沿用 mountMainGun。无新位图、画布或图集缓存，原有必需资源不变。

## 4 动画任务补充
本轮不新增动画。暂停页面内完成事务，关闭恢复原游戏时钟；既有角色、车辆、主炮独立动作、照明和昼夜效果保留。

## 5 生成指令
没有使用imagegen，本轮为现有DOM列表与操作扩展，通用控件即可表达装备来源、状态和切换。PNG精修不适用，无新增插画。

## 6 验收记录
设计目标：现场换回原厂炮，跨营地使用已购主炮，保留弹药与金币，不改变远程调炮限制。
专项 tests/regional-gun-switch.test.mjs 2项通过，涵盖五营地往返换装、原弹仓退回、读档、失败回滚与来源车辆距离。
2026-11-11 实际界面验收通过：五个营地均通过正式居民服务入口换炮并换回125毫米原厂炮；320×568、390×844与844×390昼夜截图无横向溢出，短屏列表原生滚动可操作，浏览器无异常。截图、browser-result.json和连续录像存于 output/regional-gun-switch。本轮没有世界碰撞或角色动作修改，无新增运行位图与缓存。动态界面开发结论：通过；PNG精修不适用。长期参考图：[营地主炮切换](../art-reference/regional-gun-switch.png)。
正式DOM检查器 inspectRegionalGunSwitch；designCriterion: regional-gun-switch。
