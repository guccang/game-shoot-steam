// 家园小游戏只保存已结算纪录，进行中的鸟群与抓钩不进入主存档。
export function freshHomeArcade(){return {version:1,birds:{best:0,plays:0,wins:0,coins:0},gold:{best:0,plays:0,wins:0,coins:0}};}
// 过滤异常数字并兼容没有小游戏字段的旧档，胜场不能超过已玩次数。
export function normalizeHomeArcade(raw){const result=freshHomeArcade();for(const kind of ['birds','gold']){const r=raw?.[kind],s=result[kind];for(const key of ['best','plays','wins','coins'])s[key]=Number.isSafeInteger(r?.[key])?Math.max(0,r[key]):0;s.wins=Math.min(s.wins,s.plays);}return result;}
