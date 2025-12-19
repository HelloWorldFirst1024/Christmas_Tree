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

// 检测是否支持全屏
export const isFullscreenSupported = (): boolean => {
  const doc = document as Document & {
    webkitFullscreenEnabled?: boolean;
    mozFullScreenEnabled?: boolean;
    msFullscreenEnabled?: boolean;
  };
  return !!(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled
  );
};

// 检测当前是否全屏
export const isFullscreen = (): boolean => {
  const doc = document as Document & {
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
  };
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
};

// 进入全屏
export const enterFullscreen = async (element?: HTMLElement): Promise<boolean> => {
  const el = element || document.documentElement;
  const elem = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  };
  
  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// 退出全屏
export const exitFullscreen = async (): Promise<boolean> => {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  };
  
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// 切换全屏
export const toggleFullscreen = async (): Promise<boolean> => {
  if (isFullscreen()) {
    return exitFullscreen();
  } else {
    return enterFullscreen();
  }
};

// 锁定屏幕方向为横屏（如果支持）
export const lockLandscape = async (): Promise<boolean> => {
  try {
    const screen = window.screen as Screen & {
      orientation?: {
        lock?: (orientation: string) => Promise<void>;
      };
    };
    if (screen.orientation?.lock) {
      await screen.orientation.lock('landscape');
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// 解锁屏幕方向
export const unlockOrientation = (): void => {
  try {
    const screen = window.screen as Screen & {
      orientation?: {
        unlock?: () => void;
      };
    };
    if (screen.orientation?.unlock) {
      screen.orientation.unlock();
    }
  } catch {
    // 忽略错误
  }
};

// 获取默认场景配置（根据设备类型自动调整）
export const getDefaultSceneConfig = (forceMinimal = false): Record<string, unknown> => {
  const mobile = isMobile();
  const tablet = isTablet();
  // 移动端和平板默认使用最低配置
  const useMinimal = forceMinimal || mobile || tablet;
  
  return {
    foliage: { 
      enabled: true, 
      count: useMinimal ? 3000 : 15000, 
      color: '#00FF88', 
      size: 1, 
      glow: 1 
    },
    lights: { 
      enabled: true, 
      count: useMinimal ? 50 : 400 
    },
    elements: { 
      enabled: true, 
      count: useMinimal ? 80 : 500 
    },
    snow: { 
      enabled: true, 
      count: useMinimal ? 300 : 2000, 
      speed: 2, 
      size: 0.5, 
      opacity: 0.8 
    },
    sparkles: { 
      enabled: !useMinimal, 
      count: useMinimal ? 0 : 600 
    },
    stars: { enabled: true },
    bloom: { 
      enabled: true, 
      intensity: useMinimal ? 1.0 : 1.5 
    },
    title: { enabled: true, text: 'Merry Christmas', size: 48 },
    giftPile: { 
      enabled: true, 
      count: useMinimal ? 8 : 18 
    },
    ribbons: { 
      enabled: true, 
      count: useMinimal ? 15 : 50 
    },
    fog: { enabled: true, opacity: 0.3 },
    music: {
      selected: 'christmas-stars',
      volume: 0.5
    },
    gestures: {
      Closed_Fist: 'formed',
      Open_Palm: 'chaos',
      Pointing_Up: 'music',
      Thumb_Down: 'zoomOut',
      Thumb_Up: 'zoomIn',
      Victory: 'text',
      ILoveYou: 'heart',
      Pinch: 'none'
    },
    gestureText: 'MERRY CHRISTMAS',
    gestureEffect: {
      duration: 5000,
      hideTree: true,
      textCount: useMinimal ? 500 : 1000,
      heartCount: useMinimal ? 800 : 1500
    }
  };
};
