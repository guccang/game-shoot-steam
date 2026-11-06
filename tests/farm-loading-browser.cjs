// 图集缺失必须明确失败；恢复资源后允许重试，不能靠替代植物通过。
async page=>{
 const results=[];
 for(const pattern of ['**/assets/farm/*.png','**/assets/farm/crops-expansion.svg']){
  await page.route(pattern,route=>route.abort());
  const failed=await page.evaluate(async pattern=>{try{await(await import('/src/rendering/farm.js?failure-review='+encodeURIComponent(pattern))).loadFarmArt();return null;}catch(e){return e.message;}},pattern);
  if(!failed?.includes('图集加载失败'))throw Error('缺失作物资源没有明确失败');
  await page.unroute(pattern);
  const recovered=await page.evaluate(async pattern=>{const art=await import('/src/rendering/farm.js?failure-review='+encodeURIComponent(pattern));await art.loadFarmArt();return art.farmArtBudget();},pattern);
  if(recovered.sheets!==recovered.maxSheets)throw Error('图集恢复重试失败');results.push({failed,recovered});
 }
 return results;
}
