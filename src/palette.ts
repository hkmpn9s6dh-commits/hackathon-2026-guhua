// 墨烛：一间没开灯的屋子，只有观众手里那支烛。
export const INK = {
  void: '#0a0908',
  silk: '#2a211a',
  silkDeep: '#1a1410',
  candle: '#e8b465',
  candleCore: '#fff2d2',
  vermilion: '#a8331f',
  azurite: '#2f5d6b',
  bone: '#e8ded0',
  dim: '#8a7a68',
  rule: '#3a2f26',
  robe: '#3b2a20',
  robeAlt: '#4a3428',
  robeBlue: '#263c44',
  robePale: '#7a6a56',
  rim: '#8d7452',
} as const;

export type Ink = typeof INK;
