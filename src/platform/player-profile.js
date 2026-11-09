// 本机用户名对应固定存档空间。默认巡林员沿用旧键，已有存档和设置可直接继续。
export const DEFAULT_PLAYER = '巡林员';
const LAST_PLAYER = 'forest-patrol-last-player';

// 首尾空格及等价的 Unicode 写法视为同一人，控制字符不进入键名。
export function playerName(value) {
  if (typeof value !== 'string') return '';
  const name = value.trim().normalize('NFC');
  return name.length <= 24 && !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(name) ? name : '';
}

// 历史记录固定当前标签页身份，新开的游戏页才读取最近登录名。
function initialPlayer() {
  try {
    return playerName(globalThis.history?.state?.forestPlayer)
      || playerName(globalThis.localStorage?.getItem(LAST_PLAYER)) || DEFAULT_PLAYER;
  } catch { return DEFAULT_PLAYER; }
}
export const currentPlayer = initialPlayer();

// 登录后记住用户名；存储被限制时仍可沿用当前页身份。
export function rememberPlayer(name, enterAfterReload) {
  history.replaceState({...history.state, forestPlayer:name, forestEnter:enterAfterReload}, '');
  try { localStorage.setItem(LAST_PLAYER, name); } catch { /* 游戏入口单独提示存储不可用。 */ }
}

// 每个适配器固定用户名，切换期间旧页的离页保存仍然属于旧用户。
export function playerStorage(name = currentPlayer, storage = globalThis.localStorage) {
  const prefix = name === DEFAULT_PLAYER ? '' : 'forest-player/' + encodeURIComponent(name) + '/';
  return {
    getItem: key => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: key => storage.removeItem(prefix + key),
  };
}

// 组合森林名称与随机编号，允许玩家生成后继续编辑。
export function randomPlayerName() {
  const woods = ['松林', '晨露', '月桂', '青苔', '竹影', '溪畔'];
  const animals = ['小鹿', '狸猫', '松鼠', '白兔', '山雀', '赤狐'];
  const pick = words => words[Math.floor(Math.random() * words.length)];
  return pick(woods) + pick(animals) + Math.floor(100000 + Math.random() * 900000);
}
