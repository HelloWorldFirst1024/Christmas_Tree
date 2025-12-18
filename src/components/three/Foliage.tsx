import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import * as random from 'maath/random';
import { CONFIG } from '../../config';
import { getTreePosition } from '../../utils/helpers';
import type { SceneState, AnimationEasing, ScatterShape, GatherShape } from '../../types';

// 缓动函数 GLSL 代码
const easingFunctions = {
  linear: 'float ease(float t) { return t; }',
  easeIn: 'float ease(float t) { return t * t * t; }',
  easeOut: 'float ease(float t) { return 1.0 - pow(1.0 - t, 3.0); }',
  easeInOut: 'float ease(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }',
  bounce: `float ease(float t) {
    float n1 = 7.5625;
    float d1 = 2.75;
    if (t < 1.0 / d1) { return n1 * t * t; }
    else if (t < 2.0 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    else if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    else { t -= 2.625 / d1; return n1 * t * t + 0.984375; }
  }`,
  elastic: `float ease(float t) {
    if (t == 0.0 || t == 1.0) return t;
    return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * 2.0943951) + 1.0;
  }`
};

// 创建带有指定缓动函数的 Shader Material
// uProgress: 0-1 表示聚合进度，uDirection: 1=聚合中, -1=散开中
// aGatherDelay: 每个粒子的聚合延迟（用于实现搭积木等效果）
const createFoliageMaterial = (easing: AnimationEasing) => {
  const easingCode = easingFunctions[easing] || easingFunctions.easeInOut;
  
  return shaderMaterial(
    { uTime: 0, uColor: new THREE.Color(CONFIG.colors.emerald), uProgress: 0 },
    `uniform float uTime; uniform float uProgress;
    attribute vec3 aTargetPos; attribute float aRandom; attribute float aGatherDelay;
    varying vec2 vUv; varying float vMix;
    ${easingCode}
    void main() {
      vUv = uv;
      vec3 noise = vec3(sin(uTime * 1.5 + position.x), cos(uTime + position.y), sin(uTime * 1.5 + position.z)) * 0.15;
      
      // 统一使用基于延迟的进度计算，确保打断时位置连续
      float adjustedT;
      if (aGatherDelay < 0.001) {
        adjustedT = uProgress;
      } else {
        adjustedT = clamp((uProgress - aGatherDelay * 0.5) / (1.0 - aGatherDelay * 0.5 + 0.001), 0.0, 1.0);
      }
      float t = ease(adjustedT);
      
      vec3 finalPos = mix(position, aTargetPos + noise, t);
      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_PointSize = (60.0 * (1.0 + aRandom)) / -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
      vMix = t;
    }`,
    `uniform vec3 uColor; varying float vMix;
    void main() {
      float r = distance(gl_PointCoord, vec2(0.5)); if (r > 0.5) discard;
      vec3 finalColor = mix(uColor * 0.3, uColor * 1.2, vMix);
      gl_FragColor = vec4(finalColor, 1.0);
    }`
  );
};

// 预创建所有缓动类型的材质
const FoliageMaterialLinear = createFoliageMaterial('linear');
const FoliageMaterialEaseIn = createFoliageMaterial('easeIn');
const FoliageMaterialEaseOut = createFoliageMaterial('easeOut');
const FoliageMaterialEaseInOut = createFoliageMaterial('easeInOut');
const FoliageMaterialBounce = createFoliageMaterial('bounce');
const FoliageMaterialElastic = createFoliageMaterial('elastic');

extend({ 
  FoliageMaterialLinear,
  FoliageMaterialEaseIn,
  FoliageMaterialEaseOut,
  FoliageMaterialEaseInOut,
  FoliageMaterialBounce,
  FoliageMaterialElastic
});

interface FoliageProps {
  state: SceneState;
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
}

// 根据散开形状生成初始位置
const generateScatterPositions = (count: number, shape: ScatterShape): Float32Array => {
  const positions = new Float32Array(count * 3);
  
  switch (shape) {
    case 'explosion': {
      // 爆炸式：从中心向外辐射
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 15 + Math.random() * 20; // 距离中心 15-35
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      break;
    }
    case 'spiral': {
      // 螺旋式：螺旋上升分布
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 12; // 6圈螺旋
        const r = 5 + t * 20 + Math.random() * 3;
        const y = -15 + t * 40 + (Math.random() - 0.5) * 5;
        positions[i * 3] = r * Math.cos(angle);
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = r * Math.sin(angle);
      }
      break;
    }
    case 'rain': {
      // 雨滴式：从上方飘落
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 50;
        const y = 20 + Math.random() * 30; // 在上方
        const z = (Math.random() - 0.5) * 50;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      break;
    }
    case 'ring': {
      // 环形：环绕分布
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 18 + Math.random() * 8; // 环半径 18-26
        const y = (Math.random() - 0.5) * 10; // 垂直分布
        const thickness = (Math.random() - 0.5) * 4; // 环厚度
        positions[i * 3] = (r + thickness) * Math.cos(angle);
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = (r + thickness) * Math.sin(angle);
      }
      break;
    }
    case 'sphere':
    default: {
      // 球形：默认随机球形分布
      const spherePoints = random.inSphere(new Float32Array(count * 3), { radius: 25 }) as Float32Array;
      for (let i = 0; i < count * 3; i++) {
        positions[i] = spherePoints[i];
      }
      break;
    }
  }
  
  return positions;
};

