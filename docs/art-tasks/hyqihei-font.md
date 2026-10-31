# 汉仪旗黑字体接入任务单

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 资源中文名称与稳定标识 | 汉仪旗黑 75S / hyqihei-75s |
| 类别和用途 | UI 与 Canvas 程序文字字体 |
| 本轮目标 | 首页、菜单、HUD、路牌、伤害数字、地图和工作台统一使用用户指定字形 |
| 数量和变体 | 一个完整 TTF；使用原字号、字重声明和文字内容，不制作字形变体 |
| 保留项 | 游戏布局、颜色、角色比例、动作、装备、碰撞和全部玩法规则 |
| 制作路线 | 原文件原样复制，CSS FontFace 接入、Canvas 字体入口统一、启动加载屏障 |
| 参考与同类资产 | 用户指定 F:/Documents/game-engine/phaser-engine/runtime/fonts/HYQiHei_75S.ttf；原游戏实际中英文界面 |
| 使用场景 | 全部游戏页面、数值工作台和加特林独立预览及内嵌场景 |

## 2 造型与空间

| 字段 | 填写内容 |
| --- | --- |
| 主体剪影 | 直接采用指定字体原有字形，不重绘或拉伸 |
| 与其他变体的区别 | 不适用，只有指定的一个字重文件；100–900 声明统一映射到原文件，不合成其他字重 |
| 主次关系 | 沿用原字号、颜色、间距和段落层级 |
| 地面衔接 | 不适用；本次不修改任何地形素材 |
| 活动空间 | 原 HUD 和交互入口不移动，文字换行与可点击性须实际检查 |
| 邻接组合 | 文字与原卡片、路牌、怪物、载具和战场共同显示 |
| 光向与明暗 | 文字沿用现有昼夜颜色处理，无新增光源 |

## 3 技术交付

| 字段 | 填写内容 |
| --- | --- |
| 逻辑尺寸 | 沿用各 DOM 和 Canvas 的逻辑字号 |
| 像素尺寸与倍率 | 字体矢量轮廓按原 Canvas 像素比栅格化，不制作位图字库 |
| 锚点与原点 | 保留原 textAlign、textBaseline 和坐标 |
| 分层 | DOM 保持原层级；Canvas 保持原绘制顺序 |
| 透明背景 | 原字体轮廓透明，沿用原文字填充色 |
| 碰撞与可通行性 | 不适用；无实体或碰撞变更 |
| 昼夜处理 | 正式绘制器沿用原色调，昼夜都复核文字可读性 |
| 文件格式与位置 | assets/fonts/HYQiHei_75S.ttf；src/styles/fonts.css；src/rendering/text-style.js；src/platform/fonts.js |
| 内存与缓存预算 | 原文件 8,885,184 字节（约 8.47 MiB），不裁剪字符；每个文档一个 FontFace，预加载与 CSS 共用同一 URL；浏览器管理字形缓存，无额外昼夜副本 |

## 4 动画任务补充

不适用：只替换字体，角色视频帧、起停、手持武器、后坐、履带、旋翼和动画时钟不变。实际昼夜同屏仍检查文字与原角色、怪物及载具的关系。

## 5 生成指令

不调用生成工具。使用用户给定的 TTF 原文件，不改变轮廓，不按当前中文表裁剪，以保留原文件中的其他语言字符。界面和画布统一命名字体；正式初始化须等待字体完成解码，资源缺失显示语言表错误并阻止启动。按中英文、320/390/1280 宽度复核排版。

## 6 验收记录

验收日期：2026-10-23。对应 designCriterion：`hyqihei-font`。结论：通过。

