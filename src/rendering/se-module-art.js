// 车尾模块使用同一组轮廓与漆色生成场景部件和界面图标，坐标原点为挂点。
const edge='#354840',body='#899b8e',rim='#d8d4b7',lens='lamp';
const base=[
 ['M-7 -4 L-5 -6 H5 L7 -4 V4 L5 6 H-5 L-7 4 Z',body],
 ['M-6 2 H6 V4 L4 5 H-4 L-6 4 Z','#566b61'],
 ['M-3 3 H3',null,lens]
];
const modules={
 flare:['#ffd782',[
  ['M-5 -6 Q0 -10 5 -6 V0 Q0 3 -5 0 Z','#aa966b'],
  ['M-5 -6 C-5 -10 5 -10 5 -6 C5 -2 -5 -2 -5 -6 Z',lens],
  ['M-2 -6 Q0 -8 2 -6 Q0 -4 -2 -6 Z',edge]]],
 rocket:['#ffad73',[
  ['M-6 -7 L-4 -9 H-2 L0 -7 V1 H-6 Z','#b18068'],
  ['M0 -7 L2 -9 H4 L6 -7 V1 H0 Z','#b18068'],
  ['M-5 -6 Q-3 -9 -1 -6 Q-3 -3 -5 -6 Z M1 -6 Q3 -9 5 -6 Q3 -3 1 -6 Z',lens]]],
 smoke:['#e4ecd2',[
  ['M-6 -7 H-1 V1 H-6 Z M1 -7 H6 V1 H1 Z','#758675'],
  ['M-6 -8 H-1 M1 -8 H6',null,lens]]],
 mine:['#f4c272',[
  ['M-6 -5 L-3 -8 H3 L6 -5 V0 H-6 Z','#66745a'],
  ['M-3 -4 H3',null,lens]]],
 protection:['#ffe19a',[
  ['M-6 -6 L0 -10 L6 -6 L0 -2 Z','#719786'],
  ['M-4 -6 L0 -8 L4 -6 L0 -4 Z',lens],
  ['M0 -2 V1',null,rim]]],
 shield:['#82dccc',[
  ['M0 -11 L5 -6 L4 0 L0 3 L-4 0 L-5 -6 Z',lens],
  ['M0 -9 V1 L-4 -5 Z','#cae5d6']]],
 autopilot:['#b4d996',[
  ['M-2 -8 H2 V0 H-2 Z','#586c60'],
  ['M-7 -8 C-7 -12 7 -12 7 -8 C7 -4 -7 -4 -7 -8 Z',lens]]],
 combat:['#f1ad83',[
  ['M-6 -7 L-4 -9 H4 L6 -7 V-2 H-6 Z','#536558'],
  ['M-4 -5 C-4 -9 4 -9 4 -5 C4 -2 -4 -2 -4 -5 Z',lens],
  ['M-2 -6 L0 -7',null,rim]]]
};
// 灯带与镜片共享供电状态；箱体涂装不随开关改变。
function layers(key,enabled){
 const [light,parts]=modules[key];
 const color=v=>v===lens?(enabled?light:'#89948a'):v;
 return [...base,...parts].map(([d,fill,stroke=edge])=>({d,fill:color(fill),stroke:color(stroke)}));
}
const paths=new Map();
// 缓存各弹舱、传感器的矢量路径，避免每帧解析。
export function drawSEModule(c,key,enabled){
 const id=key+enabled;
 if(!paths.has(id))paths.set(id,layers(key,enabled).map(layer=>({...layer,path:new Path2D(layer.d)})));
 c.lineWidth=1.3;c.lineJoin='round';c.lineCap='round';
 for(const {fill,stroke,path} of paths.get(id)){
  if(fill){c.fillStyle=fill;c.fill(path);}
  c.strokeStyle=stroke;c.stroke(path);
 }
}
// 页面直接复用世界部件的每一层，放大后依然清晰。
export function seModuleSVG(key){
 const shapes=layers(key,true).map(({d,fill,stroke})=>'<path d="'+d+'" fill="'+(fill||'none')+'" stroke="'+stroke+'"/>').join('');
 return '<svg viewBox="-11 -13 22 22" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+shapes+'</svg>';
}
