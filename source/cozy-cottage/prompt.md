# 温馨小屋生成记录

模式：内置 imagegen，透明背景；2026-10-27。第一轮带参考图请求长时间未完成，停止等待后重试简洁提示词，本次返回图用于正式资源。没有使用 CLI/API 回退。

输入参考：本目录 reference.png 为用户场景，仅作风格与现有比例比对。最终成功请求为纯文字生成。

## 成功提示词

Generate ONE standalone transparent PNG sprite of a cozy small forest ranger cottage for a 2D mobile game. Warm hand-painted storybook flat-color illustration, muted forest-green outlines, cream plaster, honey-colored timber, soft sage-green shingle roof with gently curved thick eaves, small stone chimney, rounded front wooden door with doorstep centered at bottom, a broad warm window with cream curtains to left of door and little window on visible right side, small porch lantern, asymmetric flowerbox and climbing vine. Three-quarter overhead viewpoint showing front and right side. Charming lived-in softness rather than rigid geometric diagram. Only a few large shingles, limited 2-3 shade flat fills, no noisy texture or glossy 3D. Building alone, transparent background, no grass tile, no cast shadow, no characters, no words, no UI. Entire building inside image with small transparent margin, bottom doorstep around horizontal center. Readable at 140px high.

## 处理

保留 generated.png 原始输出；仅用 Pillow 等比缩小到512像素长边并优化PNG，保留真实alpha，不重画或去背景。运行文件与大小、指纹见 assets/cozy-cottage/manifest.json。
