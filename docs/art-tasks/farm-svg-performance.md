# 农田 SVG 图集性能优化任务单

依据：[美术生成标准](../art-generation-standard.md)、[任务单模板](../art-generation-brief.md)、[AGENTS.md](../../AGENTS.md)。

## 1 目标与范围

- 稳定标识：`world-farm-delivery`；类别：作物运行资源加载与农田触控投影。
- 阶段：开发阶段性能优化，不生成新造型。华为浏览器农田实测10～20多帧，营地20～30多帧。
- 目标：SVG 在加载时一次栅格化，避免每株每切片重复处理矢量图集；保持原动画与交互。
- 参考：`assets/farm/manifest.json` 的四张原图集，正式农田绘制器。
- 数量：两张 SVG 转为内存 PNG 图片；两张现有 PNG 原样使用。
- 保留：三阶段成长、逐株相位、三/六切片弯曲、固定根部、暂停与浇水、收割、深度排序、触控最小44px。后续精修不适用，本次无美术重绘需求。

## 2 造型与空间

剪影、变体、配色、光向、主次、地面连接、邻接建筑、通行空间全部沿用原版。无布局、碰撞、大小或活动空间修改。透明图集转换不增加背景、不合并实体。

## 3 技术交付

- 尺寸、像素坐标、透明度：保持 manifest 中原图集尺寸及 rect；逻辑三阶段仍为18×14、32×40、49×67的适配框。
- 锚点：原根部 `(item.x,item.y+5)`，图案脚底；分层仍为地面土壤、排序作物、独立特效。
- 程序负责全部成长时间、动态、触控和数值；本次只改变 SVG 图片解码后的绘制来源。
- 正式入口：`src/rendering/farm-atlas.js#loadFarmSheet` → `farm.js#loadFarmArt/drawFarmCrop` → `renderer.js`。
- 缓存预算：保持四个共享图片源，无单株缓存、昼夜副本或动画帧缓存。两张 SVG 的栅格像素共1,446,912，RGBA约5.52MiB；转换临时画布和对象URL在成功及失败路径均释放。四张图总像素4,591,968，约17.52MiB基础RGBA，不含浏览器内部副本及临时编码峰值。
- 缺失或转换失败：明确抛错，清除 pending 后允许重试，全部成功后一次发布；不静默回退原SVG。
- 农田形状CSS仅在倍率改变时更新；走位仍逐帧投影。新增 `render.crops` 专项计时、导出 `farmArt` 预算。

## 4 动画任务补充

不修改 `farm-growth.js` 的动作公式、时钟、时长、切片数和固定根部。沿用 `game.time`、视觉成熟时间及减少动态设置。猫身体、操枪和载具独立部件不修改；本次不涉及视频或新增序列帧。

## 5 生成指令

未使用 imagegen：原SVG造型已确认，本次需要确定性栅格化保留图案。Canvas原尺寸绘制后编码透明PNG并解码为图片，不新增磁盘美术资源。

## 6 验收记录

- 诊断依据：用户上传性能日志；基准 `output/farm-performance/atlas-benchmark.json`。桌面Edge的72株强制读回测试用于识别热点，不等同华为手机帧率。
- 系列、透明边界与图集尺寸：`tests/farm-atlas-browser.cjs`通过。原尺寸透明通道完全一致，预乘透明色读回造成的可见色差小于1/255；默认画布与软件画布的抗锯齿不同，最终比较统一使用正式加载器的默认后端。详见 `output/farm-performance/farm-atlas.json`。
- 动作、生长、暂停、浇水、收割：9项单元测试通过；正式页面 `farm-growth` 用例通过，暂停冻结、浇水过渡和收割入库均正常。录像 `output/playwright/farm-growth/video/page@489493d07d9f288366658f9faa3eb961.webm`。`farm-atlas-scene`实际点击SVG作物收割通过，无页面错误。
- 手机短屏、昼夜同屏和既有竖版容器：人工复核 `output/farm-performance/mixed-390-day.png`、`mixed-320-night.png`、`mixed-1280-night.png`，作物根部、颜色与透明边缘正常，未新增桌面布局；夜色权重确认为1。成长分镜在 `output/playwright/farm-growth/growth-and-sway.png`。
- 遮挡、通行、操枪和驾驶：未改动对应几何或绘制顺序；混排用例通过正式输入走位、SVG作物点击收割。`crop-expansion-scene`通过，人工复核 `output/playwright/crop-expansion/combined-day.png` 与 `combined-night.png` 中猫、怪物、载具、作物及UI同屏，比例、落地与夜间可读性保持。未重复无关水界或载具物理测试。
- 缓存预算、失败和重试：四张图集共4,591,968像素；阻断PNG/SVG资源均明确失败，恢复后加载全部四张，`farm-loading`通过。临时画布及URL在finally释放。
- PNG资产替换：不适用，本次仅加载期转换，无精修资源交付。
- `designCriterion`：`world-farm-delivery`，关联 `visual-contract.json#farmEconomy`。
- 本轮本地验证结论：通过。交错预热的72株强制读回基准：扩展SVG中位37.9→9.0ms，分类SVG71.7→9.5ms；PNG保持约9ms。此数字包含绘制读回，不是游戏帧率。
- 限制：华为实机帧率须在用户设备上重新采样，不以桌面结果代替。`crop-expansion`旧综合商店用例在购买按钮禁用（游戏paused）处失败，未修改商店逻辑；本次作物显示、成长、触控收割与加载由专项用例覆盖，不能宣称该商店综合用例通过。
- PNG精修替换结论：不适用，无新资源精修。下一次设备采样可读取 `render.crops`、`visible.crops` 和 `rendering.farmArt`。
