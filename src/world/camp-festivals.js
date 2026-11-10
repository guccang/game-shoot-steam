// 节庆是历法的只读投影；自动切换不写存档、不收费、不覆盖手动摆件。
import {CAMP_FESTIVALS,campFestival} from '../config/camp-festivals.js';
import {calendarView,livingSeasonDays} from './living-calendar.js';
import {LIVING_DAY_MS} from '../config/living-world.js';
// 一季一天的现有节奏下每五分钟可体验下一节日，暂停与离线不推进。
export function festivalCalendar(calendar){const view=calendarView(calendar),round=(view.year-1)%3,today=CAMP_FESTIVALS.find(f=>f.season===view.seasonIndex&&f.round===round),seasonMs=livingSeasonDays()*LIVING_DAY_MS,elapsed=(calendar.day%livingSeasonDays())*LIVING_DAY_MS+calendar.elapsed,index=round*4+view.seasonIndex;return {view,today,remaining:seasonMs-elapsed,upcoming:Array.from({length:12},(_,i)=>{const order=(index+i)%12;return {...CAMP_FESTIVALS.find(f=>f.round===Math.floor(order/4)&&f.season===order%4),dateLabel:`第${view.year+Math.floor((view.seasonIndex+i)/4)}年 · ${['春','夏','秋','冬'][order%4]}季`,startsIn:i===0?0:seasonMs-elapsed+(i-1)*seasonMs};})};}
// 手动普通模式保持日常外观；未购买当季套装时自动模式也显示日常营地。
export function activeCampFestival(progress){const state=progress?.campManagement,mode=state?.festivalMode||'auto',id=mode==='auto'?festivalCalendar(progress.living.calendar).today.id:mode;return state?.festivals?.includes(id)?campFestival(id):null;}

// 公共广场的节日标志物始终跟随游戏日历，不受皮肤所有权或手动换装影响。
export function publicCampFestival(progress){return festivalCalendar(progress.living.calendar).today;}
