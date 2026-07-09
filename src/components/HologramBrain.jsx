import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import "../styles/HologramBrain.css";

// Scene tuning: increase these carefully on lower-powered hosting hardware.
const MODEL_SIZE = 2.55; // Normalized model width in scene units.
const MODEL_SCALE = 1; // Fine scale adjustment after normalization.
const CAMERA_POSITION = [0, 0, 7];
const CURSOR_SENSITIVITY_Y = 0.35;
const CURSOR_SENSITIVITY_X = 0.22;
const CURSOR_LERP = 0.065;
const BRAIN_OPACITY = 0.2;
const EMISSIVE_INTENSITY = 0.75;
const WIREFRAME_OPACITY = 0.28;
const BLOOM_INTENSITY = 0.6;
const HUD_RING_SIZE = 1.8;

function createHologramScene(sourceScene, material) {
  const scene = sourceScene.clone(true);
  scene.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material.clone();
    child.castShadow = false;
    child.receiveShadow = false;
  });

  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const largestSide = Math.max(size.x, size.y, size.z) || 1;
  const normalizedScale = (MODEL_SIZE / largestSide) * MODEL_SCALE;

  // Center models authored with any origin, so every GLB stays in the HUD.
  scene.position.copy(center).multiplyScalar(-normalizedScale);
  scene.scale.setScalar(normalizedScale);
  return scene;
}

function BrainModel() {
  const { scene } = useGLTF("/models/brain.glb");
  const mainMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#063b1e", emissive: "#00ff66", emissiveIntensity: EMISSIVE_INTENSITY,
    transparent: true, opacity: BRAIN_OPACITY, roughness: 0.25, metalness: 0.1,
    side: THREE.DoubleSide, depthWrite: false,
  }), []);
  const wireframeMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#00ff66", wireframe: true, transparent: true, opacity: WIREFRAME_OPACITY,
    side: THREE.DoubleSide, depthWrite: false,
  }), []);
  const { main, wireframe } = useMemo(() => ({
    main: createHologramScene(scene, mainMaterial),
    wireframe: createHologramScene(scene, wireframeMaterial),
  }), [scene, mainMaterial, wireframeMaterial]);

  return (
    <group>
      <primitive object={main} />
      {/* Scale the parent instead of overwriting the normalized GLB scale. */}
      <group scale={1.012}><primitive object={wireframe} /></group>
    </group>
  );
}

function HudRing({ radius, arc, speed, offset = 0, z = -0.15 }) {
  const ring = useRef();
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = offset + clock.getElapsedTime() * speed;
  });
  return (
    <mesh ref={ring} position={[0, 0, z]}>
      <torusGeometry args={[radius, 0.012, 6, 96, arc]} />
      <meshBasicMaterial color="#00ff66" transparent opacity={0.58} depthWrite={false} />
    </mesh>
  );
}

function HologramScene({ cursor }) {
  const rig = useRef();
  useFrame(({ clock }) => {
    if (!rig.current) return;
    const time = clock.getElapsedTime();
    const targetY = cursor.current.x * CURSOR_SENSITIVITY_Y;
    const targetX = -cursor.current.y * CURSOR_SENSITIVITY_X;
    rig.current.rotation.y = THREE.MathUtils.lerp(rig.current.rotation.y, targetY, CURSOR_LERP);
    rig.current.rotation.x = THREE.MathUtils.lerp(rig.current.rotation.x, targetX, CURSOR_LERP);
    rig.current.rotation.z = Math.sin(time * 0.7) * 0.025;
    rig.current.position.y = Math.sin(time * 1.15) * 0.1;
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight color="#00ff66" intensity={3.2} position={[2, 2, 3]} />
      <pointLight color="#00aa44" intensity={1.4} position={[-3, -1, 1]} />
      <group ref={rig}>
        <BrainModel />
      </group>
      {/* HUD is stationary; only the brain follows the cursor. */}
      <HudRing radius={HUD_RING_SIZE} arc={Math.PI * 1.45} speed={0.12} offset={0.4} />
      <HudRing radius={HUD_RING_SIZE * 1.18} arc={Math.PI * 0.82} speed={-0.08} offset={2.1} z={-0.25} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom intensity={BLOOM_INTENSITY} luminanceThreshold={0.18} mipmapBlur radius={0.55} />
      </EffectComposer>
    </>
  );
}

/** A responsive, retro green hologram brain scene. */
export default function HologramBrain({ className = "" }) {
  const cursor = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateCursor = (event) => {
      cursor.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      cursor.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener("pointermove", updateCursor, { passive: true });
    return () => window.removeEventListener("pointermove", updateCursor);
  }, []);

  return (
    <div className={`hologram-brain ${className}`.trim()} aria-label="Interactive holographic brain visualization">
      <Canvas
        className="hologram-brain__canvas"
        camera={{ position: CAMERA_POSITION, fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance", stencil: false }}
      >
        <Suspense fallback={null}><HologramScene cursor={cursor} /></Suspense>
      </Canvas>
      {/* Visual-only overlays allow the canvas to receive cursor movement. */}
      <div className="hologram-brain__scanlines" aria-hidden="true" />
    </div>
  );
}

useGLTF.preload("/models/brain.glb");
