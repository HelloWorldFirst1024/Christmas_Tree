import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { CONFIG } from '../../config';
import type { SceneState, PhotoScreenPosition, AnimationEasing, ScatterShape, GatherShape } from '../../types';

// 全局变量存储照片位置，用于捏合选择
export let photoScreenPositions: PhotoScreenPosition[] = [];

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
      const r = 25 + Math.random() * 30;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    case 'spiral': {
      const t = Math.random();
      const angle = t * Math.PI * 10;
      const r = 10 + t * 30 + Math.random() * 6;
      const y = -25 + t * 60 + (Math.random() - 0.5) * 10;
      return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    }
    case 'rain': {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 70,
        30 + Math.random() * 40,
        (Math.random() - 0.5) * 70
      );
    }
    case 'ring': {
      const angle = Math.random() * Math.PI * 2;
      const r = 25 + Math.random() * 12;
      const y = (Math.random() - 0.5) * 18;
      return new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    }
    case 'sphere':
    default:
      return new THREE.Vector3(
        (Math.random() - 0.5) * 70,
        (Math.random() - 0.5) * 70,
        (Math.random() - 0.5) * 70
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

interface PhotoOrnamentsProps {
  state: SceneState;
  selectedIndex: number | null;
  onPhotoClick?: (index: number | null) => void;
  photoPaths: string[];
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
}

export const PhotoOrnaments = ({ 
  state, 
  selectedIndex, 
  onPhotoClick, 
  photoPaths,
  easing = 'easeInOut',
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct'
}: PhotoOrnamentsProps) => {
  const textures = useTexture(photoPaths);
  const count = photoPaths.length;
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);

  useMemo(() => {
    textures.forEach((texture: THREE.Texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    });
  }, [textures]);

  const borderGeometry = useMemo(() => new THREE.PlaneGeometry(1.2, 1.5), []);
  const photoGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const chaosPos = generateScatterPosition(scatterShape);
      const h = CONFIG.tree.height;
      const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h / 2)) / h)) + 0.5;
      const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
      const gatherDelay = calculateGatherDelay(targetPos, gatherShape);

      const isBig = Math.random() < 0.2;
      const baseScale = isBig ? 2.2 : 0.8 + Math.random() * 0.6;
      const weight = 0.8 + Math.random() * 1.2;
      const borderColor = CONFIG.colors.borders[Math.floor(Math.random() * CONFIG.colors.borders.length)];

      return {
        chaosPos,
        targetPos,
        scale: baseScale,
        weight,
        textureIndex: i % textures.length,
        borderColor,
        gatherDelay,
        currentPos: chaosPos.clone(),
        currentScale: baseScale,
        chaosRotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotationSpeed: { x: (Math.random() - 0.5) * 1.0, y: (Math.random() - 0.5) * 1.0, z: (Math.random() - 0.5) * 1.0 },
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.5 + Math.random() * 0.5
      };
    });
  }, [textures, count, scatterShape, gatherShape]);

  const animSpeed = Math.max(0.5, Math.min(3, speed)) * 1.5;
  const easeFn = easingFunctions[easing] || easingFunctions.easeInOut;
  const directionRef = useRef(1); // 1=聚合, -1=散开

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    const camera = stateObj.camera;
    
    // 更新动画进度（非选中状态时使用缓动）
    const targetProgress = isFormed ? 1 : 0;
    
    // 记录动画方向
    if (targetProgress > progressRef.current) directionRef.current = 1;
    else if (targetProgress < progressRef.current) directionRef.current = -1;
    
    progressRef.current += (targetProgress - progressRef.current) * delta * animSpeed;
    const rawT = Math.max(0, Math.min(1, progressRef.current));

    groupRef.current.children.forEach((group, i) => {
      const objData = data[i];
      const isSelected = selectedIndex === i;

      let targetScale: number;

      if (isSelected) {
        // 图片移动到相机正前方（选中时使用直接 lerp）
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        const target = camera.position.clone().add(cameraDir.multiplyScalar(25));
        targetScale = 15;
        objData.currentPos.lerp(target, delta * 8);
        group.position.copy(objData.currentPos);
      } else {
        // 非选中时使用缓动函数，根据聚合延迟计算进度
        let elementT: number;
        if (directionRef.current > 0) {
          const delayedProgress = Math.max(0, Math.min(1, (rawT - objData.gatherDelay) / (1 - objData.gatherDelay + 0.001)));
          elementT = easeFn(delayedProgress);
        } else {
          const reverseDelay = Math.max(0, Math.min(1, (rawT - (1 - objData.gatherDelay - 0.3)) / (objData.gatherDelay + 0.3 + 0.001)));
          elementT = 1 - easeFn(1 - reverseDelay);
        }
        targetScale = objData.scale;
        group.position.lerpVectors(objData.chaosPos, objData.targetPos, elementT);
        objData.currentPos.copy(group.position);
      }

      if (!isSelected) {
        const screenPos = objData.currentPos.clone().project(camera);
        const screenX = (1 - screenPos.x) / 2;
        const screenY = (1 - screenPos.y) / 2;
        if (screenPos.z < 1 && screenX >= 0 && screenX <= 1 && screenY >= 0 && screenY <= 1) {
          photoScreenPositions[i] = { index: i, x: screenX, y: screenY };
        }
      }

      objData.currentScale = MathUtils.lerp(objData.currentScale, targetScale, delta * 3);
      group.scale.setScalar(objData.currentScale);

      if (isSelected) {
        group.lookAt(camera.position);
        group.rotation.y += Math.sin(time * 2) * 0.03;
      } else if (isFormed) {
        const targetLookPos = new THREE.Vector3(group.position.x * 2, group.position.y + 0.5, group.position.z * 2);
        group.lookAt(targetLookPos);
        group.rotation.x += Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.05;
        group.rotation.z += Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.05;
      } else {
        group.rotation.x += delta * objData.rotationSpeed.x;
        group.rotation.y += delta * objData.rotationSpeed.y;
        group.rotation.z += delta * objData.rotationSpeed.z;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <group
          key={i}
          scale={[obj.scale, obj.scale, obj.scale]}
          rotation={state === 'CHAOS' ? obj.chaosRotation : [0, 0, 0]}
          onClick={() => onPhotoClick?.(selectedIndex === i ? null : i)}
        >
          <group position={[0, 0, 0.015]}>
            <mesh geometry={photoGeometry}>
              <meshBasicMaterial
                map={textures[obj.textureIndex]}
                side={THREE.FrontSide}
                toneMapped={false}
              />
            </mesh>
            <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]}>
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#FFFFFF"
                emissiveIntensity={1.2}
                roughness={0.3}
                metalness={0}
                side={THREE.FrontSide}
              />
            </mesh>
          </group>
          <group position={[0, 0, -0.015]} rotation={[0, Math.PI, 0]}>
            <mesh geometry={photoGeometry}>
              <meshBasicMaterial
                map={textures[obj.textureIndex]}
                side={THREE.FrontSide}
                toneMapped={false}
              />
            </mesh>
            <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]}>
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#FFFFFF"
                emissiveIntensity={1.2}
                roughness={0.3}
                metalness={0}
                side={THREE.FrontSide}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};