| 检查项 | 结果与证据 |
| --- | --- |
| 文件来源与完整性 | 用户原文件与运行文件 SHA-256 均为 `159602E457BECB03826DEC370B30DCBF626880344E1D74299CF7E04BCAFAEE4F`，8,885,184 字节，未裁剪、转换或修改轮廓 |
| 实际字形 | Chromium 平台字体报告中，中英文标题均由自定义字体 `HYQiHei` / `HYQiHei_75S` 绘制，不只检查 CSS 字体名 |
| 正式绘制 | 每种语言采样前 300 次实际 Canvas 文字调用，均使用统一字体且发生在字体加载成功之后；DOM 可见文本的计算字体一致 |
| 桌面和手机 | 首轮 61 个检查点覆盖 1280×900、390×844、320×844 的中英文首页、昼夜战场、设置、工坊、角色、地图、剧情、秘境，以及工作台、独立预览和内嵌游戏 |
| 发现与修订 | 320 宽英文地图卡片的 Jiuzhaigou 超宽，增加长单词换行；合入主分支最新加特林内容后，19 个针对性复查点通过，未出现非省略样式的文本横向溢出 |
| 最终主分支兼容 | 入职剧情与双工坊合入后，补充中英文、三种宽度的对白昼夜及双工坊共 24 个检查点，页面异常为零；常规面板脚本改用隔离测试旧档，首次入职由独立脚本覆盖 |
| 既有省略规则 | 小型玩家/载具状态栏名称、手机剧情目录长标题继续使用原省略样式；没有修改对应文本内容 |
| 同屏审美 | 正式隔离试玩额外完成 320、390、1280 三种宽度的昼夜共 6 张截图，角色、怪物、坦克、场景和 UI 同屏；路牌、怪物标签、伤害数字与 HUD 采用指定字形，层级和点击入口保持可辨 |
| 缺失与恢复 | 拦截字体请求后显示本地化错误、禁用开始按钮；恢复请求并刷新后可正常启动。正常页面没有脚本异常；缺失测试仅产生预期错误 |
| 自动检查 | `npm run check:i18n` 通过：2,582 条文案、2 个语言包；`node --test tests/title-menu.test.mjs tests/i18n-english.test.mjs` 的 6 项检查通过；未运行全量测试 |
| 资源预算 | 运行资源增加一个完整 TTF；DOM 和 Canvas 共用 URL，预加载与 CSS 请求复用；没有新增动画、昼夜图集或常驻画布 |
| 不适用项 | 不新增结构变体、地形、水界、阴影或动作资产；碰撞、通行、遮挡算法及连续帧内容未修改，无需重做这些系统的行为测试 |

正式绘制器入口：`src/rendering/renderer.js`、`signposts.js`、`enemies.js`、`bosses.js`、`guardian.js`、`fire-world.js`、`fire-rescue.js`、`story-props.js`、`aim-guide.js`、`expedition.js` 以及 `src/ui/panels/map.js`；统一调用 `canvasFont`。`src/rendering/visual-review.js#inspectGameFont` 读取实际 DOM、字体加载状态与正式画布。

复现：隔离端口 4199 启动 `server.mjs`，Playwright CLI 打开该页面，执行 `tests/font-browser.cjs` 、`tests/font-combat-browser.cjs` 和 `tests/font-arrival-browser.cjs`。前者会重置该隔离端口的测试进度；不使用正式玩家存档。

工作截图共 88 张，连同首轮、修订复查和同屏检查记录保存于主工作区 `output/font-hyqihei/`。以下精选截图作为长期基准入库：

- [中文手机首页](../art-reference/hyqihei-font/zh-CN-320-title.png)
- [英文手机首页](../art-reference/hyqihei-font/en-US-320-title.png)
- [中文手机工坊](../art-reference/hyqihei-font/zh-CN-320-workshop.png)
- [英文地图换行修订](../art-reference/hyqihei-font/en-US-320-map.png)
- [手机白天同屏](../art-reference/hyqihei-font/tank-320-day.png)、[手机夜晚同屏](../art-reference/hyqihei-font/tank-320-night.png)
- [桌面白天同屏](../art-reference/hyqihei-font/tank-1280-day.png)、[桌面夜晚同屏](../art-reference/hyqihei-font/tank-1280-night.png)

- [新增入职英文对白](../art-reference/hyqihei-font/arrival-en-US-320-night.png)
- [新增中文载具工坊](../art-reference/hyqihei-font/vehicle-zh-CN-320.png)
