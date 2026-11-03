// 四类鱼的力道、方向与预告共用同一时钟，界面提示和水面运动不各自抽签。
export const FISH_STRUGGLES={
 gentle:{name:'缓游型',tip:'拉力平缓，保持中等张力，顺势收线。'},
 sprint:{name:'冲刺型',tip:'蓄力后突然冲刺；看到蓄力提示先松线，冲刺结束再收线。'},
 heavy:{name:'下潜型',tip:'深潜时拉力持续增大，缓慢收线；上浮后抓紧回收。'},
 weave:{name:'折返型',tip:'左右频繁折返，按箭头反向控竿能更快收线。'}
};
// 同族保留易辨习性，不以临时随机行为替代鱼种差异。
export function fishStruggleKind(fish){return ({scale:'gentle',leaf:'gentle',stream:'sprint',sail:'sprint',whisker:'heavy',armor:'heavy',cave:'heavy',pearl:'weave',ribbon:'weave',lantern:'weave'})[fish.family]||'gentle';}
// 先给出至少半秒的冲刺预告，正弦折返连续经过中点，浮漂不会突然跳到另一侧。
export function fishStruggle(fish,time){
 const kind=fishStruggleKind(fish),phase=time%6,side=Math.sin(time*(kind==='weave'?2.2:.7)),direction=side>=0?1:-1;
 let pull=.28+.14*Math.sin(time*1.1),speed=1,warning='',motion=side*12;
 if(kind==='sprint'){pull=phase<1.3?.18:phase<2?.3:phase<3.2?1:.25;warning=phase>=1.3&&phase<2?'鱼儿正在蓄力，准备松线！':phase>=2&&phase<3.2?'急冲！先放线稳住。':'';motion=side*(14+(phase>=2&&phase<3.2?Math.sin((phase-2)/1.2*Math.PI)**2*11:0));}
 if(kind==='heavy'){pull=.55+.35*Math.sin(time*.65);speed=pull>.7?.55:1.15;warning=pull>.7?'正在深潜，缓收并留出张力。':'鱼儿上浮，趁机收线。';motion=side*8;}
 if(kind==='weave'){pull=.42+.2*Math.abs(side);speed=.82;warning=Math.abs(side)<.35?'即将折返，留意左右方向。':'';motion=side*23;}
 return {kind,name:FISH_STRUGGLES[kind].name,pull,direction,speed,warning,motion,depth:kind==='heavy'?(pull-.2)*12:Math.cos(time*1.2)*5};
}
