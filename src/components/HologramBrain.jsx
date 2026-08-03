import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import "../styles/HologramBrain.css";

const MODEL_URL = "/models/brain.glb";

// Scene tuning: increase these carefully on lower-powered hosting hardware.
// MODEL_SIZE has to leave room for MAX_YAW/MAX_PITCH to swing the deepest
// axis into view without clipping the (square) canvas.
const MODEL_SIZE = 2.8; // Largest model dimension, in scene units.
const CAMERA_POSITION = [0, 0, 6];
const CAMERA_FOV = 34;

// The GLB is an MRI segmentation exported through Blender: -Y is anterior
// (frontal lobe), +Z is superior, X is the left/right axis. Rotating -90deg
// about X turns the frontal lobe toward the camera and stands the brain up,
// so "front" means "facing the viewer" for the rest of this file.
const ANATOMICAL_ROTATION_X = -Math.PI / 2;

// Cursor tracking. The brain turns its frontal lobe toward the pointer, so
// the angles are measured from the widget's own centre rather than the
// viewport centre - it sits in the corner, not the middle of the screen.
const MAX_YAW = 0.55;
const MAX_PITCH = 0.32;
const TRACKING_RANGE = 760; // Pointer distance (px) that maps to a full turn.
const TRACKING_LERP = 0.075;

// Touch devices have no cursor to follow, so the brain looks around on its
// own instead of sitting dead still.
const IDLE_YAW = 0.42;
const IDLE_PITCH = 0.16;

// Horizontal contour rings, mimicking MRI slices. This is what makes the
// shape readable at small sizes; a full 6.6k-triangle wireframe just reads as
// a solid green mass. Vertical rings as well would turn the silhouette into a
// wireframe globe, so the rings stay axial.
//
// The rings are shaded onto the surface rather than cut as line geometry. A
// ring is just the set of surface points at one height, so both draw the same
// curves - but a shaded phase can scroll, where baked geometry cannot.
const RING_FREQUENCY = 8.5; // Rings per scene unit; ~20 across the brain.
// Rings land about 5.4 CSS px apart on screen, so this is roughly 9 px/s.
// Anything under ~1.0 is too slow to read as motion at this size.
const RING_SCROLL_SPEED = 1.6; // Ring spacings per second, travelling upward.
const RING_OPACITY = 0.85;
const RING_DEPTH_FADE = 0.72; // How much the far side of the brain dims.

const RIM_OPACITY = 0.55;
const RIM_POWER = 2.4;
const SHELL_FILL = 0.022;

// Hologram motion.
const SCAN_DEPTH = 0.45; // Scanline contrast.
const SCAN_SCROLL_SPEED = 26; // Scanline drift, device px per second.
const SWEEP_SPEED = 0.26; // Bright band crawling along the brain's own axis.
const SWEEP_GAIN = 0.45;
const GLITCH_BASELINE = 0.025; // Always a little unstable.
const GLITCH_PEAK = 0.5;
const GLITCH_STRENGTH = 0.055; // Band displacement, in NDC.
const GLITCH_SEED_RATE = 15; // Tear pattern updates per second.

const PHOSPHOR = new THREE.Color("#00ff6a");

/** Formats a number as a GLSL float literal; GLSL rejects a bare int there. */
const glsl = (value) => (Number.isInteger(value) ? value.toFixed(1) : String(value));

/**
 * Pulls the brain out of a loaded GLB, centred and normalised. brain.glb is a
 * single mesh; a multi-mesh replacement would need merging here, and would
 * show up immediately as a brain missing pieces.
 */
function bakeGeometry(sourceScene) {
  sourceScene.updateMatrixWorld(true);

  let baked = null;
  sourceScene.traverse((child) => {
    if (!baked && child.isMesh) baked = child.geometry.clone().applyMatrix4(child.matrixWorld);
  });

  // Stand the brain up, then centre and normalise it so a future model swap
  // keeps the same on-screen size.
  baked.rotateX(ANATOMICAL_ROTATION_X);
  baked.computeBoundingBox();
  const size = baked.boundingBox.getSize(new THREE.Vector3());
  const center = baked.boundingBox.getCenter(new THREE.Vector3());
  const scale = MODEL_SIZE / (Math.max(size.x, size.y, size.z) || 1);
  baked.translate(-center.x, -center.y, -center.z);
  baked.scale(scale, scale, scale);
  baked.computeBoundingBox();
  return baked;
}

const GLITCH_CHUNK = /* glsl */ `
  uniform float uGlitchAmount;
  uniform float uGlitchSeed;

  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }

  // Tears horizontal bands sideways, the way an unstable projection slips.
  // Every pass runs the identical displacement, so the depth mask keeps
  // hiding exactly the lines it hides when the image is settled.
  vec4 glitch(vec4 clipPosition) {
    // "active" and "offset" are reserved words in GLSL ES - do not rename
    // these locals back to the obvious choices.
    float band = floor((clipPosition.y / max(clipPosition.w, 1e-4)) * 9.0);
    float torn = step(1.0 - uGlitchAmount, hash11(band * 7.3 + uGlitchSeed));
    float slip = (hash11(band * 13.1 + uGlitchSeed) - 0.5) * ${glsl(GLITCH_STRENGTH)};
    clipPosition.x += torn * slip * clipPosition.w;
    return clipPosition;
  }
`;

