import React, { useEffect, useCallback } from 'react';
import { X, Check, Copy, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

// 弹窗类型
export type ModalType = 'alert' | 'confirm' | 'share' | 'error';

export interface ModalButton {
  text: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}

export interface ModalProps {
  visible: boolean;
  type?: ModalType;
  title?: string;
  message?: string;
  shareUrl?: string;
  buttons?: ModalButton[];
  onClose: () => void;
  // 分享弹窗专用
  shareInfo?: {
    shareId: string;
    expiresAt: number;
    canEdit: boolean;
    onCopy: () => void;
    onDelete?: () => void;
    onRefresh?: () => void;
  };
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  type = 'alert',
  title,
  message,
  shareUrl,
  buttons,
  onClose,
  shareInfo
}) => {
  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  // 计算剩余天数
  const getRemainingDays = (expiresAt: number) => {
    const days = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
    return days > 0 ? days : 0;
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button onClick={onClose} style={closeButtonStyle}>
          <X size={18} />
        </button>

        {/* 标题 */}
        {title && (
          <div style={titleStyle}>
            {type === 'error' && <AlertCircle size={20} style={{ color: '#ff6b6b' }} />}
            {title}
          </div>
        )}

        {/* 消息 */}
        {message && (
          <div style={messageStyle}>
            {message.split(/(https?:\/\/[^\s\)]+)/g).map((part, i) => {
              if (part.match(/^https?:\/\//)) {
                return (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#9EFFE0', textDecoration: 'underline' }}
                  >
                    {part}
                  </a>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}

        {/* 分享链接 */}
        {shareUrl && (
          <div style={shareUrlContainerStyle}>
            <input
              type="text"
              value={shareUrl}
              readOnly
              style={shareUrlInputStyle}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={shareInfo?.onCopy}
              style={copyButtonStyle}
              title="复制链接"
            >
              <Copy size={16} />
            </button>
          </div>
        )}

        {/* 分享信息 */}
        {shareInfo && (
          <div style={shareInfoStyle}>
            <div style={infoRowStyle}>
              <span style={{ color: '#888' }}>分享 ID:</span>
              <span style={{ color: '#FFD700' }}>{shareInfo.shareId}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={{ color: '#888' }}>有效期:</span>
              <span style={{ color: getRemainingDays(shareInfo.expiresAt) <= 1 ? '#ff6b6b' : '#4ade80' }}>
                还剩 {getRemainingDays(shareInfo.expiresAt)} 天
              </span>
            </div>
            
            {shareInfo.canEdit && (
              <div style={actionButtonsStyle}>
                {shareInfo.onRefresh && (
                  <button onClick={shareInfo.onRefresh} style={actionButtonStyle}>
                    <RefreshCw size={14} /> 续期 7 天
                  </button>
                )}
                {shareInfo.onDelete && (
                  <button onClick={shareInfo.onDelete} style={{ ...actionButtonStyle, ...dangerButtonStyle }}>
                    <Trash2 size={14} /> 删除分享
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 按钮 */}
        {buttons && buttons.length > 0 && (
          <div style={buttonsContainerStyle}>
            {buttons.map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.onClick}
                style={{
                  ...buttonStyle,
                  ...(btn.primary ? primaryButtonStyle : {}),
                  ...(btn.danger ? dangerButtonStyle : {})
                }}
              >
                {btn.primary && <Check size={16} />}
                {btn.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 样式
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'rgba(20, 20, 20, 0.98)',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '420px',
  width: '100%',
  position: 'relative',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'none',
  border: 'none',
  color: '#666',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#FFD700',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#ccc',
  lineHeight: '1.6',
  marginBottom: '16px',
  whiteSpace: 'pre-wrap'
};

const shareUrlContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '16px'
};

const shareUrlInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none'
};

const copyButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  backgroundColor: '#FFD700',
  border: 'none',
  borderRadius: '6px',
  color: '#000',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const shareInfoStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '16px'
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  marginBottom: '8px'
};

const actionButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
};

const actionButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  backgroundColor: 'rgba(255, 215, 0, 0.2)',
  border: '1px solid rgba(255, 215, 0, 0.4)',
  borderRadius: '6px',
  color: '#FFD700',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px'
};

const buttonsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  justifyContent: 'flex-end'
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#FFD700',
  border: '1px solid #FFD700',
  color: '#000'
};

const dangerButtonStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 107, 107, 0.2)',
  border: '1px solid rgba(255, 107, 107, 0.4)',
  color: '#ff6b6b'
};

export default Modal;
