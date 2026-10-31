# 移除地块与精简选种面板

依据：[美术标准](../art-generation-standard.md)、[项目合同](../../AGENTS.md)。

## 1 目标与范围

动态交互开发，稳定标识 farm-remove-compact-picker。种子选择只显示现有作物图标与右下角库存数量；删除名称、成熟时长、售价和长说明。新增农具栏移除入口及标准确认底板，真实走近后复用锄头动作平整土地。保留种子小屋入口（图标）、种子拖播、全部作物身份和原世界绘制；不生成或替换位图。参考用户本轮选种截图与 assets/farm 的现有作物图集。森林、湖谷通用。

## 2 造型与空间

沿用现有作物剪影，不新画植物；四列紧凑网格，每格图标为主体，库存数字为次。地块删除后移除田埂与作物，恢复原地表，不新增地形或碰撞。人物、怪物、车辆和建筑绘制保持原样。奶油底色与森林绿描边遵循手机框架；昼夜使用原色调逻辑。

## 3 技术交付

种子网格目标宽约260px，每格至少44px，图标约44px，数量右下角独立文字。浮层锚在点击地块附近并受安全区约束；确认对话框使用 ui-panel--compact，按钮使用统一样式。存档和交易由 core/farm.js 负责，DOM 和数量由 ui/farm.js 与 styles/farm.css 负责。仅新增按钮、文字和确认组件，不增加图片缓存；已有图集缺失保持明确报错。无需新透明背景导出或PNG替换。

## 4 动画任务补充

移除动作复用既有锄头的关节、接触点和命中时钟，猫身体保持原连续帧。暂停冻结、走近才命中，保存失败不移除。取消确认不提交动作，非空地块明确提示作物同时清除且种子不返还。新视频或生成帧不适用。

## 5 生成指令

不调用 imagegen：本次复用已经发布的作物图集、农具和手机底板，仅调整布局与功能。正式入口 src/ui/farm.js、src/ui/farm-removal.js、src/rendering/farm-tools.js；检查使用真实游戏。

## 6 验收记录

实施前目标：种子只露图标与数量；触摸种子、拖播和库存变化正常；空田/有作物移除、取消、保存失败、重载、任务田恢复均正确；320/390竖屏与844×390短屏检查昼夜。删除地块不改变地图边界或角色动作，桥头/水界等无改动，不单独扩大验收。资源预算无新增图集，原素材完整加载。

正式绘制器：drawFarmTool、drawFarm、createFarmPanel。designCriterion：world-farm-delivery；本轮案例 farm-remove-compact-picker。

动态效果开发结论：通过，详见下方实际验收。PNG精修替换：不适用，本次无资产替换需求。

### 实际验收结果

30项针对性检查通过：farm-removal 8、farm-economy 10、neighbor-gardening 8、farm-tools 4。覆盖空田、有作物、保存失败及抛错、编号不复用、原地再开垦、任务田恢复、队列同田清理、过期确认拒绝和暂停/距离/地图边界；未运行全量测试。

独立4175浏览器对工作树源码做响应替换，使用三个预置空田、库存和位置夹具。正式点击播种及从种子图标拖动播种成功，库存14→13和1→0；取消移除保留田块，确认移除走近后执行，保存失败保留作物、恢复保存后重试成功。移除不发金币、种子、经验或收获进度，刷新后只保留未移除的那块田，页面异常为0。复现入口 tests/farm-removal-picker-browser.cjs；运行前建立 output/playwright/farm-remove。

人工复核：[390白天](../verification/farm-remove-compact-picker/picker-390-day.png)、[320夜晚](../verification/farm-remove-compact-picker/picker-320-night.png)、[430白天](../verification/farm-remove-compact-picker/picker-430-day.png)、[844×390短屏](../verification/farm-remove-compact-picker/picker-844-night.png)、[作物移除确认](../verification/farm-remove-compact-picker/remove-confirm-night.png)。八种已解锁作物和购种入口共用260×198浮层，只有作物图标和库存数字，零库存禁用，999999角标保持在按钮内；各按钮不小于44px，浮层全部位于视口内，无横向溢出。农具六格保持三行，未增加整行遮挡；确认使用标准底板及取消焦点。植物轮廓、图集、地图边界和角色身体保持现有实现，移除复用现有锄头接触动作，非新动画制作。

正式 inspectFarm 返回 designCriterion=world-farm-delivery、world=true、overflow=false；图集2张、3145056解码像素，未增加图集、画布或缓存。上述为桌面浏览器手机视口模拟与真实DOM/游戏事务检查，不代表实体手机性能。资源生成、PNG替换、水界/桥头/新碰撞测试不适用，本次均未更改。

动态效果开发结论：通过。PNG精修替换：不适用。无待修订项；本轮长期参考为上述截图。
