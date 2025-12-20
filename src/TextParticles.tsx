import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface TextParticlesProps {
  text: string;
  visible: boolean;
  color?: string;
  size?: number;
  onComplete?: () => void;
}

// 简单的伪随机数生成器（基于种子）
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 检测是否移动端
const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 使用 Canvas 渲染文字并提取像素点位置
const generateTextPositionsFromCanvas = (
  text: string, 
  scale: number, 
  particleSeeds: Float32Array,
  isMobile: boolean
): Float32Array => {
  const count = particleSeeds.length;
  const targets = new Float32Array(count * 3);
  
  if (!text || text.trim() === '') {
    // 空文字，所有粒子去中心
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = 5;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  // 创建 Canvas 渲染文字
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = 5;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  // 根据文字长度和设备调整字体大小
  const baseFontSize = isMobile ? 80 : 120;
  const fontFamily = '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
  
  // 先测量文字宽度
  ctx.font = `bold ${baseFontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const rawTextWidth = metrics.width;
  
  // 计算屏幕可用宽度（Canvas 像素宽度限制）
  const maxCanvasWidth = isMobile ? 400 : 700;
  
  // 如果文字太长，缩小字体
  let fontSize = baseFontSize;
  if (rawTextWidth > maxCanvasWidth) {
    fontSize = Math.floor(baseFontSize * maxCanvasWidth / rawTextWidth);
    fontSize = Math.max(fontSize, isMobile ? 30 : 40); // 最小字体
  }
  
  // 重新测量
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const finalMetrics = ctx.measureText(text);
  const textWidth = finalMetrics.width;
  const textHeight = fontSize * 1.2;
  
  // 设置 Canvas 大小（留边距）
  const padding = 20;
  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = Math.ceil(textHeight + padding * 2);
  
  // 重新设置字体（Canvas 大小改变后需要重设）
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 绘制文字
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // 获取像素数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  // 收集所有非透明像素的位置
  const basePositions: { x: number; y: number }[] = [];
  const sampleStep = isMobile ? 3 : 2; // 采样步长，移动端稀疏一些
  
  // 3D 空间缩放系数 - 固定值，不随字体大小变化
  const spaceScale = scale * 0.1;
  
  for (let y = 0; y < canvas.height; y += sampleStep) {
    for (let x = 0; x < canvas.width; x += sampleStep) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = pixels[idx + 3];
      
      // 只取不透明的像素
      if (alpha > 128) {
        // 转换为 3D 坐标（居中，Y 轴翻转）
        const posX = (x - canvas.width / 2) * spaceScale;
        const posY = (canvas.height / 2 - y) * spaceScale;
        basePositions.push({ x: posX, y: posY });
      }
    }
  }
  
  if (basePositions.length === 0) {
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = 5;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  // 每个粒子根据自己的种子选择一个基础位置，并添加固定偏移
  for (let i = 0; i < count; i++) {
    const seed = particleSeeds[i];
    const baseIdx = Math.floor(seededRandom(seed * 1.1) * basePositions.length);
    const base = basePositions[baseIdx];
    
    // 使用种子生成固定的偏移
    const offsetX = (seededRandom(seed * 2.2) - 0.5) * scale * 0.15;
    const offsetY = (seededRandom(seed * 3.3) - 0.5) * scale * 0.15;
    const offsetZ = (seededRandom(seed * 4.4) - 0.5) * 0.3;
    
    targets[i * 3] = base.x + offsetX;
    targets[i * 3 + 1] = base.y + 5 + offsetY;
    targets[i * 3 + 2] = offsetZ;
  }
  
  return targets;
};

export const TextParticles = ({ text, visible, color = '#FFD700', size = 1 }: TextParticlesProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const initializedRef = useRef(false);
  const lastTextRef = useRef(text);
  const lastVisibleRef = useRef(visible);
  const { camera } = useThree();
  
  const count = 2000; // 粒子数量（增加以支持中文）
  const mobile = isMobileDevice();
  
  // 每个粒子的固定种子（用于动画和位置计算）
  const particleSeeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = i + 0.5; // 固定种子
    }
    return arr;
  }, []);
  
  // 随机值用于动画浮动
  const randoms = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = seededRandom(i * 5.5);
    }
    return arr;
  }, []);
  
  // 目标位置 ref（用于平滑过渡）
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(count * 3));
  
  // 初始化目标位置（只在组件挂载时执行一次）
  useEffect(() => {
    const scale = mobile ? 0.6 : 1.0;
    targetPositionsRef.current = generateTextPositionsFromCanvas(text, scale, particleSeeds, mobile);
    lastTextRef.current = text;
  }, [particleSeeds, mobile]);
  
  // 文字变化时更新目标位置 - 只在文字真正变化时才更新
  useEffect(() => {
    // 严格比较：只有当文字真正不同时才更新
    if (text !== lastTextRef.current) {
      console.log('[TextParticles] Text changed:', lastTextRef.current, '->', text);
      const scale = mobile ? 0.6 : 1.0;
      targetPositionsRef.current = generateTextPositionsFromCanvas(text, scale, particleSeeds, mobile);
      lastTextRef.current = text;
    }
  }, [text, particleSeeds, mobile]);
  
  // 当 visible 从 false 变为 true 时，确保使用最新的文字
  useEffect(() => {
    if (visible && !lastVisibleRef.current) {
      // 刚变为可见，检查文字是否需要更新
      if (text !== lastTextRef.current) {
        console.log('[TextParticles] Became visible with new text:', text);
        const scale = mobile ? 0.6 : 1.0;
        targetPositionsRef.current = generateTextPositionsFromCanvas(text, scale, particleSeeds, mobile);
        lastTextRef.current = text;
      }
    }
    lastVisibleRef.current = visible;
  }, [visible, text, particleSeeds, mobile]);
  
  useFrame((state, delta) => {
    if (!pointsRef.current || !groupRef.current) return;
    
    // 根据文字长度计算合适的距离
    const textLength = lastTextRef.current.length;
    const baseDistance = mobile ? 18 : 25;
    const distancePerChar = mobile ? 1.5 : 2;
    const finalDistance = Math.min(60, baseDistance + textLength * distancePerChar);
    
    // 计算目标位置（相机前方）
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const targetPos = camera.position.clone().add(cameraDir.multiplyScalar(finalDistance));
    
    // 首次显示时直接设置位置
    if (!initializedRef.current) {
      groupRef.current.position.copy(targetPos);
      initializedRef.current = true;
    } else if (visible) {
      groupRef.current.position.lerp(targetPos, Math.min(delta * 3, 0.15));
    }
    
    // 让文字面向相机
    groupRef.current.quaternion.copy(camera.quaternion);
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const time = state.clock.elapsedTime;
    const targets = targetPositionsRef.current;
    
    // 平滑过渡速度 - 加快以减少卡顿感
    const speed = 5.0;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 计算浮动偏移（基于时间的周期性偏移，不累加）
      const floatX = visible ? Math.sin(time * 1.5 + randoms[i] * 10) * 0.02 : 0;
      const floatY = visible ? Math.cos(time * 1.5 + randoms[i] * 10) * 0.02 : 0;
      
      // 目标位置 = 基础目标 + 浮动偏移
      const targetX = targets[i3] + floatX;
      const targetY = targets[i3 + 1] + floatY;
      const targetZ = targets[i3 + 2];
      
      // 向目标位置平滑移动
      posArray[i3] += (targetX - posArray[i3]) * delta * speed;
      posArray[i3 + 1] += (targetY - posArray[i3 + 1]) * delta * speed;
      posArray[i3 + 2] += (targetZ - posArray[i3 + 2]) * delta * speed;
    }
    
    posAttr.needsUpdate = true;
    
    // 透明度动画
    if (materialRef.current) {
      const targetOpacity = visible ? 1 : 0;
      materialRef.current.opacity += (targetOpacity - materialRef.current.opacity) * delta * 3;
    }
  });
  
  // 初始位置（用于 bufferAttribute 初始化）
  const initPositions = useMemo(() => {
    const scale = mobile ? 0.6 : 1.0;
    return generateTextPositionsFromCanvas(text, scale, particleSeeds, mobile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleSeeds, mobile]);
  
  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[initPositions.slice(), 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          color={color}
          size={(mobile ? 0.12 : 0.25) * size}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

export default TextParticles;
