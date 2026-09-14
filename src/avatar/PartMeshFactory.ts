import * as THREE from 'three';
import type { PrimitiveNode } from '../types/parts';

const geometryCache = new Map<string, THREE.BufferGeometry>();

function getBaseGeometry(node: PrimitiveNode): THREE.BufferGeometry {
  const key = `${node.shape}:${node.size.join(',')}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;

  let geometry: THREE.BufferGeometry;
  switch (node.shape) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(1, 20, 16);
      break;
    case 'box':
      geometry = new THREE.BoxGeometry(1, 1, 1);
      break;
    case 'capsule':
      geometry = new THREE.CapsuleGeometry(node.size[0], node.size[1], 4, 10);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(node.size[0], node.size[1], 14);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(node.size[0], node.size[1], node.size[2], 14);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(node.size[0], node.size[1], 8, 16);
      break;
    default:
      geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  }
  geometryCache.set(key, geometry);
  return geometry;
}

/** Builds a renderable mesh for a single primitive node, applying its transform. */
export function buildPrimitiveMesh(
  node: PrimitiveNode,
  material: THREE.Material,
  name: string,
): THREE.Mesh {
  const geometry = getBaseGeometry(node);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;

  if (node.shape === 'sphere' || node.shape === 'box') {
    mesh.scale.set(node.size[0], node.size[1], node.size[2]);
  }

  mesh.position.set(...node.position);
  if (node.rotation) mesh.rotation.set(...node.rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function countMeshTriangles(mesh: THREE.Mesh): number {
  const geometry = mesh.geometry;
  const index = geometry.index;
  if (index) return index.count / 3;
  const position = geometry.attributes.position;
  return position ? position.count / 3 : 0;
}
