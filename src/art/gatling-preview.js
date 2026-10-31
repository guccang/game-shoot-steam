// 样板外壳仅负责设备宽度与按钮，静态部件直接使用正式武器入口。
import { localizeDocument } from '../i18n/document.js';
import { loadGameFont } from '../platform/fonts.js';
import { drawWeapon } from '../rendering/characters.js';
localizeDocument(document);
await loadGameFont();
for(const id of ['base','middle','upgraded']){
  const c=document.getElementById(id).getContext('2d');
  const levels=id==='base'?null:id==='middle'?{damage:10,rate:3,capacity:3,reload:3,range:3,accuracy:3}:{damage:20,rate:5,capacity:5,reload:5,range:5,accuracy:5};
  drawWeapon(c,2,300,115,4.8,0,0,0,0,levels,.3);
  // 同一画布补充正常游戏倍率，避免只看放大细节误判品质。
  drawWeapon(c,2,300,292,1,0,0,0,0,levels,.3);
}
const frame=document.getElementById('scene'),report=document.getElementById('report');
const response=await fetch('/index.html');if(!response.ok)throw Error(`HTTP ${response.status}`);
const html=await response.text();
frame.srcdoc=html.replace('<head>','<head><base href="'+location.origin+'/"><meta name="referrer" content="same-origin">')
  .replace('<html lang="zh-CN">','<html lang="zh-CN" data-locale="'+document.documentElement.lang+'">')
  .replace('src="/src/main.js"','src="/src/art/gatling-scene.js"');
document.getElementById('size').addEventListener('change',event=>{frame.style.width=event.target.value+'px';frame.style.height=event.target.value==='1280'?'844px':'';});
document.getElementById('stage').addEventListener('change',event=>frame.contentWindow.postMessage({gatlingCommand:'stage',stage:event.target.value},location.origin));
for(const button of document.querySelectorAll('[data-command]'))button.addEventListener('click',()=>{
  frame.contentWindow.postMessage({gatlingCommand:button.dataset.command},location.origin);
});
window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==location.origin)return;
  if(event.data.gatlingReport)report.textContent=JSON.stringify(event.data.gatlingReport,null,2);
  if(event.data.gatlingRecording){
    let video=document.getElementById('recording');
    if(!video){video=document.createElement('video');video.id='recording';video.controls=true;video.style.maxWidth='100%';report.after(video);}
    video.src=event.data.gatlingRecording;
  }
});
