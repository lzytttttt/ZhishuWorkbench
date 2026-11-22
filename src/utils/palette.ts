/**
 * 矿物颜料色板（浅色界面）⇄ 发光色（黑曜石观察窗内的 3D 场景）。
 * 数据层统一使用矿物色；进入 Three.js 暗场时通过 glow() 换回高亮发光色，
 * 避免低明度颜色在暗场中发灰。
 */
export const GLOW: Record<string, string> = {
  '#be3448': '#ff5d73', // 胭脂红 · 认知心脏
  '#1b6b93': '#47d7ff', // 石青蓝 · 全感官 / 提问
  '#a67214': '#f5c451', // 赭石金 · 加油站 / 判断
  '#5b4b9a': '#9d8bff', // 紫檀靛 · 手脚
  '#b85319': '#ff8a3d', // 琥珀橙 · 安全刹车
  '#1d7453': '#3ee6a8', // 松石绿 · 探究
  '#9a386c': '#ff6fb5', // 洋红 · 创造
  '#c83e2b': '#ff4d2e', // 朱砂
};

export const glow = (hex: string): string => GLOW[hex.toLowerCase()] ?? hex;
