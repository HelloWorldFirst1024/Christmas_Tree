/**
 * 时间轴编辑器组件
 * 用于配置故事线模式的步骤
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { TimelineConfig, TimelineStep, TimelineStepType, GiftStep, VoiceStep } from '../../types';
import { PRESET_MUSIC } from '../../types';
import { 
  Play, Pause, Trash2, GripVertical, ChevronUp, ChevronDown,
  MessageSquare, Image, Heart, Type, TreePine, Music, Gift, Mic, Upload, X, Eye
} from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { validateAudioFile } from '../../utils/audioValidation';
import { audioToBase64 } from '../../lib/r2';

// 生成唯一ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 步骤类型配置
const STEP_TYPES: { type: TimelineStepType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'intro', label: '开场文案', icon: <MessageSquare size={14} />, color: '#9C27B0' },
  { type: 'photo', label: '照片展示', icon: <Image size={14} />, color: '#2196F3' },
  { type: 'heart', label: '爱心特效', icon: <Heart size={14} />, color: '#E91E63' },
  { type: 'text', label: '文字特效', icon: <Type size={14} />, color: '#FF9800' },
  { type: 'gift', label: '礼物拆开', icon: <Gift size={14} />, color: '#FF5722' },
  { type: 'voice', label: '语音祝福', icon: <Mic size={14} />, color: '#00BCD4' },
  { type: 'tree', label: '圣诞树', icon: <TreePine size={14} />, color: '#4CAF50' },
];

// 创建默认步骤
const createDefaultStep = (type: TimelineStepType): TimelineStep => {
  const base = { id: generateId(), duration: 3000, delay: 0 };
  
  switch (type) {
    case 'intro':
      return { ...base, type: 'intro', text: '献给最特别的你', subText: '' };
    case 'photo':
      return { ...base, type: 'photo', photoIndex: -1 }; // -1 表示按顺序
    case 'heart':
      return { ...base, type: 'heart', duration: 4000, showPhoto: true, photoIndex: -1 };
    case 'text':
      return { ...base, type: 'text', text: 'MERRY CHRISTMAS' };
    case 'gift':
      return { ...base, type: 'gift', duration: 0, message: '圣诞快乐！', boxColor: '#E53935', ribbonColor: '#FFD700', messageDuration: 3000 };
    case 'voice':
      return { ...base, type: 'voice', duration: 0, showIndicator: true };
    case 'tree':
      return { ...base, type: 'tree', duration: 2000 };
  }
};

// 照片选择器组件（带预览弹窗）
interface PhotoSelectorProps {
  photoIndex: number;
  photoCount: number;
  photoPaths: string[]; // 照片URL数组
  onChange: (index: number) => void;
}

const PhotoSelector: React.FC<PhotoSelectorProps> = ({
  photoIndex,
  photoCount,
  photoPaths,
  onChange
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const selectStyle: React.CSSProperties = {
    flex: 1,
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    boxSizing: 'border-box',
    backgroundColor: '#1a1a1a'
  };

  const optionStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    color: '#fff'
  };

  // 获取照片URL
  const getPhotoUrl = (index: number) => {
    if (index >= 0 && index < photoPaths.length) {
      return photoPaths[index];
    }
    return '';
  };

  return (
    <div>
      <label style={{ fontSize: '10px', color: '#888' }}>选择照片</label>
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
        <select
          value={photoIndex}
          onChange={(e) => onChange(Number(e.target.value))}
          style={selectStyle}
        >
          <option value={-1} style={optionStyle}>
            按顺序自动选择
          </option>
          {Array.from({ length: photoCount }, (_, i) => (
            <option key={i} value={i} style={optionStyle}>
              照片 {i + 1}
            </option>
          ))}
        </select>
        {photoIndex >= 0 && photoIndex < photoCount && getPhotoUrl(photoIndex) && (
          <button
            onClick={() => setShowPreview(true)}
            style={{
              padding: '6px 10px',
              background: 'rgba(33,150,243,0.2)',
              border: '1px solid rgba(33,150,243,0.4)',
              borderRadius: '4px',
              color: '#2196F3',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <Eye size={12} /> 预览
          </button>
        )}
      </div>

      {/* 预览弹窗 - 全平台适配 */}
      {showPreview &&
        getPhotoUrl(photoIndex) &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px',
              boxSizing: 'border-box'
            }}
            onClick={() => setShowPreview(false)}
          >
            {/* 关闭按钮 - 移动端更大的点击区域 */}
            <button
              onClick={() => setShowPreview(false)}
              style={{
                position: 'absolute',
                top: 'max(16px, env(safe-area-inset-top, 16px))',
                right: 'max(16px, env(safe-area-inset-right, 16px))',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                zIndex: 10001,
                touchAction: 'manipulation'
              }}
            >
              <X size={24} />
            </button>

            {/* 图片容器 */}
            <div
              style={{
                position: 'relative',
                maxWidth: 'min(90vw, 600px)',
                maxHeight: 'calc(100vh - 120px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getPhotoUrl(photoIndex)}
                alt={`照片 ${photoIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'min(calc(100vh - 140px), calc(100dvh - 140px))',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                }}
              />
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  padding: '0 16px'
                }}
              >
                照片 {photoIndex + 1}
              </div>
            </div>

            {/* 底部提示 - 移动端友好 */}
            <div
              style={{
                position: 'absolute',
                bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
                left: 0,
                right: 0,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px'
              }}
            >
              点击任意位置关闭
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

// 语音步骤编辑器子组件
interface VoiceStepEditorProps {
  step: VoiceStep;
  onUpdate: (updates: Partial<VoiceStep>) => void;
}

const VoiceStepEditor: React.FC<VoiceStepEditorProps> = ({ step, onUpdate }) => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  // 处理录制完成
  const handleRecorded = async (blob: Blob) => {
    try {
      const base64 = await audioToBase64(blob);
      onUpdate({ audioData: base64, audioUrl: undefined });
      setAudioPreviewUrl(URL.createObjectURL(blob));
      setShowRecorder(false);
      setUploadError(null);
    } catch {
      setUploadError('录音保存失败');
    }
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const validation = await validateAudioFile(file);
    
    if (!validation.valid) {
      setUploadError(validation.error || '文件验证失败');
      return;
    }

    try {
      const base64 = await audioToBase64(file);
      onUpdate({ audioData: base64, audioUrl: undefined });
      setAudioPreviewUrl(URL.createObjectURL(file));
    } catch {
      setUploadError('文件读取失败');
    }
  };

  // 清除音频
  const clearAudio = () => {
    onUpdate({ audioData: undefined, audioUrl: undefined });
    setAudioPreviewUrl(null);
  };

  const hasAudio = step.audioData || step.audioUrl;

  return (
    <div>
      <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
        语音祝福最长 60 秒，可录制或上传音频文件
      </p>

      {/* 已有音频预览 */}
      {hasAudio && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#00BCD4' }}>✓ 已添加语音</span>
            <button
              onClick={clearAudio}
              style={{
                padding: '2px 8px',
                background: 'rgba(255,0,0,0.2)',
                border: '1px solid rgba(255,0,0,0.3)',
                borderRadius: '4px',
                color: '#ff6666',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              删除
            </button>
          </div>
          {audioPreviewUrl && (
            <audio src={audioPreviewUrl} controls style={{ width: '100%', height: '32px' }} />
          )}
        </div>
      )}

      {/* 录制/上传按钮 */}
      {!hasAudio && !showRecorder && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowRecorder(true)}
            style={{
              flex: 1,
              padding: '10px',
              background: 'rgba(0,188,212,0.2)',
              border: '1px solid rgba(0,188,212,0.4)',
              borderRadius: '6px',
              color: '#00BCD4',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Mic size={14} /> 录制语音
          </button>
          <label
            style={{
              flex: 1,
              padding: '10px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Upload size={14} /> 上传文件
            <input
              type="file"
              accept="audio/mp3,audio/wav,audio/m4a,audio/mpeg,audio/x-m4a"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      {/* 录音器弹窗 */}
      {showRecorder && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '400px',
            width: '90%'
          }}>
            <button
              onClick={() => setShowRecorder(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              <X size={18} />
            </button>
            <VoiceRecorder
              onRecorded={handleRecorded}
              maxDuration={60}
              onCancel={() => setShowRecorder(false)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* 错误提示 */}
      {uploadError && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(255,0,0,0.1)',
          border: '1px solid rgba(255,0,0,0.3)',
          borderRadius: '4px',
          color: '#ff6666',
          fontSize: '11px'
        }}>
          {uploadError}
        </div>
      )}

      {/* 显示指示器选项 */}
      <label style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '11px', 
        marginTop: '10px',
        color: '#888'
      }}>
        <input
          type="checkbox"
          checked={step.showIndicator ?? true}
          onChange={e => onUpdate({ showIndicator: e.target.checked })}
          style={{ accentColor: '#00BCD4' }}
        />
        播放时显示音频指示器
      </label>
    </div>
  );
};

interface TimelineEditorProps {
  config: TimelineConfig | undefined;
  onChange: (config: TimelineConfig) => void;
  photoCount: number;
  photoPaths?: string[];  // 照片URL数组（用于预览）
  configuredTexts?: string[];  // 已配置的文字粒子内容
  textSwitchInterval?: number; // 文字切换间隔（秒）
  onTextsChange?: (texts: string[]) => void; // 修改文字内容
  onTextIntervalChange?: (interval: number) => void; // 修改切换间隔
  onPreview?: () => void;
  isPlaying?: boolean;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  config,
  onChange,
  photoCount,
  photoPaths = [],
  configuredTexts = [],
  textSwitchInterval: _textSwitchInterval = 3,
  onTextsChange,
  onTextIntervalChange: _onTextIntervalChange,
  onPreview,
  isPlaying = false
}) => {
  // 标记未使用的变量（保留接口兼容性）
  void _textSwitchInterval;
  void _onTextIntervalChange;
  
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // 初始化默认配置
  const safeConfig: TimelineConfig = config || {
    enabled: false,
    autoPlay: true,
    loop: false,
    steps: []
  };

  // 更新配置
  const updateConfig = (updates: Partial<TimelineConfig>) => {
    onChange({ ...safeConfig, ...updates });
  };

  // 添加步骤
  const addStep = (type: TimelineStepType) => {
    const newStep = createDefaultStep(type);
    updateConfig({ steps: [...safeConfig.steps, newStep] });
    setExpandedStep(newStep.id);
  };

  // 删除步骤
  const removeStep = (id: string) => {
    updateConfig({ steps: safeConfig.steps.filter(s => s.id !== id) });
    if (expandedStep === id) setExpandedStep(null);
  };

  // 更新步骤
  const updateStep = (id: string, updates: Partial<TimelineStep>) => {
    updateConfig({
      steps: safeConfig.steps.map(s => 
        s.id === id ? { ...s, ...updates } as TimelineStep : s
      )
    });
  };

  // 移动步骤
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= safeConfig.steps.length) return;
    
    const newSteps = [...safeConfig.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    updateConfig({ steps: newSteps });
  };

  // 计算总时长
  const totalDuration = safeConfig.steps.reduce((sum, s) => sum + s.duration + (s.delay || 0), 0);

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '12px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    boxSizing: 'border-box'
  };

  return (
    <div>
      {/* 启用开关 */}
      <div style={labelStyle}>
        <span>启用故事线模式</span>
        <input
          type="checkbox"
          checked={safeConfig.enabled}
          onChange={e => updateConfig({ enabled: e.target.checked })}
          style={{ accentColor: '#FFD700' }}
        />
      </div>
      
      {safeConfig.enabled && (
        <>
          <p style={{ fontSize: '10px', color: '#888', margin: '0 0 12px 0' }}>
            故事线模式会按顺序播放特效，最后以圣诞树结束。
            启用后将忽略"开场文案"和"预加载文字"等单独配置。
          </p>

          {/* 播放选项 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <input
                type="checkbox"
                checked={safeConfig.autoPlay}
                onChange={e => updateConfig({ autoPlay: e.target.checked })}
                style={{ accentColor: '#FFD700' }}
              />
              自动播放
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <input
                type="checkbox"
                checked={safeConfig.loop}
                onChange={e => updateConfig({ loop: e.target.checked })}
                style={{ accentColor: '#FFD700' }}
              />
              循环播放
            </label>
          </div>

          {/* 故事线专用音乐 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginBottom: '6px' }}>
              <Music size={12} /> 故事线音乐
            </label>
            <select
              value={safeConfig.music || ''}
              onChange={e => updateConfig({ music: e.target.value || undefined })}
              style={{ ...inputStyle, backgroundColor: '#1a1a1a', color: '#fff' }}
            >
              <option value="" style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>使用全局音乐设置</option>
              {PRESET_MUSIC.map(m => (
                <option key={m.id} value={m.id} style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>{m.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
              播放故事线时自动切换到此音乐
            </p>
          </div>

          {/* 预览按钮 */}
          {onPreview && safeConfig.steps.length > 0 && (
            <button
              onClick={onPreview}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '12px',
                background: isPlaying ? '#E91E63' : 'rgba(255,215,0,0.2)',
                border: '1px solid #FFD700',
                borderRadius: '4px',
                color: '#FFD700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {isPlaying ? <><Pause size={14} /> 停止预览</> : <><Play size={14} /> 预览故事线</>}
            </button>
          )}

          {/* 总时长 */}
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>
            总时长: {(totalDuration / 1000).toFixed(1)} 秒 | {safeConfig.steps.length} 个步骤
          </div>

          {/* 步骤列表 */}
          <div style={{ marginBottom: '12px' }}>
            {safeConfig.steps.map((step, index) => {
              const stepType = STEP_TYPES.find(t => t.type === step.type);
              const isExpanded = expandedStep === step.id;
              
              return (
                <div
                  key={step.id}
                  style={{
                    marginBottom: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    border: `1px solid ${stepType?.color || '#666'}40`,
                    overflow: 'hidden'
                  }}
                >
                  {/* 步骤头部 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent'
                    }}
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  >
                    <GripVertical size={14} style={{ color: '#666', marginRight: '6px' }} />
                    <span style={{ 
                      color: stepType?.color, 
                      marginRight: '6px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {stepType?.icon}
                    </span>
                    <span style={{ flex: 1, fontSize: '12px' }}>
                      {index + 1}. {stepType?.label}
                    </span>
                    <span style={{ fontSize: '10px', color: '#888', marginRight: '8px' }}>
                      {step.type === 'gift' || step.type === 'voice' 
                        ? '等待交互' 
                        : `${(step.duration / 1000).toFixed(1)}s`}
                    </span>
                    
                    {/* 移动按钮 */}
                    <button
                      onClick={e => { e.stopPropagation(); moveStep(index, 'up'); }}
                      disabled={index === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: index === 0 ? '#444' : '#888',
                        cursor: index === 0 ? 'default' : 'pointer',
                        padding: '2px'
                      }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); moveStep(index, 'down'); }}
                      disabled={index === safeConfig.steps.length - 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: index === safeConfig.steps.length - 1 ? '#444' : '#888',
                        cursor: index === safeConfig.steps.length - 1 ? 'default' : 'pointer',
                        padding: '2px'
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); removeStep(step.id); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff6666',
                        cursor: 'pointer',
                        padding: '2px',
                        marginLeft: '4px'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* 步骤详情 */}
                  {isExpanded && (
                    <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* 通用配置 - 礼物和语音步骤不显示持续时间滑块 */}
                      {step.type !== 'gift' && step.type !== 'voice' && (
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '10px', color: '#888' }}>
                            持续时间: {(step.duration / 1000).toFixed(1)} 秒
                          </label>
                          <input
                            type="range"
                            min="1000"
                            max="10000"
                            step="500"
                            value={step.duration}
                            onChange={e => updateStep(step.id, { duration: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: stepType?.color }}
                          />
                        </div>
                      )}

                      {/* 类型特定配置 */}
                      {step.type === 'intro' && (
                        <>
                          <input
                            type="text"
                            value={step.text}
                            onChange={e => updateStep(step.id, { text: e.target.value })}
                            placeholder="主文案"
                            style={{ ...inputStyle, marginBottom: '6px' }}
                          />
                          <input
                            type="text"
                            value={step.subText || ''}
                            onChange={e => updateStep(step.id, { subText: e.target.value })}
                            placeholder="副文案（可选）"
                            style={inputStyle}
                          />
                        </>
                      )}

                      {step.type === 'photo' && (
                        <PhotoSelector
                          photoIndex={step.photoIndex}
                          photoCount={photoCount}
                          photoPaths={photoPaths}
                          onChange={(index) => updateStep(step.id, { photoIndex: index })}
                        />
                      )}

                      {step.type === 'heart' && (
                        <>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '8px' }}>
                            <input
                              type="checkbox"
                              checked={step.showPhoto ?? false}
                              onChange={e => updateStep(step.id, { showPhoto: e.target.checked })}
                              style={{ accentColor: '#E91E63' }}
                            />
                            在爱心中心显示照片
                          </label>
                          {step.showPhoto && (
                            <PhotoSelector
                              photoIndex={step.photoIndex ?? -1}
                              photoCount={photoCount}
                              photoPaths={photoPaths}
                              onChange={(index) => updateStep(step.id, { photoIndex: index })}
                            />
                          )}
                        </>
                      )}

                      {step.type === 'text' && (
                        <div>
                          {/* 文字粒子内容编辑 - 简化版：只显示第一条文字 */}
                          {onTextsChange && (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ marginBottom: '6px' }}>
                                <span style={{ fontSize: '10px', color: '#888' }}>文字粒子内容</span>
                              </div>
                              
                              <input
                                type="text"
                                value={configuredTexts[0] || ''}
                                onChange={e => {
                                  const newTexts = [...configuredTexts];
                                  newTexts[0] = e.target.value;
                                  onTextsChange(newTexts);
                                }}
                                placeholder="输入文字"
                                maxLength={20}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  background: 'rgba(255,255,255,0.1)',
                                  border: '1px solid rgba(255,152,0,0.3)',
                                  borderRadius: '4px',
                                  color: '#fff',
                                  fontSize: '12px',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {step.type === 'tree' && (
                        <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>
                          圣诞树聚合是故事线的结束标志
                        </p>
                      )}

                      {/* 礼物步骤配置 */}
                      {step.type === 'gift' && (
                        <div>
                          <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
                            礼物步骤会暂停故事线，等待用户点击打开礼物盒
                          </p>
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '10px', color: '#888' }}>祝福语</label>
                            <textarea
                              value={(step as GiftStep).message || ''}
                              onChange={e => updateStep(step.id, { message: e.target.value })}
                              placeholder="输入祝福语..."
                              maxLength={100}
                              style={{
                                ...inputStyle,
                                marginTop: '4px',
                                minHeight: '60px',
                                resize: 'vertical'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', color: '#888' }}>礼物盒颜色</label>
                              <input
                                type="color"
                                value={(step as GiftStep).boxColor || '#E53935'}
                                onChange={e => updateStep(step.id, { boxColor: e.target.value })}
                                style={{ width: '100%', height: '30px', marginTop: '4px', cursor: 'pointer' }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', color: '#888' }}>丝带颜色</label>
                              <input
                                type="color"
                                value={(step as GiftStep).ribbonColor || '#FFD700'}
                                onChange={e => updateStep(step.id, { ribbonColor: e.target.value })}
                                style={{ width: '100%', height: '30px', marginTop: '4px', cursor: 'pointer' }}
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: '#888' }}>
                              祝福语显示时长: {((step as GiftStep).messageDuration || 3000) / 1000}秒
                            </label>
                            <input
                              type="range"
                              min="2000"
                              max="8000"
                              step="500"
                              value={(step as GiftStep).messageDuration || 3000}
                              onChange={e => updateStep(step.id, { messageDuration: Number(e.target.value) })}
                              style={{ width: '100%', accentColor: '#FF5722' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 语音步骤配置 */}
                      {step.type === 'voice' && (
                        <VoiceStepEditor
                          step={step as VoiceStep}
                          onUpdate={(updates) => updateStep(step.id, updates)}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 添加步骤按钮 */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px',
            padding: '8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '6px'
          }}>
            <span style={{ fontSize: '10px', color: '#888', width: '100%', marginBottom: '4px' }}>
              添加步骤:
            </span>
            {STEP_TYPES.map(({ type, label, icon, color }) => (
              <button
                key={type}
                onClick={() => addStep(type)}
                style={{
                  padding: '6px 10px',
                  background: `${color}20`,
                  border: `1px solid ${color}40`,
                  borderRadius: '4px',
                  color: color,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* 快速模板 */}
          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '10px', color: '#888' }}>快速模板:</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                onClick={() => {
                  const steps: TimelineStep[] = [
                    { id: generateId(), type: 'intro', duration: 3000, text: '献给最特别的你' },
                    ...Array.from({ length: Math.min(3, photoCount) }, (_, i) => ({
                      id: generateId(),
                      type: 'photo' as const,
                      duration: 2500,
                      photoIndex: i
                    })),
                    { id: generateId(), type: 'heart', duration: 4000, showPhoto: true, photoIndex: -1 },
                    { id: generateId(), type: 'text', duration: 3000, text: 'MERRY CHRISTMAS' },
                    { id: generateId(), type: 'tree', duration: 2000 }
                  ];
                  updateConfig({ steps });
                }}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,215,0,0.1)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: '4px',
                  color: '#FFD700',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                🎄 经典模板
              </button>
              <button
                onClick={() => {
                  const steps: TimelineStep[] = [
                    { id: generateId(), type: 'intro', duration: 2000, text: 'I Love You' },
                    { id: generateId(), type: 'heart', duration: 5000, showPhoto: true, photoIndex: 0 },
                    { id: generateId(), type: 'tree', duration: 2000 }
                  ];
                  updateConfig({ steps });
                }}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(233,30,99,0.1)',
                  border: '1px solid rgba(233,30,99,0.3)',
                  borderRadius: '4px',
                  color: '#E91E63',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                💕 浪漫模板
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
