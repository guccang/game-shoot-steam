// 首读和背包重读共用信纸内容；插画只随实际阅读加载。
import {RANGER_LETTER,arrivalGiftName} from '../config/ranger-arrival.js';

// 先展示四项入门说明，再附营地图，手机上读信时先看见操作。
export function appendRangerLetter(container,progress){
 const root=container.ownerDocument;
 for(const [index,text] of [...RANGER_LETTER.paragraphs,RANGER_LETTER.signature].entries()){
  const p=root.createElement('p');p.textContent=text.replaceAll('木制自行车',arrivalGiftName(progress));
  if(text===RANGER_LETTER.signature)p.className='keepsake-signature';
  container.append(p);
  if(index!==RANGER_LETTER.paragraphs.length-1)continue;
  const figure=root.createElement('figure'),picture=root.createElement('img'),caption=root.createElement('figcaption');
  figure.className='ranger-letter-map';picture.width=720;picture.height=1080;picture.loading='lazy';
  picture.alt='晴叶营地导览：巡林猫提壶种地，在武器工坊前练枪，骑车巡林，拿矿镐下矿。小屋可以逐层加高，也可以从高处乘三角翼滑翔，或到湖边抛竿钓鱼。';
  caption.textContent='晴叶营地图 · 松伯留';
  picture.addEventListener('error',()=>{caption.textContent='营地图加载失败，请重新打开来信。';});
  picture.src='assets/ui/ranger-letter-camp.webp';figure.append(picture,caption);container.append(figure);
 }
}
