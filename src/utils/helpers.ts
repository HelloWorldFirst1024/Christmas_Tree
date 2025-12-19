import { CONFIG } from '../config';

// 检测是否为移动端（手机）
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPad 在新版 iOS 上会伪装成 Mac，需要通过触摸点检测
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // 平板不算移动端（宽度 >= 768）
  if (isIPad || /tablet|playbook|silk/i.test(ua)) {
    return false;
  }
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    window.innerWidth < 768;
};

// 检测是否为平板
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  return isIPad || isAndroidTablet || /tablet|playbook|silk/i.test(ua) ||
    (window.innerWidth >= 768 && window.innerWidth <= 1024 && 'ontouchstart' in window);
};

// 生成树形位置（支持可选的种子随机参数和自定义尺寸）
export const getTreePosition = (
  seed1?: number, 
  seed2?: number,
  customHeight?: number,
  customRadius?: number
): [number, number, number] => {
  const h = customHeight ?? CONFIG.tree.height;
  const rBase = customRadius ?? CONFIG.tree.radius;
  const r1 = seed1 !== undefined ? seed1 : Math.random();
  const r2 = seed2 !== undefined ? seed2 : Math.random();
  // 使用 seed1 和 seed2 生成第三个伪随机数，确保分布均匀
  const r3 = seed1 !== undefined 
    ? (Math.sin(seed1 * 12.9898 + seed2! * 78.233) * 43758.5453 % 1 + 1) % 1
    : Math.random();
  const y = (r1 * h) - (h / 2);
  const normalizedY = (y + (h / 2)) / h;
  const currentRadius = rBase * (1 - normalizedY);
  const theta = r2 * Math.PI * 2;
  // 使用 sqrt 使粒子在圆盘上均匀分布（而不是集中在中心）
  const r = Math.sqrt(r3) * currentRadius;
  return [r * Math.cos(theta), y, r * Math.sin(theta)];
};

// 图片转 base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
