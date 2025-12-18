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
      const r = 20 + Math.random() * 25;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    case 'spiral': {
      const t = Math.random();
      const angle = t * Math.PI * 12;
      const r = 8 + t * 25 + Math.random() * 5;
      const y = -20 + t * 50 + (Math.random() - 0.5) * 8;
      return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    }
    case 'rain': {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        25 + Math.random() * 35,
        (Math.random() - 0.5) * 60
      );
    }
    case 'ring': {
      const angle = Math.random() * Math.PI * 2;
      const r = 22 + Math.random() * 10;
      const y = (Math.random() - 0.5) * 15;
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

interface ChristmasElementsProps {
  state: SceneState;
  customImages?: {
    box?: string;
    sphere?: string;
    cylinder?: string;
  };
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
}



export const ChristmasElements = ({ 
  state, 
  customImages, 
  easing = 'easeInOut', 
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct'
}: ChristmasElementsProps) => {
  const count = CONFIG.counts.elements;
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);

  // 加载自定义图片纹理
  const textures = useMemo(() => {
    const result: { box?: THREE.Texture; sphere?: THREE.Texture; cylinder?: THREE.Texture } = {};
    
    if (customImages?.box) {
      const tex = new THREE.TextureLoader().load(customImages.box);
      tex.colorSpace = THREE.SRGBColorSpace;
      result.box = tex;
    }
    if (customImages?.sphere) {
      const tex = new THREE.TextureLoader().load(customImages.sphere);
      tex.colorSpace = THREE.SRGBColorSpace;
      result.sphere = tex;
    }
    if (customImages?.cylinder) {
      const tex = new THREE.TextureLoader().load(customImages.cylinder);
      tex.colorSpace = THREE.SRGBColorSpace;
      result.cylinder = tex;
    }
    
    return result;
  }, [customImages?.box, customImages?.sphere, customImages?.cylinder]);

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const caneGeometry = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = generateScatterPosition(scatterShape);
      const h = CONFIG.tree.height;
      const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h / 2)) / h)) * 0.95;
      const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
      const gatherDelay = calculateGatherDelay(targetPos, gatherShape);

      const type = Math.floor(Math.random() * 3); // 0=box, 1=sphere, 2=cylinder
      let color;
      let scale = 1;
      if (type === 0) {
        color = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)];
        scale = 0.8 + Math.random() * 0.4;
      } else if (type === 1) {
        color = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)];
        scale = 0.6 + Math.random() * 0.4;
      } else {
        color = Math.random() > 0.5 ? CONFIG.colors.red : CONFIG.colors.white;
        scale = 0.7 + Math.random() * 0.3;
      }

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 2.0,
        y: (Math.random() - 0.5) * 2.0,
        z: (Math.random() - 0.5) * 2.0
      };
      return {
        type,
        chaosPos,
        targetPos,
        color,
        scale,
        gatherDelay,
        chaosRotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotationSpeed
      };
    });
  }, [count, scatterShape, gatherShape]);

  // 动画持续时间（秒），speed 越大越快：0.3x -> 3.3秒, 1x -> 1秒, 3x -> 0.33秒
  const duration = 1 / Math.max(0.3, Math.min(3, speed));
  const easeFn = easingFunctions[easing] || easingFunctions.easeInOut;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const targetProgress = isFormed ? 1 : 0;
    
    // 线性插值进度，基于持续时间
    const step = delta / duration;
    if (targetProgress > progressRef.current) {
      progressRef.current = Math.min(targetProgress, progressRef.current + step);
    } else if (targetProgress < progressRef.current) {
      progressRef.current = Math.max(targetProgress, progressRef.current - step);
    }
    const rawT = progressRef.current;
    
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      
      // 统一使用基于延迟的进度计算，确保打断时位置连续
      // 延迟影响：gatherDelay 大的元素在聚合时后到达，在散开时先离开
      const delay = objData.gatherDelay;
      // 将 rawT 映射到考虑延迟的进度
      let elementT: number;
      if (delay === 0) {
        elementT = easeFn(rawT);
      } else {
        // 使用 S 曲线来平滑延迟效果，避免打断时跳变
        const adjustedT = Math.max(0, Math.min(1, (rawT - delay * 0.5) / (1 - delay * 0.5)));
        elementT = easeFn(adjustedT);
      }
      
      // 使用缓动函数插值位置
      child.position.lerpVectors(objData.chaosPos, objData.targetPos, elementT);
      
      // 如果是精灵（图片），让它面向相机
      if (child instanceof THREE.Sprite) {
        // Sprite 自动面向相机
      } else {
        // 普通 mesh 继续旋转
        child.rotation.x += delta * objData.rotationSpeed.x * 0.5;
        child.rotation.y += delta * objData.rotationSpeed.y * 0.5;
        child.rotation.z += delta * objData.rotationSpeed.z * 0.5;
      }
    });
  });

  // 判断某个类型是否使用自定义图片
  const useCustomImage = (type: number) => {
    if (type === 0 && textures.box) return true;
    if (type === 1 && textures.sphere) return true;
    if (type === 2 && textures.cylinder) return true;
    return false;
  };

  const getTexture = (type: number) => {
    if (type === 0) return textures.box;
    if (type === 1) return textures.sphere;
    return textures.cylinder;
  };

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        // 使用自定义图片
        if (useCustomImage(obj.type)) {
          const texture = getTexture(obj.type);
          return (
            <sprite 
              key={i} 
              position={obj.chaosPos.clone()}
              scale={[obj.scale * 1.5, obj.scale * 1.5, 1]}
            >
              <spriteMaterial 
                map={texture} 
                transparent 
                depthWrite={false}
                opacity={0.95}
              />
            </sprite>
          );
        }
        
        // 使用默认几何体
        let geometry;
        if (obj.type === 0) geometry = boxGeometry;
        else if (obj.type === 1) geometry = sphereGeometry;
        else geometry = caneGeometry;
        
        return (
          <mesh 
            key={i} 
            position={obj.chaosPos.clone()}
            scale={[obj.scale, obj.scale, obj.scale]} 
            geometry={geometry} 
            rotation={obj.chaosRotation}
          >
            <meshStandardMaterial color={obj.color} roughness={0.3} metalness={0.4} emissive={obj.color} emissiveIntensity={0.2} />
          </mesh>
        );
      })}
    </group>
  );
};
