import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PerspectiveCamera } from 'three';
import { useAvatarStore, BACKGROUND_OPTIONS, type CameraPresetName } from '../store/avatarStore';
import { buildAvatarScene, type BuiltAvatar } from '../avatar/AvatarBuilder';
import { applyExpression } from '../avatar/ExpressionController';
import { applyAnimationFrame, applyTPose } from '../avatar/AnimationController';
import { disposeObject3D } from '../avatar/AvatarLoader';
import { preloadChibiBaseBody, getChibiBaseBody } from '../avatar/ChibiBaseBody';
import { preloadRichBody, getRichBody } from '../avatar/RichBodyModel';
import type { AvatarConfig } from '../types/avatar';

/** Tracks whether a lazily-preloaded body asset has finished downloading,
 * so callers can trigger a rebuild once it becomes available. */
function useAssetReady(preload: () => Promise<unknown>, isReady: () => boolean): boolean {
  const [ready, setReady] = useState(isReady);
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    preload()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        // Asset failed to load (offline, 404, …) — buildAvatarScene falls
        // back to the next tier, so just stop waiting for this one.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return ready;
}

const DEFAULT_TARGET: [number, number, number] = [0, 0.3, 0];

// All presets keep the camera within ~1.1m of the target and vary the field
// of view instead of the distance to frame close-ups vs. full-body shots.
const CAMERA_PRESETS: Record<
  CameraPresetName,
  { position: [number, number, number]; target: [number, number, number]; fov: number }
> = {
  front: { position: [0, 0.34, 1.05], target: DEFAULT_TARGET, fov: 62 },
  back: { position: [0, 0.34, -1.05], target: DEFAULT_TARGET, fov: 62 },
  left: { position: [-1.05, 0.34, 0], target: DEFAULT_TARGET, fov: 62 },
  right: { position: [1.05, 0.34, 0], target: DEFAULT_TARGET, fov: 62 },
  full: { position: [0, 0.32, 1.1], target: [0, 0.24, 0], fov: 70 },
  face: { position: [0, 0.63, 1.05], target: [0, 0.63, 0], fov: 34 },
};

export let exportedFrameCanvas: HTMLCanvasElement | null = null;

function AvatarModel({ config, onStats }: { config: AvatarConfig; onStats: (b: BuiltAvatar) => void }) {
  const clockStart = useRef(performance.now());
  const baseBodyReady = useAssetReady(preloadChibiBaseBody, () => !!getChibiBaseBody());
  const richBodyReady = useAssetReady(preloadRichBody, () => !!getRichBody());

  const structuralKey = useMemo(
    () => JSON.stringify({ parts: config.parts, colors: config.colors, baseBodyReady, richBodyReady }),
    [config.parts, config.colors, baseBodyReady, richBodyReady],
  );

  const built = useMemo(() => {
    const result = buildAvatarScene(config);
    onStats(result);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralKey]);

  // Dispose GPU resources only for a *replaced* build, never the one still
  // being rendered. A naive `useEffect(() => () => dispose(built), [built])`
  // breaks under StrictMode: React deliberately mounts, cleans up, and
  // re-mounts each effect once in dev to surface exactly this kind of bug,
  // which would otherwise dispose the materials our (unchanged) `built`
  // object is still using and render solid garbage.
  const previousBuiltRef = useRef<BuiltAvatar | null>(null);
  useEffect(() => {
    const previous = previousBuiltRef.current;
    if (previous && previous !== built) disposeObject3D(previous.root);
    previousBuiltRef.current = built;
  }, [built]);

  const animation = useAvatarStore((s) => s.animation);
  const tPose = useAvatarStore((s) => s.tPose);

  useFrame(() => {
    const expression = useAvatarStore.getState().config.expression;
    applyExpression(built.expressionTargets, expression);

    if (tPose) {
      applyTPose(built.bones, built.root);
    } else if (animation) {
      const t = (performance.now() - clockStart.current) / 1000;
      applyAnimationFrame(built.bones, built.root, animation, t);
    }
  });

  return <primitive object={built.root} />;
}

