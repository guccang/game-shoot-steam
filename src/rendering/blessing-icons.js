// 祝福插画沿用资源图标的圆润轮廓、深绿描边和柔和双色阴影；静态 SVG 不增加战场绘制负担。
const ART = {
  power: {
    tint: '#f3e5c7',
    body: `<path d="M16 54Q17 39 27 31L36 46 30 61Z" fill="#e6a269"/>
      <path d="M22 54 28 43 33 49 29 57Z" fill="#ffe5a2" stroke="none"/>
      <g transform="rotate(35 42 37)"><path d="M32 27Q32 16 42 10Q52 16 52 27Z" fill="#d39562"/>
      <path d="M32 27H52V54H32Z" fill="#ebc46f"/><path d="M46 29H51V53H46Z" fill="#c99e58" stroke="none"/>
      <rect x="30" y="52" width="24" height="7" rx="3" fill="#f4d88c"/><path d="M37 30V44" stroke="#fff0be" stroke-width="3"/></g>
      <path d="m61 39 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#f8d87c"/><path d="m18 19 1 4 4 1-4 2-1 4-2-4-4-2 4-1Z" fill="#e8bb69" stroke="none"/>`,
  },
  haste: {
    tint: '#deeadc',
    body: `<path d="M32 18 54 23 48 62 26 57Z" fill="#78aaa0"/><path d="m44 23 9 2-6 35-8-2Z" fill="#5c8b80" stroke="none"/>
      <path d="m29 16 28 6-2 8-28-6Z" fill="#dce4bd"/><path d="m33 34 12 3m-14 6 12 3m-14 6 12 3" stroke="#cee9d2" stroke-width="3"/>
      <path d="M11 34H22M8 43H19M12 52H19" stroke="#70978c" stroke-width="3"/>
      <path d="m60 35-9 15h7l-3 13 14-19h-9l5-9Z" fill="#f1d583"/>`,
  },
  vitality: {
    tint: '#e6edcf',
    body: `<path d="M27 54Q22 43 31 41Q37 39 40 44Q44 38 51 42Q61 48 51 59L40 67Z" fill="#e4b37e"/>
      <path d="M40 49V30Q40 23 44 19" fill="none" stroke="#64845d" stroke-width="3"/>
      <path d="M39 37Q18 40 15 20Q35 18 39 37Z" fill="#96b879"/>
      <path d="M40 29Q42 10 63 13Q63 33 40 33Z" fill="#b1cb87"/>
      <path d="m24 27 14 10m6-9 10-8" fill="none" stroke="#64845d" stroke-width="2"/>
      <path d="M30 49Q30 46 33 46M44 47Q47 45 50 48" fill="none" stroke="#ffe3b2" stroke-width="3"/>
      <path d="m61 40 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#e7cf80" stroke="none"/>`,
  },
  armor: {
    tint: '#e4e4ef',
    body: `<path d="M16 24 40 14 64 24 60 47Q57 59 40 68Q23 59 20 47Z" fill="#929fba"/>
      <path d="m22 28 18-8 18 8-4 20Q50 57 40 61Q29 56 26 47Z" fill="#c6d8db"/>
      <path d="M40 21 57 28 54 48Q49 56 40 61Z" fill="#aebfcf" stroke="none"/>
      <path d="M43 30Q32 36 42 48Q27 47 29 36Q32 27 43 30Z" fill="#fff0be"/>
      <path d="m49 33 1 4 5 2-5 1-1 5-2-5-4-1 4-2Z" fill="#f9e6a6" stroke="none"/>
      <path d="m25 29 10-4" stroke="#eef5dc" stroke-width="3"/>`,
  },
  leech: {
    tint: '#e8e8d6',
    body: `<path d="M23 61Q13 48 19 38M57 61Q67 48 61 38" fill="none" stroke="#829768"/>
      <path d="M21 54Q9 53 12 45Q22 45 21 54ZM19 44Q10 39 16 33Q24 37 19 44ZM59 54Q71 53 68 45Q58 45 59 54ZM61 44Q70 39 64 33Q56 37 61 44Z" fill="#afbd83" stroke-width="1.7"/>
      <path d="M31 20H49V30Q59 38 58 51Q58 65 40 65Q22 65 22 51Q21 38 31 30Z" fill="#d8ece0"/>
      <path d="M26 44Q34 40 41 44Q49 48 54 43V52Q54 61 40 61Q26 61 26 52Z" fill="#85b8a5" stroke="none"/>
      <rect x="30" y="14" width="20" height="10" rx="3" fill="#d2ae76"/><path d="M31 28H49" stroke="#87a99a"/>
      <path d="M40 51Q28 44 33 39Q37 36 40 41Q44 36 48 40Q52 45 40 51Z" fill="#f4d894" stroke-width="1.7"/>
      <path d="M29 33 27 38" stroke="#fffdeb" stroke-width="3"/>`,
  },
  reach: {
    tint: '#dfe9e6',
    body: `<g transform="rotate(-25 39 43)"><path d="M17 35H56V53H17Z" fill="#8ea797"/>
      <path d="M20 45H54V52H20Z" fill="#698a78" stroke="none"/><rect x="13" y="33" width="10" height="22" rx="4" fill="#d7c185"/>
      <rect x="47" y="30" width="15" height="27" rx="5" fill="#dfcc96"/><ellipse cx="58" cy="43" rx="7" ry="12" fill="#75b8b3"/>
      <path d="M57 36Q53 39 55 44" fill="none" stroke="#dcf4e3" stroke-width="3"/><path d="M31 53V59H43V53" fill="#d3dcb5"/></g>
      <path d="m26 14 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#efd387"/>
      <path d="M58 12V18M66 20H72M64 14 68 10" stroke="#90aca0" stroke-width="2"/>`,
  },
  mend: {
    tint: '#e8e5d2',
    body: `<path d="m20 51 20-8 20 8v13H20Z" fill="#9ba98b"/><path d="M27 34H53V54H27Z" fill="#d8dfbd"/>
      <path d="M45 35H53V54H45Z" fill="#b3c19d" stroke="none"/><path d="m22 32 18-8 18 8v7H22Z" fill="#e9e7c6"/>
      <path d="M16 58H64V66H16Z" fill="#b9c7a1"/>
      <path d="M40 10 47 22 40 34 33 22Z" fill="#89c8b3"/><path d="M40 11V32L34 22Z" fill="#c2ebce" stroke="none"/>
      <path d="M36 43H44M40 39V47" stroke="#6b9275" stroke-width="3"/>
      <path d="M21 17V23M18 20H24M58 19V27M54 23H62" stroke="#c9ae65" stroke-width="2"/>`,
  },
  heal: {
    tint: '#eae1cf',
    body: `<path d="M29 28V22Q29 16 35 16H45Q51 16 51 22V28" fill="none" stroke-width="5"/>
      <rect x="16" y="27" width="48" height="37" rx="10" fill="#d8bb84"/>
      <path d="M17 46Q40 54 63 46V54Q63 64 54 64H26Q17 64 17 54Z" fill="#bb9b6b" stroke="none"/>
      <path d="M16 35Q16 27 24 27H56Q64 27 64 35V41Q40 50 16 41Z" fill="#eee1b5"/>
      <rect x="29" y="34" width="22" height="23" rx="6" fill="#f9f4db"/>
      <path d="M40 39V51M34 45H46" stroke="#79a18a" stroke-width="4"/>
      <path d="M22 32H27" stroke="#fff6d7" stroke-width="3"/>`,
  },
};

// 图案作为按钮名称旁的装饰图片，读屏沿用完整祝福名称和效果，避免重复朗读。
export function blessingIcon(key) {
  const art = ART[key];
  if (!art) return '';
  return `<svg class="blessing-art" data-blessing-art="${key}" viewBox="0 0 80 80" aria-hidden="true" focusable="false"><rect x="2" y="2" width="76" height="76" rx="20" fill="${art.tint}"/><ellipse cx="40" cy="67" rx="23" ry="4" fill="#46604a" opacity=".1"/><g stroke="#46604a" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${art.body}</g></svg>`;
}
