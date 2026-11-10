# 营地就近分叉道路任务单

依据：[美术标准](../art-generation-standard.md)、[AGENTS](../../AGENTS.md)。按任务单结构记录。

## 1 目标与范围
开发阶段程序道路调整；停车场从外出路分叉，其他建筑就近接路。参考本次用户停车场截图及既有营地道路。保留土、木、石材质、宽窄道路、设施锚点、角色与载具动作。无新增图片，PNG精修不适用。

## 2 造型与空间
门口宽路先形成骨架，房屋宽支路与小设施细路接入最近可达路段。保留建筑、站牌底座、围栏及农田避让；不改变地面明暗及照明。

## 3 技术交付
房屋道路宽56，小设施24；世界坐标和门口锚点保持。地面层沿用正式Canvas绘制，路径仍携带width与targetId。网格约5万格，有界寻路仅布局变化计算，存档对象缓存；不新增位图、解码内存或资源依赖。实现src/world/camp-layout-roads.js，绘制src/rendering/camp-layout.js。

## 4 动画任务补充
静态道路连接几何，动作/时钟/独立部件均不修改。

## 5 生成指令
未使用imagegen，沿用现有程序路面材质，修改道路连接几何。

## 6 验收记录
- 15项针对性测试通过：camp-layout、camp-facility-road-widths、defense-post-gate-placement、camp-nearest-road-branches。
- 停车场默认入口以不足120世界单位短支路横向接入北门干道；全部设施首次到达已有网格路段即收口，重复计算结果一致。
- 手机正式保存搬迁停车场至(-280,-20)，保留提炼厂南侧站牌；保存成功、全部道路连通，宽路56/细路24，站牌底座净空通过。
- 实机截图：output/playwright/camp-nearest-road-branches/{earth,wood,stone}-{day,night}.png。已目视检查石路白天/夜晚：北门主路向左分叉，沿用材质、照明和地面层；角色、附近设施与UI同屏，无新增遮挡实体。
- 规划截图：同目录layout-320.png、layout-390.png、layout-430.png。已检查390宽预览，停车场支路与正式场景一致；三种手机尺寸无横向溢出，未新增桌面布局。
- 运行报告report.json，录制video/。浏览器无页面错误，无新增图片/素材依赖；路网保留按布局缓存，不增加逐帧寻路。
- 纯道路连接变更，不修改怪物、载具和角色动作；帧动画、枪械及PNG替换验收不适用。碰撞边界不变，已有围栏通行及站牌避让针对性用例通过。

正式绘制器：src/rendering/camp-layout.js / drawCampLayoutRoads；路面材质src/rendering/camp-road-finish.js；规划面板使用同一campLayoutRoads。

designCriterion：campManagement、uiFoundationCriterion（道路布局与手机规划界面）。

开发阶段结论：通过。PNG精修：本任务不涉及新增或替换位图。长期参考为上述正式昼夜截图。
