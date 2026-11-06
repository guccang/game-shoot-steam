
## 购物车交互修订
目标为固定投放区的购物车图标、数量及多件商品清单。复用手机底板，图标为内联 SVG，24×24 视框，固定在底栏文字左侧，触控高度至少 44px。沿用货架的纵滑、横拖及各商品正式购买入口。

实施与验收（designCriterion 为 shop-cart）

- 范围为商店购买按钮、底部投放区及清单。购物车沿用底板颜色、森林绿描边和原布局，图标与数量独立，复用已有 SVG 和 DOM 绘制能力，无新增位图、动画时钟或解码缓存。静态图标无需 PNG 精修。
- 正式入口为 src/ui/shop-checkout.js、src/styles/shop-checkout.css，验收采样为 src/rendering/visual-review.js#inspectShopCart。世界碰撞、昼夜光照及角色动作与本次商店底板无关。
- 390×844 手机模拟中点按鱼竿、拖入帐篷，清单显示两种商品、各自交付地和 260 金币合计；打开及取消不扣费。320×568 下复核付款按钮触控高度与屏内范围。写入失败后可重试，成功后库存和扣款一致。
- 工坊内上下滑动车型目录、横向拖入独轮车、点选自行车并加入清单，核对木材合计 40，确认后两辆车均交付。种子数量切换、载具仓库、背包、小屋仓库和家具购买使用正式入口通过。
- 实景记录为 output/playwright/shop-cart/multiple.png 及同目录 short.png，自动脚本为 tests/shop-checkout-browser.cjs。手机触控模拟验收通过。

## 商品清单配图修订
目标为每行商品增加与货架一致的静态缩略图。以松果手枪的工坊绘制器和种子、弹药等库存图标为参考，家具与猫猫沿用货架画像。图标位于名称左侧、按中心适配；保留数量、价格、交付地点、移除与付款。小屏保留 44px 触控区。纯 UI 图不涉及世界碰撞、动作和遮挡。

验收通过。正式入口为 src/ui/shop-checkout.js 的 renderCart 和 src/ui/cart-product-icon.js 的 cartProductIcon，designCriterion 为 shop-cart。武器调用工坊型号绘制器，家具与猫像复制对应货架画布，种子和补给调用库存图标。每件商品保留一枚静态缩略图，独立画布最多 96×96，无新增图片下载。原版种子 SVG 引用共享作物图集。

在 390×844、320×568 与 900×720 浏览器视口检查松果手枪图标非空、文字换行和付款；已实际购得手枪。截图见 output/playwright/shop-cart/pistol-390-day.png、pistol-320-night.png、pistol-900-day.png（同目录）。运行 tests/shop-checkout-browser.cjs，通过种子数量、移除、拖入、多行图标、保存失败重试、家具交付与短屏底栏检查，见同目录 multiple.png 和 short.png。图标不接管输入。
