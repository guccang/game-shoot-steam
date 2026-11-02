# NPC 分层交谈

当前有 35 个独立人物身份、241 段中文对白。厨房的阿团与室外阿团共用交情，旧哨站的薄荷同理；青芽与薄荷虽然原配置都使用 mint 键，但属于不同人物，使用不同存档命名空间。

## 交谈规则

- 第 1–3 段为初识，谈工作习惯与生活小事；第 4–6 段为熟悉，加入职业技巧与关系；第 7 段起交心，谈遗憾、愿望和真实探索线索。
- 每次点击人物或“再聊聊”抽取一段。同层读完一轮前不重复，轮完重新抽取，避免连续相同；最高层仅一段的普通营地讲述者会穿插回忆其他层。
- 六位居民及三位野外具名人物首次交心时优先透露各自的秘密。其余条目随机；已有的正式委托仍可通过任务回应提供相应探索线索。
- 主动点击才增加交情，关闭、重绘、通讯录、电话、任务或服务详情不增加。电话继续显示作息与去向，不远程赠送秘密。
- 每名人物独立持久化次数、已读编号、上一句编号。交情与秘密同一次保存提交；失败不展示未保存秘密、不改变进度，可重试。不提供旧存档迁移。
- “说说正事”回到原有委托、装备故事、店铺或营地故事。闲聊不自动接取任务、领奖、购买、设置追踪或传送；线索不等于装备所有权。

## 职业与内容清单

| 人物 | 职业 | 稳定身份 | 对白数 |
| --- | --- | --- | --- |
| 青芽 | 营地联络员 | camp:mint | 9 |
| 阿栎师傅 | 武器匠 | camp:oak | 9 |
| 苔轮 | 载具技师 | camp:wheel | 9 |
| 小灯 | 时空塔守望员 | camp:lumi | 9 |
| 雪团 | 补给整理员 · 画画爱好者 | resident:snow | 9 |
| 薄荷 | 巡线修灯员 | resident:mint | 9 |
| 阿团 | 厨师 | resident:cook | 9 |
| 铁牙 | 搬运工 · 陶作学徒 | resident:boar | 10 |
| 小夜 | 夜间邮差 | resident:bat | 9 |
| 枭爵 | 夜岗协调员 | resident:owl | 9 |
| 仓库管理员 | 仓储员 | shop:warehouse | 6 |
| 弹药补给员 | 补给员 | shop:ammo | 6 |
| 猫窝管理员 | 猫窝管理员 | shop:cat-home | 6 |
| 家具售货员 | 木作陈设师 | shop:furniture | 6 |
| 种子售货员 | 育苗员 | shop:seed | 6 |
| 维修中心接待员 | 救援技师 | shop:repair | 6 |
| 消防站值班员 | 护林消防员 | shop:fire | 6 |
| 时空塔接待员 | 塔内档案员 | shop:tower | 6 |
| 传奇工坊匠人 | 进阶装备匠 | shop:legendary | 6 |
| 武器工坊售货员 | 枪械顾问 | shop:weapons | 6 |
| 载具工坊售货员 | 车辆装配员 | shop:vehicle | 6 |
| 灰耳 | 营地守锅人 | wild:ash | 6 |
| 苔小报 | 营地小报记者 | wild:editor | 6 |
| 慢半拍 | 旧路邮差 | wild:postman | 6 |
| 守锅的团子 | 营地邻居 | camp-story:ember-pot | 6 |
| 打瞌睡的团子 | 营地邻居 | camp-story:snore-pine | 6 |
| 递报纸的团子 | 营地邻居 | camp-story:berry-rumor | 6 |
| 添茶的团子 | 营地邻居 | camp-story:moon-kettle | 6 |
| 抱桶的团子 | 营地邻居 | camp-story:leaky-roof | 6 |
| 贴邮票的团子 | 营地邻居 | camp-story:late-mail | 6 |
| 揉面的团子 | 营地邻居 | camp-story:last-supper | 6 |
| 洗碗的团子 | 营地邻居 | camp-story:valley-bowl | 6 |
| 捂耳朵的团子 | 营地邻居 | camp-story:valley-echo | 6 |
| 扫落叶的团子 | 营地邻居 | camp-story:valley-stamp | 6 |
| 盯锅的团子 | 营地邻居 | camp-story:valley-star | 6 |

## 可核对的玩法来源

| 话题 | 正式来源 | 内容边界 |
| --- | --- | --- |
| 六处埋藏点 | src/config/treasure.js、src/core/treasure.js | 同一目录绑定线索，手机寻宝记录；出土坦克报废待修，部件需运输安装 |
| 红狼与传奇工坊 | src/config/equipment-quests.js、src/config/equipment-story-chapters.js、src/progression/equipment-quests.js、src/core/legendary-workshop.js | 铁牙的木料护送故事开放购买；借车不等于拥有，工坊另有所有权及到场条件 |
| 灰堆 | src/config/monster-camps.js、src/core/monster-camps.js | 只记录线索，保留时段、清场、现场距离与唯一奖励条件 |
| 种田收入 | src/ui/mainline.js 的正式种田备忘、src/core/farm.js | 一茬浇水一次最多缩短25%，收成运回小屋仓库才结算金币 |
| 猫猫弹药 | src/core/supplies.js | 背包装不下转存当前载具且仍受载重约束；装填按库存来源取弹 |
| 车炮搭配 | src/config/treasure.js、src/config/vehicle-armaments.js | 长枝穿透、蜂巢散射与弹种如实描述，不虚构强化或伤害加成 |

## 验证结果

- 新增交谈逻辑 9 项通过；寻宝、营地、柜台回归 37 项通过；电话与背包 4 项通过。
- 营地回归另有 1 项既有失败：“所有等级带、全部种子都有固定来源”在检查所有种子均有营地来源时失败。在未修改的 main（cf58fdc）用相同测试名复现；本轮未改变种子配置或该测试。
- 三项浏览器脚本通过：npc-dialogue-browser、npc-mainline-browser、boss-disengage-browser。覆盖真实点击、独立身份、不自动接单、手机线索、读档、购物、主线服务、脱战补给、320/390 昼夜与568横屏。浏览器 pageerror 为0。
- 实机截图与视觉复核详见 docs/art-tasks/npc-story-dialogue.md；截图保留在 output/playwright/npc-story-dialogue/。
