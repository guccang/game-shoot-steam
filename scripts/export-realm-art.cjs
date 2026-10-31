// 将已生成的原图编码为手机卡片使用的 WebP，保持完整构图，不裁切或重绘内容。
async (page) => {
  const results = [];
  for (const mode of ['rogue', 'tower', 'guardian']) {
    const download = page.waitForEvent('download');
    await page.evaluate(async (mode) => {
      const response = await fetch(`/assets/realms/${mode}.png`);
      if (!response.ok) throw Error('插画原图无法读取');
      const source = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = 768; canvas.height = 512;
      canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/webp', .88);
      link.download = `${mode}.webp`; link.click(); source.close();
    }, mode);
    const file = await download;
    await file.saveAs(`assets/realms/${mode}.webp`);
    results.push(mode);
  }
  return results;
}
