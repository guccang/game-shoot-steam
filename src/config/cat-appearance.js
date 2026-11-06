// 各品种轮廓合同：只控制局部头部与毛发，不改变脚底、动作时钟或枪械锚点。
export const CAT_APPEARANCES = {
  chestnut: { face: 'oval', width: 39, cheek: 27, ear: 'point', earHeight: 25, earSpread: 27,
    fur: '#f0c887', shade: '#dfb778', earFur: '#f0c887', inner: '#dca184', eyes: '#65523e', mouth: '#65523e', markings: 'orange', features: 1 },
  mint: { face: 'round', width: 47, cheek: 31, ear: 'round', earHeight: 17, earSpread: 30,
    fur: '#e0e8df', shade: '#b8c9c3', earFur: '#bacbc5', inner: '#d7b6ae', eyes: '#708c76', mouth: '#55645b', markings: 'silver', features: 0.94 },
  silver: { face: 'square', width: 43, cheek: 28, ear: 'point', earHeight: 23, earSpread: 31,
    fur: '#c5d0d0', shade: '#a5b6b8', earFur: '#aababc', inner: '#d1aaa3', eyes: '#617773', mouth: '#4b625f', markings: 'tabby', features: 1.06 },
  mocha: { face: 'wedge', width: 37, cheek: 29, ear: 'wide', earHeight: 38, earSpread: 33,
    fur: '#eaddc4', shade: '#d1bfa8', earFur: '#958071', inner: '#c4a290', eyes: '#a3d2dd', mouth: '#594d43', markings: 'point', features: 0.88 },
  snow: { face: 'fluffy', width: 45, cheek: 29, ear: 'tuft', earHeight: 28, earSpread: 31,
    fur: '#f3efe1', shade: '#d6d3c8', earFur: '#afa29a', inner: '#d6bab4', eyes: '#7aadb8', mouth: '#66594e', markings: 'bicolor', features: 1, ruff: true },
  ink: { face: 'round', width: 37, cheek: 27, ear: 'round', earHeight: 23, earSpread: 27,
    fur: '#56656c', shade: '#42535c', earFur: '#64757b', inner: '#ac9692', eyes: '#e9c579', mouth: '#b4c3c1', markings: 'gloss', features: 0.97 },
  police: { face:'oval',width:40,cheek:27,ear:'point',earHeight:27,earSpread:32,fur:'#cbd5d2',shade:'#acbcba',earFur:'#a6b8b8',inner:'#d1b1a5',eyes:'#617773',mouth:'#4b625f',markings:'tabby',features:1 },
};
