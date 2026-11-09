# 营地居民混编

依据[美术标准](../art-generation-standard.md)和[任务模板](../art-generation-brief.md)，本轮复用现有正式怪物绘制器与独立动作，不生成新位图。

## 目标与制作规格

- 11处营地按环境主题固定混编五个名额，每营地至少三类外形；低级营地普通、孢子、橡果和叶翼为主，高级营地加入盾卫、车团与重炮。
- 复用八类正式物种轮廓、碰撞半径、地区等级及兵种属性；不增加总人数，不额外叠加精英倍率，种子与击杀名额使用原稳定槽位。
- 居民生活、预警、战斗、返营均保留物种。生活与返营推进真实脚步、车轮和重靴时钟；叶翼保持翼根振翅，武器、车体和身体独立。
- 预警只转头注视，远程不射击；头顶提示按实际身高抬高。居民依然分两三只聚集，按脚底排序，保留原过道和无围栏的开放营地。
- 共用身体面部增加可选注视输入，未设置的普通野怪绘制保持原行为。角色、武器、载具、死亡、暂停和减少动态沿用原合同。
- 正式入口：`src/config/camp-residents.js`、`src/core/battle/monster-camps.js`、`src/rendering/monster-camps.js`。新运行位图及常驻缓存为0；PNG精修本轮不适用。

## 验收

- 通过：19项营地回归与5项共用动作检查，共24项。11处营地均五个名额、至少三种物种；生活转入战斗保留身份，部分击杀重载仍恢复原槽位，种子和次数仍只结算一轮。
- 通过：真实远程状态机在预警带零敌人、零发射，进入营地后射击，离屏返营清理其在途弹；车轮与重靴按实际位移更新，警觉时保留静止相位。高个居民的预警与离屏身体余量同步增加。
- 通过：正式浏览器在歪锅、呼噜松、迟到邮局、边境夜宵和湖畔空碗拍摄昼夜同屏；显示物种、驻足预警、身份及攻击状态符合配置。原自动武器实际清空低级混编营地，三个种子各一粒，清空次数为1。
- 通过：390手机和1280桌面原竖版可辨各类轮廓、武器与高个提示；320短屏无页面溢出，站北侧远观时原底栏会遮挡最远端居民，靠近后进入场景中心。保留原界面，不引入额外说明页或按钮。
- 证据：[低级混编白天](../art-reference/camp-residents/ember-pot-day.png)、[夜晚](../art-reference/camp-residents/ember-pot-night.png)、[叶翼营地](../art-reference/camp-residents/snore-pine-day.png)、[邮局夜景](../art-reference/camp-residents/late-mail-night.png)、[高级混编](../art-reference/camp-residents/last-supper-day.png)、[湖畔](../art-reference/camp-residents/valley-bowl-night.png)、[短屏](../art-reference/camp-residents/mixed-320.png)、[桌面竖版](../art-reference/camp-residents/mixed-1280.png)。
- 动作：[车团与飞翼连续录制](../art-reference/camp-residents/late-mail-motion.webm)、[盾卫与重炮连续录制](../art-reference/camp-residents/last-supper-motion.webm)，正式Canvas 20fps，包含真实按键进出营地、前摇、发射和越界追击；未复制静帧。世界地形、玩家连续帧和手持武器未修改。
- 正式合同：`visual-contract.json#campResidentsCriterion`；[浏览器结果](../art-reference/camp-residents/browser-results.json)。使用隔离存档和4189服务，保留原4175服务；浏览器模拟手机，未测试物理设备，未运行全量测试。沿用程序绘制，无新增位图、离屏画布或常驻图集。
