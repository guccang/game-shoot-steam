import { i18nText } from "../i18n/index.js";
// 森林领主目录：新领主先登场，累计胜场决定轮换，旧存档无需新增字段。
export const BOSSES = [
  {
    id: 'boar',
    name: i18nText("config.bosses.17654194c6"),
    title: i18nText("config.bosses.9ea5fd8ab5"),
    hint: i18nText("config.bosses.c6b737c66e"),
    color: '#b17e53',
    windup: 1,
    active: 1.1,
    // 延长冲锋路线和持续时间，保持原有一秒前摇与冲锋后的反击窗口。
    charge: { min: 340, max: 620, overshoot: 240 },
    recovery: 1.5,
    interval: 2.2,
    speed: 42,
    stop: 190,
  },
  {
    id: 'mushroom',
    name: i18nText("config.bosses.45575ebea1"),
    title: i18nText("config.bosses.91c35e5b95"),
    hint: i18nText("config.bosses.b2e4c0c08a"),
    color: '#ad729d',
    windup: 1.35,
    active: 2.3,
    recovery: 1.2,
    interval: 3.2,
    speed: 30,
    stop: 220,
  },
  {
    id: 'owl',
    name: i18nText("config.bosses.c8baf0b06b"),
    title: i18nText("config.bosses.7d40dc24bb"),
    hint: i18nText("config.bosses.8ccb7d663b"),
    color: '#7387ab',
    windup: 1.2,
    active: 1.4,
    recovery: 1.25,
    interval: 2.4,
    speed: 38,
    stop: 230,
  },
  {
    id: 'turtle',
    name: i18nText("config.bosses.1b5d56bf24"),
    title: i18nText("config.bosses.656dbda8a6"),
    hint: i18nText("config.bosses.a201d57571"),
    color: '#5f9e9d',
    windup: 1.35,
    active: 1.25,
    recovery: 1.6,
    interval: 2.4,
    speed: 26,
    stop: 150,
  },
  {
    id: 'moss',
    name: i18nText("config.bosses.ae31a8be37"),
    title: i18nText("config.bosses.d96f2adbcf"),
    hint: i18nText("config.bosses.c2d15224b8"),
    color: '#829366',
    windup: 1.15,
    active: 0.25,
    recovery: 1,
    interval: 1,
    speed: 32,
    stop: 110,
  },
  // 团子营地的新领主：短距离弹跳重砸，落点锁定后给予完整躲避时间。
  {id:'dumpling',name:'芽冠团子王',title:'团团重砸',hint:'离开叶纹落点，趁落地恢复时攻击',family:'dumpling',
    color:'#90a875',windup:1.15,active:1,recovery:1.2,interval:2.8,speed:34,stop:165,
    leap:{duration:.65,height:62,range:260,radius:68}},
];
// 终场团山沿用团子软体与跃砸状态机，专属体量和招式仅供守门会话读取。
export const HORDE_GIANT = {
  ...BOSSES.find(b => b.id === 'dumpling'),
  name: '藏金团山', title: '沉山重砸', scale: 3, radius: 38 * 3,
  windup: 1.55, active: 1.2, recovery: 1.6, interval: 3.1,
  leap: { duration: .76, height: 76, range: 260, radius: 136 },
};
// 按永久胜场轮换，刷新与重新巡游不会总是遇到同一种领主。
export function nextBoss(progress) {
  const count=Math.max(0,Math.floor(progress.bosses||0)),saved=progress.bossChallenge;
  // 已开战快照使用明确物种编号，未记录有效身份时按当前轮次选择。
  if(saved&&saved.bosses===count){
    const profile=BOSSES.find(b=>b.id===saved.kind);
    if(profile)return profile;
  }
  return BOSSES[(count+BOSSES.length-1)%BOSSES.length];
}
// 未携带新身份的旧测试实体继续使用原苔藓巨兽规则。
export function bossProfile(boss) {
  if (boss?.campDefense && boss.kind === 'dumpling') return HORDE_GIANT;
  return BOSSES.find((b) => b.id === boss?.kind) || BOSSES.find(b=>b.id==='moss');
}
