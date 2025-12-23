import { createClient } from '@supabase/supabase-js';

// Supabase 客户端配置
// 优先使用 VITE_SUPABASE_URL，如果未定义则回退到 VITE_R2_API_URL (兼容旧配置)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_R2_API_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// 数据类型定义
// ==========================================

export interface ShareData {
  id: string;
  editToken: string;
  photos: string[]; // 图片URL数组
  config: Record<string, unknown>;
  message?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  voiceUrls?: string[]; // 语音URL数组
}

interface LocalShareInfo {
  shareId: string;
  editToken: string;
  createdAt: number;
}

const LOCAL_SHARE_KEY = 'christmas_tree_share';
const LOCAL_CONFIG_KEY = 'christmas_tree_config';
const LOCAL_PHOTOS_KEY = 'christmas_tree_photos';

// ==========================================
// 辅助函数
// ==========================================

const generateId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Base64 转 Blob
const base64ToBlob = (base64: string): Blob | null => {
  try {
    const parts = base64.split(';base64,');
    const contentType = parts[0]?.split(':')[1] || 'image/jpeg';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.error('Base64 convert error:', e);
    return null;
  }
};

// ==========================================
// 核心分享逻辑 (适配 Supabase)
// ==========================================

// 上传单张图片到 Supabase Storage
const uploadFileToSupabase = async (base64Data: string, path: string): Promise<string | null> => {
  const blob = base64ToBlob(base64Data);
  if (!blob) return null;

  const { error } = await supabase.storage
    .from('MerryChristmas')
    .upload(path, blob, {
      contentType: blob.type,
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('MerryChristmas').getPublicUrl(path);
  return data.publicUrl;
};

/**
 * 创建新分享
 */
export const uploadShare = async (
  photos: string[], // base64数组
  config: Record<string, unknown>,
  message?: string
): Promise<{ success: boolean; shareId?: string; editToken?: string; error?: string }> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: '未配置 Supabase 环境变量，请联系管理员' };
    }

    const shareId = generateId();
    const editToken = generateToken();
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7天过期

    // 1. 提取并上传语音
    const { voiceUrls: voiceBase64s, cleanConfig } = extractVoiceDataFromConfig(config);
    const uploadedVoiceUrls: string[] = [];
    
    for (let i = 0; i < voiceBase64s.length; i++) {
      if (voiceBase64s[i]) {
        const path = `${shareId}/voice_${i}.webm`;
        const url = await uploadFileToSupabase(voiceBase64s[i], path);
        if (url) uploadedVoiceUrls.push(url);
      }
    }

    // 2. 上传照片
    const uploadedPhotoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const path = `${shareId}/photo_${i}.jpg`;
      const url = await uploadFileToSupabase(photos[i], path);
      if (url) uploadedPhotoUrls.push(url);
    }

    // 3. 保存记录到数据库
    const { error } = await supabase.from('shares').insert({
      id: shareId,
      edit_token: editToken,
      config: cleanConfig,
      message,
      photos: uploadedPhotoUrls,
      voice_urls: uploadedVoiceUrls,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
      expires_at: new Date(expiresAt).toISOString()
    });

    if (error) throw error;

    saveLocalShare({ shareId, editToken, createdAt: now });
    return { success: true, shareId, editToken };

  } catch (error) {
    console.error('Share error:', error);
    return { success: false, error: error instanceof Error ? error.message : '分享失败' };
  }
};

/**
 * 获取分享
 */
export const getShare = async (shareId: string): Promise<ShareData | null> => {
  try {
    const { data, error } = await supabase
      .from('shares')
      .select('*')
      .eq('id', shareId)
      .single();

    if (error || !data) return null;

    // 检查过期
    const expiresAt = new Date(data.expires_at).getTime();
    if (expiresAt < Date.now()) return null;

    // 还原配置
    let config = data.config;
    // 注意：这里我们不再下载语音并还原为Base64，而是让前端直接播放URL，需要修改VoicePlayer组件适配URL
    // 为了兼容现有逻辑，我们可以在 config 中注入 audioUrl
    if (data.voice_urls && data.voice_urls.length > 0) {
      config = restoreVoiceDataToConfig(config, data.voice_urls); 
    }

    return {
      id: data.id,
      editToken: data.edit_token,
      photos: data.photos || [], // 这里是URL，不再是Base64
      config,
      message: data.message,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      expiresAt,
      voiceUrls: data.voice_urls
    };
  } catch (e) {
    console.error('Get share failed:', e);
    return null;
  }
};

/**
 * 更新分享
 */
