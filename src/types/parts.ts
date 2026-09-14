export type PartCategory =
  | 'body'
  | 'face'
  | 'eyes'
  | 'mouth'
  | 'hair'
  | 'clothes'
  | 'shoes'
  | 'accessories'
  | 'back';

/**
 * Version 1 has no authored GLB assets yet (see README "アセットについて").
 * Every part therefore ships a `primitive` recipe so the app is fully
 * functional today; `model` is reserved so a real GLB can be dropped in
 * later (AvatarLoader / PartManager prefer `model` over `primitive` once set)
 * without touching any UI or store code.
 */
export type PrimitiveShape = 'sphere' | 'box' | 'capsule' | 'cone' | 'cylinder' | 'torus';

export interface PrimitiveNode {
  shape: PrimitiveShape;
  /** local position offset in meters, relative to the attach bone */
  position: [number, number, number];
  /** local rotation in radians */
  rotation?: [number, number, number];
  /** size args, meaning depends on `shape` (see PartMeshFactory) */
  size: [number, number, number];
  /** whether this node's color follows the part's `colorable` slot */
  colorable?: boolean;
}

export type HumanoidAttachBone =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'leftUpperArm'
  | 'rightUpperArm'
  | 'leftLowerLeg'
  | 'rightLowerLeg'
  | 'leftFoot'
  | 'rightFoot';

export interface PartDefinition {
  id: string;
  name: string;
  nameJa: string;
  category: PartCategory;
  /** future: path to an authored GLB, e.g. /assets/avatar/hair/hair_01.glb */
  model?: string;
  /** thumbnail image shown in the picker; falls back to a generated swatch */
  thumbnail?: string;
  /** procedural placeholder geometry, used while no `model` is provided */
  primitive: PrimitiveNode[];
  /** bone this part is rigidly attached to */
  attachTo: HumanoidAttachBone;
  defaultColor: string;
  colorable: boolean;
  compatible: boolean;
  /** approximate triangle count, used by the compatibility checker */
  estimatedTriangles: number;
  /** tags used by the "avoid incompatible combos" random/preset logic */
  tags?: string[];
}

export interface PartsDatabase {
  body: PartDefinition[];
  face: PartDefinition[];
  eyes: PartDefinition[];
  mouth: PartDefinition[];
  hair: PartDefinition[];
  clothes: PartDefinition[];
  shoes: PartDefinition[];
  accessories: PartDefinition[];
  back: PartDefinition[];
}
