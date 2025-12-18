/**
 * 安全验证和清理工具
 * 防止 XSS 攻击和恶意内容注入
 */

// 允许的图片 MIME 类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// 允许的字体列表（白名单）
const ALLOWED_FONTS = [
  'ZCOOL XiaoWei', 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', 'Zhi Mang Xing',
  'Liu Jian Mao Cao', 'Long Cang', 'ZCOOL KuaiLe', 'Noto Serif SC', 'Noto Sans SC',
  'Mountains of Christmas', 'Great Vibes', 'Dancing Script', 'Pacifico', 'Lobster',
  'Satisfy', 'Tangerine', 'Allura', 'Alex Brush', 'Pinyon Script', 'Sacramento'
];

/**
 * 清理 HTML 特殊字符，防止 XSS
 */
export const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * 验证并清理文本内容
 * - 移除潜在的脚本标签
 * - 限制长度
 * - 移除控制字符
 */
export const sanitizeText = (text: unknown, maxLength: number = 200): string => {
  if (typeof text !== 'string') return '';
  
  return text
    // 移除所有 HTML 标签
    .replace(/<[^>]*>/g, '')
    // 移除 javascript: 协议
    .replace(/javascript:/gi, '')
    // 移除 data: 协议（除了图片）
    .replace(/data:(?!image\/(jpeg|png|gif|webp))[^;]*/gi, '')
    // 移除控制字符
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 限制长度
    .slice(0, maxLength)
    .trim();
};

/**
 * 验证字体名称是否在白名单中
 */
export const sanitizeFont = (font: unknown): string => {
  if (typeof font !== 'string') return 'Mountains of Christmas';
  const cleanFont = font.replace(/['"]/g, '').trim();
  return ALLOWED_FONTS.includes(cleanFont) ? cleanFont : 'Mountains of Christmas';
};

/**
 * 验证 base64 图片数据
 * - 检查是否为有效的 data URL
 * - 检查 MIME 类型是否允许
 * - 限制大小
 */
export const sanitizeBase64Image = (data: unknown, maxSizeBytes: number = 5 * 1024 * 1024): string | null => {
  if (typeof data !== 'string') return null;
  
  // 检查是否为 data URL 格式
  const dataUrlMatch = data.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!dataUrlMatch) return null;
  
  const mimeType = dataUrlMatch[1].toLowerCase();
  const base64Data = dataUrlMatch[2];
  
  // 检查 MIME 类型
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) return null;
  
  // 估算大小（base64 编码后约为原始大小的 4/3）
  const estimatedSize = (base64Data.length * 3) / 4;
  if (estimatedSize > maxSizeBytes) return null;
  
  // 验证 base64 格式
  try {
    atob(base64Data);
  } catch {
    return null;
  }
  
  return data;
};

/**
 * 验证数字在合理范围内
 */
