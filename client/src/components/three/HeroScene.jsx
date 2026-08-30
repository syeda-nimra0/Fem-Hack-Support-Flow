/**
 * HeroScene — Three.js animated particle field for the landing page hero.
 * Built with @react-three/fiber + drei.
 *
 * v2: Improved performance and visuals. Floating network of nodes
 * representing the ticket triage graph. Slow auto-rotation, reacts
 * subtly to mouse position. Colors: flat blue, no gradient.
 */
import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 180;
const SPHERE_RADIUS = 5.5;

function ParticleField() {
  const pointsRef = useRef(null);
  const linesRef = useRef(null);
  const groupRef = useRef(null);
  const { viewport } = useThree();

  // Generate particle positions on a sphere
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = SPHERE_RADIUS * (0.7 + Math.random() * 0.3);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  // Pre-compute line segments between near particles
  const lineSegments = useMemo(() => {
    const segs = [];
    const maxDist = 1.5;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = positions[i * 3];
      const iy = positions[i * 3 + 1];
      const iz = positions[i * 3 + 2];
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const jx = positions[j * 3];
        const jy = positions[j * 3 + 1];
        const jz = positions[j * 3 + 2];
        const dx = ix - jx;
        const dy = iy - jy;
        const dz = iz - jz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < maxDist) {
          segs.push(ix, iy, iz, jx, jy, jz);
        }
      }
    }
    return new Float32Array(segs);
  }, [positions]);

  const mouse = useRef({ x: 0, y: 0 });
  useThree((state) => {
    mouse.current.x = state.pointer.x * 0.3;
    mouse.current.y = state.pointer.y * 0.3;
  });

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
      groupRef.current.rotation.x += (mouse.current.y - groupRef.current.rotation.x) * 0.02;
      groupRef.current.rotation.z += (mouse.current.x * 0.3 - groupRef.current.rotation.z) * 0.02;
    }
    if (pointsRef.current) {
      const t = performance.now() * 0.001;
      pointsRef.current.material.opacity = 0.65 + Math.sin(t * 0.7) * 0.12;
    }
    if (linesRef.current) {
      const t = performance.now() * 0.001;
      linesRef.current.material.opacity = 0.08 + Math.sin(t * 0.5) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#3b82f6"
          transparent
          opacity={0.75}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lineSegments.length / 3}
            array={lineSegments}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" transparent opacity={0.1} />
      </lineSegments>
    </group>
  );
}

function CenterOrb() {
  const meshRef = useRef(null);
  const innerRef = useRef(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.18;
      meshRef.current.rotation.x += delta * 0.1;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.25;
      innerRef.current.rotation.z += delta * 0.08;
    }
  });
  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.4} />
      </mesh>
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.5} />
      <ParticleField />
      <CenterOrb />
    </Canvas>
  );
}
