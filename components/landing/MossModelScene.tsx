"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function MossModel() {
  const { scene } = useGLTF("/models/moss-panel.glb");
  const ref = useRef<THREE.Group>(null);

  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    if (!ref.current) return;
    const box = new THREE.Box3().setFromObject(ref.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2.6 / maxDim;
      ref.current.scale.setScalar(scale);
      ref.current.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );
    }
  }, [cloned]);

  return (
    <group ref={ref}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload("/models/moss-panel.glb");

function LoadingMesh() {
  return (
    <mesh>
      <boxGeometry args={[1.6, 2.2, 0.12]} />
      <meshStandardMaterial color="#1A2330" wireframe />
    </mesh>
  );
}

export function MossModelViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 4.5], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 4]} intensity={1.1} color="#3EC9D0" />
      <directionalLight position={[-3, -2, 2]} intensity={0.5} color="#EF9F27" />
      <pointLight position={[0, 1, 3]} intensity={0.7} color="#3EC9D0" distance={8} />

      <Suspense fallback={<LoadingMesh />}>
        <MossModel />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.2}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI * 0.72}
      />
    </Canvas>
  );
}
