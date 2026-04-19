"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function MashrabiyyaPanel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();

  const geometry = useMemo(() => {
    const w = 3.2, h = 2.2;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2);
    shape.lineTo(-w / 2, h / 2);
    shape.closePath();

    const cols = 11, rows = 7;
    const spacingX = w / cols;
    const spacingY = h / rows;
    const s = Math.min(spacingX, spacingY) * 0.36;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const xOff = r % 2 === 0 ? 0 : spacingX * 0.5;
        const cx = -w / 2 + spacingX * (c + 0.5) + xOff;
        const cy = -h / 2 + spacingY * (r + 0.5);
        if (cx < -w / 2 + s * 1.6 || cx > w / 2 - s * 1.6) continue;
        const hole = new THREE.Path();
        hole.moveTo(cx, cy + s);
        hole.lineTo(cx + s, cy);
        hole.lineTo(cx, cy - s);
        hole.lineTo(cx - s, cy);
        hole.closePath();
        shape.holes.push(hole);
      }
    }

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
    });
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const targetY = pointer.x * 0.38;
    const targetX = -pointer.y * 0.22;
    meshRef.current.rotation.y += (targetY - meshRef.current.rotation.y) * 0.05;
    meshRef.current.rotation.x += (targetX - meshRef.current.rotation.x) * 0.05;
    meshRef.current.rotation.y += Math.sin(state.clock.elapsedTime * 0.22) * 0.0006;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, -0.045]}>
      <meshStandardMaterial
        color="#3EC9D0"
        metalness={0.5}
        roughness={0.3}
        emissive="#0E4A50"
        emissiveIntensity={0.45}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Particles({ count = 220 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities, geometry } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
      velocities[i] = 0.22 + Math.random() * 0.42;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { positions, velocities, geometry };
  }, [count]);

  useFrame((_, delta) => {
    const attr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i] * delta * 0.55;
      if (arr[i * 3] > 3.6) {
        arr[i * 3] = -3.6;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#EF9F27"
        size={0.03}
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} color="#3EC9D0" />
      <directionalLight position={[-4, -3, 2]} intensity={0.55} color="#EF9F27" />
      <pointLight position={[0, 0, 3]} intensity={0.9} color="#3EC9D0" distance={9} />
      <MashrabiyyaPanel />
      <Particles />
    </>
  );
}

export function MashrabiyyaViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
      dpr={[1, 2]}
    >
      <Scene />
    </Canvas>
  );
}
