# 英文语言包

`src/i18n/locales/en-US.json` 包含与中文表一一对应的 2,582 条完整译文，已在 `src/i18n/settings.json` 注册。默认中文不变。使用 `/?lang=en-US` 和 `/balance.html?lang=en-US` 预览英文；刷新为 `?lang=zh-CN` 返回中文。切换只改变显示文字，装备、角色、剧情和存档仍使用原稳定 ID。

## 翻译维护

| 中文 | 英文 |
| --- | --- |
| 森林巡游／喵喵小队 | Forest Patrol / Mew Squad |
| 栗子／薄荷／雪团／墨墨／摩卡／银豆 | Chestnut / Mint / Snowball / Inky / Mocha / Silverbean |
| 晴叶营地／雾松密林 | Sunleaf Camp / Mistpine Woods |
| 琥珀古林／幽苔禁林 | Amberwood Forest / Mossveil Forest |
| 松果手枪／萤火激光步枪 | Pinecone Pistol / Firefly Laser Rifle |
| 星环浮游炮／蜂群无人机 | Star Ring Funnels / Swarm Drones |
| 机械核心／机械蜘蛛 | Mechanical Core / Mechanical Spider |
| 肉鸽远征／守护女神／时空之塔 | Rogue Expedition / Goddess Defense / Spacetime Tower |
| 森林消防／滚滚史莱姆 | Forest Fire Rescue / Slime Soccer |
| 机械零件／能量晶石／首领核心 | Mechanical Parts / Energy Crystals / Boss Cores |

完整句子保留原占位符，按英文语序调整位置，例如 `Endless Challenge · {p1} {p0}`。剧情人物的命名占位符交给原剧情系统处理。短按钮在不改变含义的前提下使用紧凑措辞，例如天气按钮用 `Storm`，说明中仍可使用 `Thunderstorm`。

资源缩写沿用现有代码的 1,000／10,000／100,000,000 分档，分别显示 `K`、`×10K`、`×100M`，不能直接将“万”换成 `K` 或将“亿”换成 `M`，否则会误报数量。完整资源数仍由原提示与读屏名称提供。

车辆说明移除了中英文中已过时的“气垫船无主炮”：当前 `src/config/vehicle-armaments.js` 已为气垫船配置双联水炮。没有改变装备行为。

## 验证方式

```sh
npm run check:i18n
node --test tests/i18n.test.mjs tests/i18n-audit.test.mjs tests/i18n-story.test.mjs tests/i18n-english.test.mjs
```

英文专项检查完整键集、占位符、无中文残留、真实英文模块初始化、稳定 ID 和资源数量单位。浏览器测试使用真实注册的英文包，不拦截语言 JSON，也不使用伪译文。

在隔离端口 4198 启动 `server.mjs` 后，使用 Playwright CLI 打开 `http://localhost:4198/?lang=en-US`，依次执行：

```sh
playwright-cli run-code --filename tests/i18n-english-browser.cjs
playwright-cli run-code --filename tests/i18n-english-modes-browser.cjs
```

第一份脚本重置此隔离端口的测试存档，检查首页、设置、帮助、环境、记录、工坊、浮游炮、机械核心、机械蜘蛛、角色、载具、地图、剧情目录、秘境帮助和消防面板，并验证中英文往返切换不改变存档。另实际运行英文模拟 Worker、实战基准及方案对比。第二份脚本通过实际按钮进入剧情、远征、时空之塔、守护女神、足球及消防，检查动态文案。两份脚本均捕获页面异常；游戏界面覆盖 1280×900 和 390×844，战场包含昼夜截图。

加特林品质预览页和内嵌正式游戏也检查 `en-US` 继承。初次验收的 18 条预览文案已包含在当时的 2,544 条译文中；后续新增 2 条改装阶段文案与 1 条字体加载错误，入职剧情及双工坊合入后，当前两份语言表各 2,582 条。

实测发现：模拟与战斗基准 Worker 静态导入含顶层异步语言加载的模块时，非默认语言可能丢失首条请求。两个 Worker 改为先同步登记消息入口，在处理函数内等待模块加载；沿用原模拟、基准和错误回传逻辑。修复前同样请求中文返回、英文超时，修复后两种语言均返回。

截图生成于 `output/playwright/en-*.png`，交付时另保存在主工作区 `output/english-language-pack/`。本任务未修改美术资源或玩法规则。

## 2026-10-23 验收结果

- 国际化扫描通过：2,544 条文案、2 个语言包；12 项国际化专项测试全部通过，未运行全量测试。
- 两份浏览器脚本分别完成 48 和 32 个检查点，页面异常为零；中英文往返切换前后存档内容一致。
- 英文工作台完成 100 组固定种子的 1 分钟模拟、30 秒升级前后战斗基准、结果对比；测试的是文案和 Worker 加载，不据此评价长期经济平衡。
- 已人工复核桌面／手机首页、昼夜战场、长说明、工坊、地图、剧情气泡、模块列表及玩法面板截图。天气按钮改用 `Storm` 后没有越界。
- 手机浮游炮槽位的 `Native Energy Cannon` 和个别剧情目录长标题沿用既有省略样式；当前模块详情、章节详情和读屏名称保留完整文本。其余采样文字没有横向溢出，弹窗仍可正常滚动和操作。
- 79 张验收截图和两份检查结果 JSON 保存在主工作区 `output/english-language-pack/`。