export const updateShare = async (
  shareId: string,
  editToken: string,
  photos: string[], // 这里传进来的可能是URL(未修改)也可能是Base64(新上传)
  config: Record<string, unknown>,
  message?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 验证权限
    const { data: existing } = await supabase.from('shares').select('edit_token').eq('id', shareId).single();
    if (!existing || existing.edit_token !== editToken) {
      return { success: false, error: '无权编辑' };
    }

    // 处理图片：如果是Base64则上传，是URL则保留
    const newPhotoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      if (photos[i].startsWith('http')) {
        newPhotoUrls.push(photos[i]);
      } else {
        const path = `${shareId}/photo_${Date.now()}_${i}.jpg`;
        const url = await uploadFileToSupabase(photos[i], path);
        if (url) newPhotoUrls.push(url);
      }
    }

    // 处理配置和语音
    const { voiceUrls: voiceData, cleanConfig } = extractVoiceDataFromConfig(config);
    const newVoiceUrls: string[] = [];
    for (let i = 0; i < voiceData.length; i++) {
        if (voiceData[i].startsWith('http')) {
            newVoiceUrls.push(voiceData[i]);
        } else if (voiceData[i]) {
            const path = `${shareId}/voice_${Date.now()}_${i}.webm`;
            const url = await uploadFileToSupabase(voiceData[i], path);
            if (url) newVoiceUrls.push(url);
        }
    }

    const { error } = await supabase.from('shares').update({
      config: cleanConfig,
      message,
      photos: newPhotoUrls,
      voice_urls: newVoiceUrls,
      updated_at: new Date().toISOString()
    }).eq('id', shareId);

    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '更新失败' };
  }
};

// ==========================================
// 本地存储和其他辅助函数 (保持不变或微调)
// ==========================================

export const getLocalShare = (): LocalShareInfo | null => {
  try {
    const data = localStorage.getItem(LOCAL_SHARE_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const saveLocalShare = (info: LocalShareInfo): void => {
  localStorage.setItem(LOCAL_SHARE_KEY, JSON.stringify(info));
};

export const getShareUrl = (shareId: string): string => {
  return `${window.location.origin}/${shareId}`;
};

export const getEditUrl = (shareId: string, editToken: string): string => {
  return `${window.location.origin}/${shareId}/edit?token=${editToken}`;
};

export const checkLocalShareValid = async (): Promise<{ valid: boolean; shareId?: string; editToken?: string }> => {
  const local = getLocalShare();
  if (!local) return { valid: false };
  
  const share = await getShare(local.shareId);
  if (!share || share.editToken !== local.editToken) {
    localStorage.removeItem(LOCAL_SHARE_KEY);
    return { valid: false };
  }
  return { valid: true, shareId: local.shareId, editToken: local.editToken };
};

export const clearLocalShare = (): void => localStorage.removeItem(LOCAL_SHARE_KEY);

export const saveLocalConfig = (config: Record<string, unknown>): void => {
  localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config));
};

export const getLocalConfig = (): Record<string, unknown> | null => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || 'null');
  } catch { return null; }
};

// 照片本地存储（优先IndexedDB）
export const saveLocalPhotos = async (photos: string[]): Promise<void> => {
    try {
        const db = await openPhotosDB();
        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        await store.clear();
        photos.forEach((p, i) => store.put({ id: i, data: p }));
        store.put({ id: 'count', data: photos.length });
    } catch {
        try { localStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(photos)); } catch {}
    }
};

export const getLocalPhotos = async (): Promise<string[]> => {
    try {
        const db = await openPhotosDB();
        return new Promise((resolve) => {
            const tx = db.transaction('photos', 'readonly');
            const store = tx.objectStore('photos');
            const req = store.getAll();
            req.onsuccess = () => {
                const res = req.result;
                const countItem = res.find(i => i.id === 'count');
                if (!countItem) { resolve(JSON.parse(localStorage.getItem(LOCAL_PHOTOS_KEY) || '[]')); return; }
                const photos = res.filter(i => typeof i.id === 'number').sort((a,b) => a.id - b.id).map(i => i.data);
                resolve(photos);
            };
            req.onerror = () => resolve([]);
        });
    } catch {
        return JSON.parse(localStorage.getItem(LOCAL_PHOTOS_KEY) || '[]');
    }
};

const openPhotosDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('christmas_tree_db', 1);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

// 辅助函数：提取/还原语音配置
export const extractVoiceDataFromConfig = (config: Record<string, unknown>): { voiceUrls: string[]; cleanConfig: Record<string, unknown> } => {
    const voiceUrls: string[] = [];
    const cleanConfig = JSON.parse(JSON.stringify(config));
    const timeline = cleanConfig.timeline as { steps?: Array<{ type: string; audioData?: string; audioUrl?: string }> };
    
    if (timeline?.steps) {
        timeline.steps.forEach((step, index) => {
            if (step.type === 'voice' && (step.audioData || step.audioUrl)) {
                voiceUrls[index] = step.audioData || step.audioUrl || '';
                delete step.audioData;
                step.audioUrl = `voice:${index}`;
            }
        });
    }
    return { voiceUrls, cleanConfig };
};

export const restoreVoiceDataToConfig = (config: Record<string, unknown>, voiceUrls: string[]): Record<string, unknown> => {
    const restored = JSON.parse(JSON.stringify(config));
    const timeline = restored.timeline as { steps?: Array<{ type: string; audioData?: string; audioUrl?: string }> };
    
    if (timeline?.steps) {
        timeline.steps.forEach((step) => {
            if (step.type === 'voice' && step.audioUrl?.startsWith('voice:')) {
                const idx = parseInt(step.audioUrl.split(':')[1]);
                if (voiceUrls[idx]) {
                    step.audioUrl = voiceUrls[idx]; // 直接还原为 URL
                }
            }
        });
    }
    return restored;
};

// 为了兼容旧代码的占位函数
export const refreshShareExpiry = async () => ({ success: true });
export const deleteShare = async () => ({ success: true });