export const Foliage = ({ state, easing = 'easeInOut', speed = 1, scatterShape = 'sphere', gatherShape = 'direct' }: FoliageProps) => {
  const materialRef = useRef<any>(null);
  
  const { positions, targetPositions, randoms, gatherDelays } = useMemo(() => {
    const count = CONFIG.counts.foliage;
    const positions = generateScatterPositions(count, scatterShape);
    const targetPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const gatherDelays = new Float32Array(count); // 聚合延迟
    
    for (let i = 0; i < count; i++) {
      const [tx, ty, tz] = getTreePosition();
      targetPositions[i * 3] = tx;
      targetPositions[i * 3 + 1] = ty;
      targetPositions[i * 3 + 2] = tz;
      randoms[i] = Math.random();
      
      // 根据聚合形状计算延迟
      const normalizedY = (ty + CONFIG.tree.height / 2) / CONFIG.tree.height; // 0-1，底部到顶部
      switch (gatherShape) {
        case 'stack':
          // 搭积木：从下往上，底部先到达
          gatherDelays[i] = normalizedY * 0.7;
          break;
        case 'spiralIn':
          // 螺旋聚合：根据角度和高度
          const angle = Math.atan2(tz, tx);
          gatherDelays[i] = ((angle + Math.PI) / (2 * Math.PI) + normalizedY * 0.5) * 0.5;
          break;
        case 'implode':
          // 向心收缩：外围先动，中心后动
          const dist = Math.sqrt(tx * tx + tz * tz) / CONFIG.tree.radius;
          gatherDelays[i] = (1 - dist) * 0.5;
          break;
        case 'waterfall':
          // 瀑布：从上往下
          gatherDelays[i] = (1 - normalizedY) * 0.7;
          break;
        case 'wave':
          // 波浪：从一侧扫到另一侧
          const normalizedX = (tx + CONFIG.tree.radius) / (2 * CONFIG.tree.radius);
          gatherDelays[i] = normalizedX * 0.6;
          break;
        case 'direct':
        default:
          gatherDelays[i] = 0;
          break;
      }
    }
    return { positions, targetPositions, randoms, gatherDelays };
  }, [scatterShape, gatherShape]);

  // 动画持续时间（秒），speed 越大越快：0.3x -> 3.3秒, 1x -> 1秒, 3x -> 0.33秒
  const duration = 1 / Math.max(0.3, Math.min(3, speed));

  useFrame((rootState, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = rootState.clock.elapsedTime;
      const targetProgress = state === 'FORMED' ? 1 : 0;
      const currentProgress = materialRef.current.uProgress;
      
      // 线性插值进度，基于持续时间
      const step = delta / duration;
      if (targetProgress > currentProgress) {
        materialRef.current.uProgress = Math.min(targetProgress, currentProgress + step);
      } else if (targetProgress < currentProgress) {
        materialRef.current.uProgress = Math.max(targetProgress, currentProgress - step);
      }
    }
  });

  // 根据缓动类型渲染对应材质
  const renderMaterial = () => {
    const props = { ref: materialRef, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
    switch (easing) {
      case 'linear':
        // @ts-ignore
        return <foliageMaterialLinear {...props} />;
      case 'easeIn':
        // @ts-ignore
        return <foliageMaterialEaseIn {...props} />;
      case 'easeOut':
        // @ts-ignore
        return <foliageMaterialEaseOut {...props} />;
      case 'bounce':
        // @ts-ignore
        return <foliageMaterialBounce {...props} />;
      case 'elastic':
        // @ts-ignore
        return <foliageMaterialElastic {...props} />;
      case 'easeInOut':
      default:
        // @ts-ignore
        return <foliageMaterialEaseInOut {...props} />;
    }
  };

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPos" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
        <bufferAttribute attach="attributes-aGatherDelay" args={[gatherDelays, 1]} />
      </bufferGeometry>
      {renderMaterial()}
    </points>
  );
};
