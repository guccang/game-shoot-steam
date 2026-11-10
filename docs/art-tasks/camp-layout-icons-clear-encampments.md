# 营地规划图标与扩建清场

## 目标与参考
开发阶段程序绘制。参考用户规划图和扩建营门截图：以建筑剪影取代文字矩形，公共设施使用同一份校验清单显示；选中显示名称，固定设施可查看不可搬迁。扩建占用的野外怪物营地隐藏实体、地面、地图标记并停止居民攻击。

## 结构与接口
沿用森林绿描边、奶油黄和柔和草木色。已有住宅/仓库/猫窝/工坊调用正式立面画笔的无文字模式，其他功能采用停车格、炉烟囱、拱门、帐篷、木牌等小图标。图标不替代实际占地，选中框反映真实布局脚底。公共设施虚线底座、选中显示固定说明，禁止拖动。画布DPR上限2、触控区44、只显示当前视口设施，无新增位图或缓存图集。

## 保留与范围
稳定设施ID、移动保存事务、道路、所有正式世界建筑造型和角色连续动作保留。怪物营地保留原存档进度，仅依据已购土地过滤，未购地和其他地图不受影响。动画素材与PNG替换不适用，本轮不生成图片。

## 验收计划
正式入口 src/ui/camp-layout.js、src/rendering/camp-layout-icons.js、src/core/battle/monster-camps.js。目标：所有实际禁放公共设施可见且可识别，缩略图没有建筑名称文字，选中可读；白天夜晚与多尺寸手机检查；扩建/读档后无残余营地与攻击。对应 uiFoundationCriterion 和正式怪物营地设计合同。结果见下节。

## 验收结果（通过）
- 对应 designCriterion：uiFoundationCriterion（手机底板与中文可读）、monsterCampsCriterion（营地正式地面、居民与标牌）；本任务追加要求为已购营地覆盖后整体退场。
- 正式绘制器：drawCampLayoutIcon、drawBuildingArchitecture 无文字模式、monsterCampObjects 与 drawMonsterCampGround；选择入口 createCampLayoutPanel。
- 自动检查：布局原有 9 项、新增公共设施与扩建退场 2 项、野外营地关联回归 6 项通过。浏览器正式页面检查通过，无页面异常。
- 手机 320×568、360×640、390×844、430×932、844×390 检查无横向溢出；公共设施可选、名称可读、移动禁用；规划画布无文字标签。
- 证据：output/playwright/camp-layout-icons-retired/layout-icons.png、public-selected.png、icons-*.png、camp-before.png、camp-after-day.png、camp-after-night.png；report.json 与 video/ 为交互记录。
- 昼夜场景复核：棚屋、营火和居民整体消失，无残余驻地；无新增通行阻挡。保留角色、载具和环境既有动作，未修改动画资产，动作制作验收不适用。
- 资源预算：新增位图 0 字节；设施图标按视口绘制，退场清单按土地状态缓存；未引入动画缓存或全地图逐帧遍历。
- 桌面独立布局不适用，按当前手机专用 UI 合同执行，横屏手机已检查。结论：通过。
