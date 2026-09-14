import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Loads and caches an authored GLB part model. Nothing under
 * public/assets/avatar/** exists yet (see spec §56 / README), so every
 * PartDefinition in src/data/parts.json currently omits `model` and the
 * builder falls back to procedural primitives (see PartMeshFactory).
 *
 * This loader exists so that dropping a real GLB file onto disk and adding
 * its `model` path to parts.json is the *only* change needed to switch a
 * part over to authored art — no changes to AvatarBuilder, the store, or
 * any UI component are required.
 */
const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, Promise<THREE.Object3D>>();

export function loadPartModel(url: string): Promise<THREE.Object3D> {
  const cached = modelCache.get(url);
  if (cached) return cached;

  const promise = new Promise<THREE.Object3D>((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
    );
  });

  modelCache.set(url, promise);
  return promise;
}

export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        for (const key of Object.keys(material) as (keyof THREE.Material)[]) {
          const value = material[key];
          if (value && typeof value === 'object' && 'isTexture' in value) {
            (value as THREE.Texture).dispose();
          }
        }
        material.dispose();
      }
    }
  });
}
