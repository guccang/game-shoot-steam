// 驿站外观目录与价格独立于地点；一次解锁可供所有驿站使用。
export const WAYSTATION_STYLES=Object.freeze([
 {id:'wood',name:'林间木牌',price:0,frame:'#c6a370',roof:'#88a477'},
 {id:'stone',name:'青石拱牌',price:800,frame:'#a3af9c',roof:'#879d88'},
 {id:'metal',name:'铆钉铁牌',price:1200,frame:'#839c92',roof:'#5e8276'},
 {id:'spring',name:'新春灯笼',price:1600,frame:'#bb7757',roof:'#bc6652'},
 {id:'christmas',name:'圣诞松雪',price:1600,frame:'#a78c63',roof:'#527b5e'},
].map(s=>Object.freeze(s)));
// 旧存档、非法样式统一恢复免费原木款，不改变原来的站点信息。
export function waystationStyle(id){return WAYSTATION_STYLES.find(s=>s.id===id)||WAYSTATION_STYLES[0];}