const SCANLINE_CHUNK = /* glsl */ `
  uniform float uScanPeriod;
  uniform float uScanScroll;
  uniform float uSweep;
  uniform float uFlicker;

  float crtMask() {
    float phase = fract((gl_FragCoord.y + uScanScroll) / uScanPeriod);
    return mix(${glsl(1 - SCAN_DEPTH)}, 1.0, step(0.35, phase)) * uFlicker;
  }

  // A soft band crawling along the brain's own vertical axis. Built out of
  // fract() so it wraps with no seam, and keyed to model space so it rides
  // the brain as it turns instead of sliding across the screen.
  float scanBand(float modelY) {
    float phase = fract(modelY * 0.8 - uSweep);
    return 1.0 + ${glsl(SWEEP_GAIN)} * exp(-pow((phase - 0.5) * 5.0, 2.0));
  }
`;

/** Depth-only pass, so rings on the far side of the brain stay hidden. */
function createOccluderMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    colorWrite: false,
    depthWrite: true,
    side: THREE.DoubleSide,
    // Nudges the mask away from the camera so it does not z-fight the very
    // rings it is there to occlude.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    vertexShader: /* glsl */ `
      ${GLITCH_CHUNK}
      void main() {
        gl_Position = glitch(projectionMatrix * modelViewMatrix * vec4(position, 1.0));
      }
    `,
    fragmentShader: /* glsl */ `
      void main() { gl_FragColor = vec4(0.0); }
    `,
  });
}

/**
 * The whole visible hologram: silhouette glow plus the scrolling contour
 * rings, shaded onto the brain's surface in one pass.
 */
function createShellMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    vertexShader: /* glsl */ `
      ${GLITCH_CHUNK}
      uniform vec3 uRadii;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vModelY;
      varying float vDepth;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        // A cortex is far too folded for its real normals to give a clean
        // fresnel - every gyrus lights up. Treating the brain as the ellipsoid
        // it roughly is yields a smooth normal field, so the glow tracks the
        // silhouette instead of the wrinkles.
        vNormal = normalize(normalMatrix * normalize(position / uRadii));
        vView = normalize(-viewPosition.xyz);
        vModelY = position.y;
        vDepth = -viewPosition.z;
        gl_Position = glitch(projectionMatrix * viewPosition);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uRingScroll;
      ${SCANLINE_CHUNK}
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vModelY;
      varying float vDepth;

      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(vView)));
        float rim = pow(1.0 - facing, ${glsl(RIM_POWER)});

        // Rings are the surface points at each height, so subtracting a
        // moving phase slides them up the brain while they stay glued to it.
        float cycle = vModelY * ${glsl(RING_FREQUENCY)} - uRingScroll;
        float gap = fract(cycle);
        float toRing = min(gap, 1.0 - gap);
        // Taking the line width from the screen-space gradient keeps it about
        // a pixel wherever the surface tilts, and lets rings fade out across
        // plateaus rather than flooding them the way a fixed width would on a
        // cortex this folded.
        float width = fwidth(cycle) * 1.1;
        float ring = 1.0 - smoothstep(0.0, max(width, 1e-5), toRing);
        // Past about one ring per pixel the pattern cannot be resolved, and a
        // plain width test floods those areas solid - the underside of the
        // cerebellum and the steep shoulders. Fade the rings out as they reach
        // that limit and let the rim glow carry the form instead.
        ring *= 1.0 - smoothstep(0.32, 0.5, width);

        // Rings further from the camera dim, which sells the volume far
        // better than lines of equal weight.
        float depth = clamp((vDepth - 4.6) / 2.8, 0.0, 1.0);
        float rings = ring * ${glsl(RING_OPACITY)} * mix(1.0, ${glsl(1 - RING_DEPTH_FADE)}, depth);

        float intensity =
          (rim * ${glsl(RIM_OPACITY)} + ${glsl(SHELL_FILL)} + rings) * crtMask() * scanBand(vModelY);
        gl_FragColor = vec4(uColor * intensity, intensity);
      }
    `,
  });
}

function BrainModel({ uniforms }) {
  const { scene } = useGLTF(MODEL_URL);

  const parts = useMemo(() => {
    const geometry = bakeGeometry(scene);
    const radii = geometry.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    return {
      geometry,
      occluder: createOccluderMaterial(uniforms),
      shell: createShellMaterial({ ...uniforms, uRadii: { value: radii } }),
    };
  }, [scene, uniforms]);

  useEffect(
    () => () => {
      parts.geometry.dispose();
      parts.occluder.dispose();
      parts.shell.dispose();
    },
    [parts]
  );

  return (
    <group>
      <mesh geometry={parts.geometry} material={parts.occluder} renderOrder={0} />
      <mesh geometry={parts.geometry} material={parts.shell} renderOrder={1} />
    </group>
  );
}

/** Rising-edge pulse: 1 at the start of each period, decaying to 0 over `width`. */
function burst(time, period, width) {
  const phase = time % period;
  return phase < width ? 1 - phase / width : 0;
}

function HologramScene({ pointer, uniforms, reducedMotion }) {
  const rig = useRef();

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();

    if (reducedMotion) {
      uniforms.uGlitchAmount.value = 0;
      uniforms.uFlicker.value = 1;
    } else {
      // Wrap everything that feeds fract()/hash. The pattern is periodic, so
      // this is invisible, and it keeps the floats small however long the tab
      // is left open.
      uniforms.uScanScroll.value = -((time * SCAN_SCROLL_SPEED) % uniforms.uScanPeriod.value);
      uniforms.uSweep.value = (time * SWEEP_SPEED) % 1;
      uniforms.uRingScroll.value = (time * RING_SCROLL_SPEED) % 1;
      // Two periods that do not line up, so the tearing never settles into a
      // countable rhythm.
      const tear = Math.max(burst(time, 3.7, 0.16), burst(time, 5.3, 0.09));
      uniforms.uGlitchAmount.value = GLITCH_BASELINE + tear * GLITCH_PEAK;
      uniforms.uGlitchSeed.value = Math.floor(time * GLITCH_SEED_RATE) % 1024;
      uniforms.uFlicker.value = 1 - tear * 0.22 + Math.sin(time * 23.1) * 0.025;
    }

    if (!rig.current) return;

    // Frame-rate independent easing, so a 120Hz display doesn't track twice
    // as fast as a 60Hz one.
    const ease = 1 - Math.pow(1 - TRACKING_LERP, Math.min(delta, 0.1) * 60);
    let targetYaw;
    let targetPitch;
    if (pointer.current.active) {
      // Pointer offsets are in screen space (y grows downward), which already
      // matches the sign of a pitch rotation about X - no negation.
      targetYaw = pointer.current.x * MAX_YAW;
      targetPitch = pointer.current.y * MAX_PITCH;
    } else {
      targetYaw = Math.sin(time * 0.32) * IDLE_YAW;
      targetPitch = Math.sin(time * 0.23 + 1.1) * IDLE_PITCH;
    }
    rig.current.rotation.y = THREE.MathUtils.lerp(rig.current.rotation.y, targetYaw, ease);
    rig.current.rotation.x = THREE.MathUtils.lerp(rig.current.rotation.x, targetPitch, ease);

    if (reducedMotion) return;
    rig.current.rotation.z = Math.sin(time * 0.6) * 0.02;
    rig.current.position.y = Math.sin(time * 1.1) * 0.045;
  });

  return (
    <group ref={rig}>
      <BrainModel uniforms={uniforms} />
    </group>
  );
}

/** A small, retro green hologram brain that watches the cursor. */
export default function HologramBrain({ className = "" }) {
  const container = useRef(null);
  const pointer = useRef({ x: 0, y: 0, active: false });
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const uniforms = useMemo(
    () => ({
      uColor: { value: PHOSPHOR },
      uScanPeriod: { value: 3 },
      uScanScroll: { value: 0 },
      uSweep: { value: 0 },
      uRingScroll: { value: 0 },
      uFlicker: { value: 1 },
      uGlitchAmount: { value: GLITCH_BASELINE },
      uGlitchSeed: { value: 0 },
    }),
    []
  );

  useEffect(() => {
    let bounds = null;
    const measure = () => {
      bounds = container.current ? container.current.getBoundingClientRect() : null;
      uniforms.uScanPeriod.value = 3 * Math.min(window.devicePixelRatio || 1, 2);
    };
    // Reading the rect on every scroll event would force layout on a frame
    // that is already busy; drop it instead and re-measure on the next move.
    const invalidate = () => {
      bounds = null;
    };

    const track = (event) => {
      // Touch "movement" is a drag, not a cursor; following it is jerky and
      // leaves the brain frozen wherever the finger lifted.
      if (event.pointerType === "touch") return;
      if (!bounds) measure();
      if (!bounds || !bounds.width) return;
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      pointer.current.x = THREE.MathUtils.clamp((event.clientX - centerX) / TRACKING_RANGE, -1, 1);
      pointer.current.y = THREE.MathUtils.clamp((event.clientY - centerY) / TRACKING_RANGE, -1, 1);
      pointer.current.active = true;
    };

    measure();
    window.addEventListener("pointermove", track, { passive: true });
    window.addEventListener("resize", measure);
    // The widget is fixed on desktop but flows with the page on mobile.
    window.addEventListener("scroll", invalidate, { passive: true });
    return () => {
      window.removeEventListener("pointermove", track);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", invalidate);
    };
  }, [uniforms]);

  return (
    <div ref={container} className={`hologram-brain ${className}`.trim()} aria-hidden="true">
      <Canvas
        className="hologram-brain__canvas"
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      >
        <Suspense fallback={null}>
          <HologramScene pointer={pointer} uniforms={uniforms} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