export const sanitizeNumber = (value: unknown, min: number, max: number, defaultValue: number): number => {
  if (typeof value !== 'number' || isNaN(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
};

/**
 * 验证布尔值
 */
export const sanitizeBoolean = (value: unknown, defaultValue: boolean = false): boolean => {
  if (typeof value !== 'boolean') return defaultValue;
  return value;
};

/**
 * 验证并清理分享配置
 */
export const sanitizeShareConfig = (config: unknown): Record<string, unknown> => {
  if (!config || typeof config !== 'object') return {};
  
  const cfg = config as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  
  // 树叶配置
  if (cfg.foliage && typeof cfg.foliage === 'object') {
    const f = cfg.foliage as Record<string, unknown>;
    sanitized.foliage = {
      enabled: sanitizeBoolean(f.enabled, true),
      count: sanitizeNumber(f.count, 1000, 30000, 15000)
    };
  }
  
  // 彩灯配置
  if (cfg.lights && typeof cfg.lights === 'object') {
    const l = cfg.lights as Record<string, unknown>;
    sanitized.lights = {
      enabled: sanitizeBoolean(l.enabled, true),
      count: sanitizeNumber(l.count, 50, 1000, 400)
    };
  }
  
  // 圣诞元素配置
  if (cfg.elements && typeof cfg.elements === 'object') {
    const e = cfg.elements as Record<string, unknown>;
    sanitized.elements = {
      enabled: sanitizeBoolean(e.enabled, true),
      count: sanitizeNumber(e.count, 50, 1000, 500)
    };
    // 自定义图片需要验证
    if (e.customImages && typeof e.customImages === 'object') {
      const ci = e.customImages as Record<string, unknown>;
      const customImages: Record<string, string> = {};
      if (ci.box) {
        const boxImg = sanitizeBase64Image(ci.box);
        if (boxImg) customImages.box = boxImg;
      }
      if (ci.sphere) {
        const sphereImg = sanitizeBase64Image(ci.sphere);
        if (sphereImg) customImages.sphere = sphereImg;
      }
      if (ci.cylinder) {
        const cylinderImg = sanitizeBase64Image(ci.cylinder);
        if (cylinderImg) customImages.cylinder = cylinderImg;
      }
      if (Object.keys(customImages).length > 0) {
        (sanitized.elements as Record<string, unknown>).customImages = customImages;
      }
    }
  }
  
  // 雪花配置
  if (cfg.snow && typeof cfg.snow === 'object') {
    const s = cfg.snow as Record<string, unknown>;
    sanitized.snow = {
      enabled: sanitizeBoolean(s.enabled, true),
      count: sanitizeNumber(s.count, 100, 10000, 2000),
      speed: sanitizeNumber(s.speed, 0.1, 10, 2),
      size: sanitizeNumber(s.size, 0.1, 5, 0.5),
      opacity: sanitizeNumber(s.opacity, 0.1, 1, 0.8)
    };
  }
  
  // 闪光配置
  if (cfg.sparkles && typeof cfg.sparkles === 'object') {
    const sp = cfg.sparkles as Record<string, unknown>;
    sanitized.sparkles = {
      enabled: sanitizeBoolean(sp.enabled, true),
      count: sanitizeNumber(sp.count, 0, 2000, 600)
    };
  }
  
  // 星空配置
  if (cfg.stars && typeof cfg.stars === 'object') {
    const st = cfg.stars as Record<string, unknown>;
    sanitized.stars = {
      enabled: sanitizeBoolean(st.enabled, true)
    };
  }
  
  // 泛光配置
  if (cfg.bloom && typeof cfg.bloom === 'object') {
    const b = cfg.bloom as Record<string, unknown>;
    sanitized.bloom = {
      enabled: sanitizeBoolean(b.enabled, true),
      intensity: sanitizeNumber(b.intensity, 0, 5, 1.5)
    };
  }
  
  // 标题配置
  if (cfg.title && typeof cfg.title === 'object') {
    const t = cfg.title as Record<string, unknown>;
    sanitized.title = {
      enabled: sanitizeBoolean(t.enabled, true),
      text: sanitizeText(t.text, 100) || 'Merry Christmas',
      size: sanitizeNumber(t.size, 12, 200, 48),
      font: sanitizeFont(t.font)
    };
  }
  
  // 礼物堆配置
  if (cfg.giftPile && typeof cfg.giftPile === 'object') {
    const g = cfg.giftPile as Record<string, unknown>;
    sanitized.giftPile = {
      enabled: sanitizeBoolean(g.enabled, true),
      count: sanitizeNumber(g.count, 1, 100, 18)
    };
  }
  
  // 丝带配置
  if (cfg.ribbons && typeof cfg.ribbons === 'object') {
    const r = cfg.ribbons as Record<string, unknown>;
    sanitized.ribbons = {
      enabled: sanitizeBoolean(r.enabled, true),
      count: sanitizeNumber(r.count, 10, 200, 50)
    };
  }
  
  // 雾气配置
  if (cfg.fog && typeof cfg.fog === 'object') {
    const fo = cfg.fog as Record<string, unknown>;
    sanitized.fog = {
      enabled: sanitizeBoolean(fo.enabled, true),
      opacity: sanitizeNumber(fo.opacity, 0.1, 1, 0.3)
    };
  }
  
  // 手势文字配置
  if (cfg.gestureText !== undefined) {
    sanitized.gestureText = sanitizeText(cfg.gestureText, 50) || 'MERRY CHRISTMAS';
  }
  
  // 多条文字配置
  if (Array.isArray(cfg.gestureTexts)) {
    sanitized.gestureTexts = cfg.gestureTexts
      .slice(0, 10) // 最多 10 条
      .map(t => sanitizeText(t, 50))
      .filter(t => t.length > 0);
  }
  
  // 文字切换间隔
  if (cfg.textSwitchInterval !== undefined) {
    sanitized.textSwitchInterval = sanitizeNumber(cfg.textSwitchInterval, 1, 30, 3);
  }
  
  // 特效配置
  if (cfg.gestureEffect && typeof cfg.gestureEffect === 'object') {
    const ge = cfg.gestureEffect as Record<string, unknown>;
    sanitized.gestureEffect = {
      duration: sanitizeNumber(ge.duration, 1000, 30000, 5000),
      hideTree: sanitizeBoolean(ge.hideTree, true),
      textCount: sanitizeNumber(ge.textCount, 100, 5000, 1000),
      heartCount: sanitizeNumber(ge.heartCount, 100, 5000, 1500)
    };
  }
  
  // 预加载文字
  if (cfg.preloadText !== undefined) {
    sanitized.preloadText = sanitizeBoolean(cfg.preloadText, false);
  }
  
  // 树顶星星/头像配置
  if (cfg.topStar && typeof cfg.topStar === 'object') {
    const ts = cfg.topStar as Record<string, unknown>;
    const topStar: Record<string, unknown> = {};
    if (ts.avatarUrl) {
      const avatarImg = sanitizeBase64Image(ts.avatarUrl);
      if (avatarImg) topStar.avatarUrl = avatarImg;
    }
    if (Object.keys(topStar).length > 0) {
      sanitized.topStar = topStar;
    }
  }
  
  // 开场文案配置
  if (cfg.intro && typeof cfg.intro === 'object') {
    const intro = cfg.intro as Record<string, unknown>;
    sanitized.intro = {
      enabled: sanitizeBoolean(intro.enabled, false),
      text: sanitizeText(intro.text, 100) || '献给最特别的你',
      subText: intro.subText ? sanitizeText(intro.subText, 100) : undefined,
      duration: sanitizeNumber(intro.duration, 2000, 15000, 4000)
    };
  }
  
  // 音乐配置
  if (cfg.music && typeof cfg.music === 'object') {
    const m = cfg.music as Record<string, unknown>;
    sanitized.music = {
      selected: sanitizeText(m.selected, 50) || 'christmas-stars',
      volume: sanitizeNumber(m.volume, 0, 1, 0.5)
    };
    // 自定义音乐 URL（base64）
    if (m.customUrl && typeof m.customUrl === 'string') {
      // 验证是否为 audio data URL
      if (m.customUrl.startsWith('data:audio/')) {
        (sanitized.music as Record<string, unknown>).customUrl = m.customUrl;
      }
    }
  }
  
  // 手势配置
  if (cfg.gestures && typeof cfg.gestures === 'object') {
    const g = cfg.gestures as Record<string, unknown>;
    const allowedActions = ['none', 'formed', 'chaos', 'heart', 'text', 'music', 'screenshot', 'reset'];
    const gestureKeys = ['Closed_Fist', 'Open_Palm', 'Pointing_Up', 'Thumb_Down', 'Thumb_Up', 'Victory', 'ILoveYou'];
    const gestures: Record<string, string> = {};
    
    for (const key of gestureKeys) {
      const action = g[key];
      if (typeof action === 'string' && allowedActions.includes(action)) {
        gestures[key] = action;
      }
    }
    
    if (Object.keys(gestures).length > 0) {
      sanitized.gestures = gestures;
    }
  }
  
  return sanitized;
};

/**
 * 验证并清理照片数组
 */
export const sanitizePhotos = (photos: unknown, maxCount: number = 20): string[] => {
  if (!Array.isArray(photos)) return [];
  
  return photos
    .slice(0, maxCount)
    .map(p => sanitizeBase64Image(p))
    .filter((p): p is string => p !== null);
};
