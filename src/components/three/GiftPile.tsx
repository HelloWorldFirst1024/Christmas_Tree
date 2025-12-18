import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../config';
import type { SceneState, AnimationEasing, ScatterShape, GatherShape } from '../../types';

// 缓动函数
const easingFunctions: Record<AnimationEasing, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1; return n1 * t * t + 0.984375;
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  }
};

// 根据散开形状生成位置
const generateScatterPosition = (shape: ScatterShape): THREE.Vector3 => {
  switch (shape) {
    case 'explosion': {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 15 + Math.random() * 20;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) - 5,
        r * Math.cos(phi)
      );
    }
    case 'spiral': {
      const t = Math.random();
      const angle = t * Math.PI * 8;
      const r = 10 + t * 20 + Math.random() * 5;
      const y = -15 + t * 30 + (Math.random() - 0.5) * 8;
      return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    }
    case 'rain': {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 45,
        20 + Math.random() * 25,
        (Math.random() - 0.5) * 45
      );
    }
    case 'ring': {
      const angle = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 8;
      const y = (Math.random() - 0.5) * 10 - 5;
      return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    }
    case 'sphere':
    default:
      return new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );
  }
};

// 根据聚合形状计算延迟（礼物堆在底部，使用简化版）
const calculateGatherDelay = (pos: THREE.Vector3, shape: GatherShape): number => {
  const normalizedX = (pos.x + 10) / 20;
  const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z) / 10;
  const angle = Math.atan2(pos.z, pos.x);
  
  switch (shape) {
    case 'stack': return 0; // 礼物堆本身就在底部
    case 'spiralIn': return ((angle + Math.PI) / (2 * Math.PI)) * 0.5;
    case 'implode': return (1 - dist) * 0.4;
    case 'waterfall': return 0.6; // 礼物堆最后落下
    case 'wave': return normalizedX * 0.5;
    case 'direct':
    default: return 0;
  }
};

interface GiftPileProps {
  state: SceneState;
  count?: number;
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
}

export const GiftPile = ({ 
  state, 
  count = 18,
  easing = 'easeInOut',
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct'
}: GiftPileProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);

  const gifts = useMemo(() => {
    const items: {
      pos: THREE.Vector3;
      chaosPos: THREE.Vector3;
      scale: number;
      color: string;
      rotation: THREE.Euler;
      gatherDelay: number;
    }[] = [];
    const colors = CONFIG.colors.giftColors;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -CONFIG.tree.height / 2 - 1 + Math.random() * 1.5;
      const pos = new THREE.Vector3(x, y, z);

      items.push({
        pos,
        chaosPos: generateScatterPosition(scatterShape),
        scale: 0.8 + Math.random() * 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: new THREE.Euler(0, Math.random() * Math.PI, 0),
        gatherDelay: calculateGatherDelay(pos, gatherShape)
      });
    }
    return items;
  }, [count, scatterShape, gatherShape]);

  const animSpeed = Math.max(0.5, Math.min(3, speed)) * 1.5;
  const easeFn = easingFunctions[easing] || easingFunctions.easeInOut;
  const directionRef = useRef(1); // 1=聚合, -1=散开

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const targetProgress = isFormed ? 1 : 0;
    
    // 记录动画方向
    if (targetProgress > progressRef.current) directionRef.current = 1;
    else if (targetProgress < progressRef.current) directionRef.current = -1;
    
    // 平滑过渡进度
    progressRef.current += (targetProgress - progressRef.current) * delta * animSpeed;
    const rawT = Math.max(0, Math.min(1, progressRef.current));
    
    groupRef.current.children.forEach((child, i) => {
      const gift = gifts[i];
      
      // 根据聚合延迟计算每个元素的进度
      let elementT: number;
      if (directionRef.current > 0) {
        const delayedProgress = Math.max(0, Math.min(1, (rawT - gift.gatherDelay) / (1 - gift.gatherDelay + 0.001)));
        elementT = easeFn(delayedProgress);
      } else {
        const reverseDelay = Math.max(0, Math.min(1, (rawT - (1 - gift.gatherDelay - 0.3)) / (gift.gatherDelay + 0.3 + 0.001)));
        elementT = 1 - easeFn(1 - reverseDelay);
      }
      
      // 使用缓动函数插值位置
      child.position.lerpVectors(gift.chaosPos, gift.pos, elementT);
    });
  });

  return (
    <group ref={groupRef}>
      {gifts.map((gift, i) => (
        <group key={i} position={gift.chaosPos} rotation={gift.rotation} scale={gift.scale}>
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={gift.color} roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.15, 1.02, 1.02]} />
            <meshStandardMaterial color={CONFIG.colors.gold} roughness={0.2} metalness={0.6} emissive={CONFIG.colors.gold} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[1.02, 0.15, 1.02]} />
            <meshStandardMaterial color={CONFIG.colors.gold} roughness={0.2} metalness={0.6} emissive={CONFIG.colors.gold} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color={CONFIG.colors.gold} roughness={0.2} metalness={0.6} emissive={CONFIG.colors.gold} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
