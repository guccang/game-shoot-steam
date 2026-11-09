// 鱼桶与渔网共用64像素透明视框，静态轮廓独立于容量数字和点击状态。
export function fishStorageIcon(id){
 const art=id==='bucket'?'<path d="M15 25V18a17 12 0 0 1 34 0v7"/><path d="m13 25 5 30q14 9 28 0l5-30" fill="#b2c29a"/><path d="m38 29-2 29q6-1 10-3l5-30Z" fill="#91aa83" stroke="none"/><ellipse cx="32" cy="25" rx="19" ry="7" fill="#e9dbab"/><ellipse cx="32" cy="26" rx="13" ry="4" fill="#85b8b1"/><path d="M21 39q8-7 16 0-8 7-16 0m16 0 5-4v8Z" fill="#fff1ca"/>':id==='net'?'<path d="M18 19 23 52q9 12 18 0l5-33" fill="#d1d7ac"/><path d="m20 26 21 26m-19-15 15 19m7-31L24 51m19-14L29 56M21 36h22M23 47h19" stroke="#79967a" stroke-width="1.4"/><ellipse cx="32" cy="19" rx="15" ry="6" fill="#e9dbab"/><ellipse cx="32" cy="19" rx="10" ry="3" fill="#91b4a0"/><path d="M18 19q-1-15 14-13 15-2 14 13M25 53q7 5 14 0"/><path d="M26 41q6-6 12 0-6 6-12 0m12 0 4-4v8Z" fill="#fff1ca"/>':null;
 if(!art)throw Error('鱼获容器图标缺失：'+id);
 return `<svg viewBox="0 0 64 64" fill="none" stroke="#315c43" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-fish-container-icon="${id}">${art}</svg>`;
}
