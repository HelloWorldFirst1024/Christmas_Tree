/**
 * 书信步骤显示组件
 * 实现逐字显示的手写效果
 */
import React, { useState, useEffect, useRef } from 'react';

interface LetterStepOverlayProps {
  visible: boolean;
  content: string;
  speed?: number;        // 打字速度（毫秒/字），默认 100
  fontSize?: number;     // 字体大小，默认 24
  color?: string;       // 文字颜色，默认 '#FFD700'
  onComplete?: () => void;
}

export const LetterStepOverlay: React.FC<LetterStepOverlayProps> = ({
  visible,
  content,
  speed = 100,
  fontSize = 24,
  color = '#FFD700',
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      // 重置状态
      setDisplayedText('');
      setIsComplete(false);
      indexRef.current = 0;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // 开始逐字显示
    indexRef.current = 0;
    setIsComplete(false);
    setDisplayedText('');

    const typeNextChar = () => {
      if (indexRef.current < content.length) {
        setDisplayedText(content.slice(0, indexRef.current + 1));
        indexRef.current++;
        timerRef.current = setTimeout(typeNextChar, speed);
      } else {
        setIsComplete(true);
        timerRef.current = null;
        // 延迟调用完成回调，让用户有时间看完
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }
    };

    // 延迟一小段时间后开始显示
    timerRef.current = setTimeout(typeNextChar, 200);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, content, speed, onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        padding: '40px 20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          maxWidth: 'min(90vw, 800px)',
          maxHeight: '80vh',
          background: 'rgba(20, 20, 20, 0.95)',
          border: `2px solid ${color}40`,
          borderRadius: '16px',
          padding: '40px',
          boxShadow: `0 0 40px ${color}20`,
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {/* 书信样式背景 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              repeating-linear-gradient(
                transparent,
                transparent 31px,
                rgba(255, 215, 0, 0.1) 31px,
                rgba(255, 215, 0, 0.1) 32px
              )
            `,
            pointerEvents: 'none',
            borderRadius: '16px'
          }}
        />

        {/* 文字内容 */}
        <div
          style={{
            position: 'relative',
            color: color,
            fontSize: `${fontSize}px`,
            lineHeight: '1.8',
            fontFamily: '"KaiTi", "楷体", "STKaiti", "华文楷体", serif',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textShadow: `0 0 10px ${color}40`,
            minHeight: '200px'
          }}
        >
          {displayedText}
          {/* 光标闪烁效果 */}
          {!isComplete && (
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: `${fontSize * 1.2}px`,
                background: color,
                marginLeft: '4px',
                animation: 'blink 1s infinite',
                verticalAlign: 'middle'
              }}
            />
          )}
        </div>

        {/* 完成提示 */}
        {isComplete && (
          <div
            style={{
              marginTop: '20px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
              fontStyle: 'italic'
            }}
          >
            ✉️
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};

