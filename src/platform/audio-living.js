// 生活声音按距离与动作稀疏触发，暂停时没有队列或后台播放。
import {livingForest} from '../world/living-spaces.js';
import {worldDistance} from '../world/coordinates.js';
// 音景选择只读正式人物活动，远处和战斗中不叠加厨房声。
export function createLivingSoundscape(audio){
  let elapsed=0;
  return {update(game,dt,visible=true){
    if(!visible||game.state!=='playing'||!livingForest(game)||game.boss){elapsed=0;return;}
    elapsed+=dt;if(elapsed<3.6)return;elapsed=0;
    const nearby=[...(game.livingActors?.values()||[])].filter(r=>r.hero!==game.progress.hero&&worldDistance(r,game.player)<180);
    const walker=nearby.find(r=>r.moving&&!['bat','owl'].includes(r.id)&&worldDistance(r,game.player)<110);
    const worker=nearby.find(r=>!r.moving&&['wash','cook','pottery','repair','sort'].includes(r.action));
    // 脚步只跟随近处实际行走，鸟类飞行和停止时不发出脚踩声。
    if(walker){audio.play('living-step','living');elapsed=2.7;}
    else if(worker)audio.play(worker.action==='repair'?'living-tool':worker.action==='sort'?'living-paper':'living-bowl','living');
    else if(game.livingPhase==='night')audio.play('living-cricket','living');
  }};
}
