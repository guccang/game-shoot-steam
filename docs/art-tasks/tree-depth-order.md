# 野外倒木层级修复任务单

依据[美术标准](../art-generation-standard.md)，由美术任务单复制后按本次仅改分层的范围填写。

## 1 目标与范围
修复可穿行的野外倒木、花草与碎石覆盖猫猫/车身。参考用户截图与forest-understory.js现有“车辆可以穿过”合同。动态效果修复，复用全部原资产，不新增PNG、SVG或imagegen资源；保留角色动作、车辆动画、树木遮挡和世界位置。适用森林低景，其他建筑及实体不改。

## 2 造型与空间
原造型、颜色、比例不变。低景在地面，实体角色/载具在其上；站立树木继续按脚底前后排序。低景组合内部仍按y排序。碰撞、道路、水界、缩放与锚点保持原样。

## 3 技术交付
world/forest-understory.js显式标记groundScenery；正式renderer.js在已有实体排序前区分地面景观，保持原坐标和浮空顺序。无新增画布/位图/缓存或第二轮地图查询；既有可见对象队列中增加常数时间比较。原透明资产与昼夜色调不变，必需资源沿用原版，无替代资源。

## 4 动画
无新增角色/载具动作，所有独立部件和动作时钟保持。验证步行与驾驶从低景前后经过；树木保持正常前后遮挡。录制路径待实机检查填写。

## 5 生成
本轮不生成美术资源：只修复正式队列分层，造型尺寸与透明边缘均不变。

## 6 验收
手机昼夜及前后通过截图已完成，结果见下文。正式入口：src/rendering/renderer.js；designCriterion：forest-understory-depth。PNG精修不适用；无桌面布局新增。

### 验收结果

- 通过：正式手机390×844昼夜场景，步行/战车在倒木前、中、后三个位置共12张截图；320×568短屏检查。现有低景在实体下方，未改变角色、载具、树木造型或动作资源。
- 证据：output/playwright/tree-depth-order/ 的day-vehicle-10/20/30.png、day-walk-10/20/30.png、night系列、short.png、video/及report.json。无浏览器pageerror。浏览器脚本tests/tree-depth-order-browser.cjs使用正式地图生成的倒木组合并采样连续经过位置。
- 站立树木、实体建筑没有groundScenery标记，继续使用原来的脚底排序；地面景观组合内部排序不变。无新增全图遍历和额外绘制次数。
- 既有map-expansion.test.mjs中“野外手机视野”检查失败：160视野覆盖137，旧阈值144；未修改的main同样137。本次不调整与分层无关的生态密度或测试阈值。
- 动态效果开发结论：通过。PNG精修：不适用。正式入口renderer.js对象排序；designCriterion=forest-understory-depth。
