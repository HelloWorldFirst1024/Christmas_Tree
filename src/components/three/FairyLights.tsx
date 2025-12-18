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
      const r = 18 + Math.random() * 22;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    case 'spiral': {
      const t = Math.random();
      const angle = t * Math.PI * 12;
      const r = 6 + t * 22 + Math.random() * 4;
      const y = -18 + t * 45 + (Math.random() - 0.5) * 6;
      return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    }
    case 'rain': {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 55,
        22 + Math.random() * 32,
        (Math.random() - 0.5) * 55
      );
    }
    case 'ring': {
      const angle = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 8;
      const y = (Math.random() - 0.5) * 12;
      return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    }
    case 'sphere':
    default:
      return new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );
  }
};

// 根据聚合形状计算延迟
const calculateGatherDelay = (targetPos: THREE.Vector3, shape: GatherShape): number => {
  const normalizedY = (targetPos.y + CONFIG.tree.height / 2) / CONFIG.tree.height;
  const normalizedX = (targetPos.x + CONFIG.tree.radius) / (2 * CONFIG.tree.radius);
  const dist = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z) / CONFIG.tree.radius;
  const angle = Math.atan2(targetPos.z, targetPos.x);
  
  switch (shape) {
    case 'stack': return normalizedY * 0.7;
    case 'spiralIn': return ((angle + Math.PI) / (2 * Math.PI) + normalizedY * 0.5) * 0.5;
    case 'implode': return (1 - dist) * 0.5;
    case 'waterfall': return (1 - normalizedY) * 0.7;
    case 'wave': return normalizedX * 0.6;
    case 'direct':
    default: return 0;
  }
};

interface FairyLightsProps {
  state: SceneState;
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
}

export const FairyLights = ({ 
  state, 
  easing = 'easeInOut', 
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct'
}: FairyLightsProps) => {
  const count = CONFIG.counts.lights;
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.8, 8, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = generateScatterPosition(scatterShape);
      const h = CONFIG.tree.height;
      const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h / 2)) / h)) + 0.3;
      const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(
        currentRadius * Math.cos(theta),
        y,
        currentRadius * Math.sin(theta)
      );
      const color = CONFIG.colors.lights[Math.floor(Math.random() * CONFIG.colors.lights.length)];
      const blinkSpeed = 2 + Math.random() * 3;
      const gatherDelay = calculateGatherDelay(targetPos, gatherShape);
      return { chaosPos, targetPos, color, blinkSpeed, gatherDelay, timeOffset: Math.random() * 100 };
    });
  }, [count, scatterShape, gatherShape]);

  const animSpeed = Math.max(0.5, Math.min(3, speed)) * 1.5;
  const easeFn = easingFunctions[easing] || easingFunctions.easeInOut;
  const directionRef = useRef(1); // 1=聚合, -1=散开

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    const targetProgress = isFormed ? 1 : 0;
    
    // 记录动画方向
    if (targetProgress > progressRef.current) directionRef.current = 1;
    else if (targetProgress < progressRef.current) directionRef.current = -1;
    
    // 平滑过渡进度
    progressRef.current += (targetProgress - progressRef.current) * delta * animSpeed;
    const rawT = Math.max(0, Math.min(1, progressRef.current));
    
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      const mesh = child as THREE.Mesh;
      
      // 根据聚合延迟计算每个元素的进度
      let elementT: number;
      if (directionRef.current > 0) {
        const delayedProgress = Math.max(0, Math.min(1, (rawT - objData.gatherDelay) / (1 - objData.gatherDelay + 0.001)));
        elementT = easeFn(delayedProgress);
      } else {
        const reverseDelay = Math.max(0, Math.min(1, (rawT - (1 - objData.gatherDelay - 0.3)) / (objData.gatherDelay + 0.3 + 0.001)));
        elementT = 1 - easeFn(1 - reverseDelay);
      }
      
      // 使用缓动函数插值位置
      mesh.position.lerpVectors(objData.chaosPos, objData.targetPos, elementT);
      const intensity = (Math.sin(time * objData.blinkSpeed + objData.timeOffset) + 1) / 2;
      if (mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isFormed ? 1 + intensity * 1.5 : 0.5 + intensity * 0.8;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <mesh key={i} position={obj.chaosPos.clone()} scale={[0.15, 0.15, 0.15]} geometry={geometry}>
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};