function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const cameraRequest = useAvatarStore((s) => s.cameraRequest);
  const clearCameraRequest = useAvatarStore((s) => s.clearCameraRequest);

  useEffect(() => {
    if (!cameraRequest) return;
    const preset = CAMERA_PRESETS[cameraRequest];
    camera.position.set(...preset.position);
    if ('fov' in camera) {
      (camera as PerspectiveCamera).fov = preset.fov;
      (camera as PerspectiveCamera).updateProjectionMatrix();
    }
    controlsRef.current?.target.set(...preset.target);
    controlsRef.current?.update();
    clearCameraRequest();
  }, [cameraRequest, camera, clearCameraRequest]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={DEFAULT_TARGET}
      minDistance={0.3}
      maxDistance={2.2}
      enableDamping
      dampingFactor={0.12}
    />
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff6fb', '#8a7a9a', 0.6]} />
      <directionalLight
        position={[1.2, 1.8, 1.4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-1.2, 0.6, -0.8]} intensity={0.3} />
    </>
  );
}

function CanvasRefGrabber() {
  const { gl } = useThree();
  useEffect(() => {
    exportedFrameCanvas = gl.domElement;
    return () => {
      exportedFrameCanvas = null;
    };
  }, [gl]);
  return null;
}

interface DebugStats {
  triangles: number;
  materials: number;
  textures: number;
  drawCalls: number;
  fps: number;
}

function DebugOverlayReader({ onUpdate }: { onUpdate: (s: Partial<DebugStats>) => void }) {
  const { gl } = useThree();
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (now - lastTime.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - lastTime.current));
      onUpdate({ fps, drawCalls: gl.info.render.calls });
      frames.current = 0;
      lastTime.current = now;
    }
  });
  return null;
}

export default function AvatarViewer() {
  const config = useAvatarStore((s) => s.config);
  const backgroundId = useAvatarStore((s) => s.backgroundId);
  const debugOverlay = useAvatarStore((s) => s.debugOverlay);
  const background = BACKGROUND_OPTIONS.find((b) => b.id === backgroundId) ?? BACKGROUND_OPTIONS[0];

  const [stats, setStats] = useState<DebugStats>({ triangles: 0, materials: 0, textures: 0, drawCalls: 0, fps: 0 });
  // Gate the loading overlay on the rich body specifically (the best-quality
  // tier) rather than every fallback tier — the base body / primitives keep
  // preloading and rendering underneath regardless (see AvatarModel above).
  const [loadingBaseBody, setLoadingBaseBody] = useState(!getRichBody());

  useEffect(() => {
    if (!loadingBaseBody) return;
    preloadChibiBaseBody().catch(() => {});
    preloadRichBody()
      .then(() => setLoadingBaseBody(false))
      .catch(() => setLoadingBaseBody(false));
  }, [loadingBaseBody]);

  const handleStats = (built: BuiltAvatar) => {
    setStats((prev) => ({
      ...prev,
      triangles: built.triangleCount,
      materials: built.materialCount,
      textures: built.textureCount,
    }));
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl"
      style={{ background: `linear-gradient(180deg, ${background.top} 0%, ${background.bottom} 100%)` }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: CAMERA_PRESETS.front.position, fov: CAMERA_PRESETS.front.fov, near: 0.01, far: 20 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <CanvasRefGrabber />
        <SceneLights />
        <Suspense fallback={null}>
          <AvatarModel config={config} onStats={handleStats} />
        </Suspense>
        <CameraRig />
        {debugOverlay && (
          <DebugOverlayReader
            onUpdate={(s) => setStats((prev) => ({ ...prev, ...s }))}
          />
        )}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <circleGeometry args={[0.7, 32]} />
          <shadowMaterial opacity={0.18} />
        </mesh>
      </Canvas>

      {loadingBaseBody && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-900 shadow-lg">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            アバターを読み込んでいます…
          </div>
        </div>
      )}

      {debugOverlay && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-black/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-lime-300">
          <div>FPS: {stats.fps}</div>
          <div>Polygons: {stats.triangles.toLocaleString()}</div>
          <div>Draw Calls: {stats.drawCalls}</div>
          <div>Materials: {stats.materials}</div>
          <div>Textures: {stats.textures}</div>
        </div>
      )}
    </div>
  );
}
