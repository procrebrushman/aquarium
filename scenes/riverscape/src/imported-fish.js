import * as THREE from "three";
import { GLTFLoader } from "../vendor/GLTFLoader.js";
import * as SkeletonUtils from "../vendor/SkeletonUtils.js";

// Imported fish borrow the existing fish states. A model slot is created only when a
// species is enabled, so the total-fish budget is independent of any species-specific cap.
const SPECS = [
  {
    id: "guppy",
    label: "Guppy",
    url: "assets/fish/user/guppie_animated.glb",
    initialCount: 5,
    length: 0.48,
    animation: true,
  },
  {
    id: "neon-tetra",
    label: "Neon tetra",
    url: "assets/fish/user/neon_tetra_aquarium_fish.glb",
    initialCount: 10,
    length: 0.27,
    animation: false,
  },
];

const SPEC_BY_ID = new Map(SPECS.map((spec) => [spec.id, spec]));

// Coordinates are measured in each GLB's local space before normalizeAsset() scales
// the asset down. The original guppy is the only imported skinned fish retained here;
// its authored clip and the existing school's swim signal are both kept.
const IMPORTED_SWIM_PROFILES = {
  guppy: {
    axis: 0,
    min: -79,
    max: 91,
    direction: 1,
    speed: 4.2,
    amplitude: 0.050,
    finAmplitude: 0.085,
    waveCycles: 6.5,
  },
  "neon-tetra": {
    axis: 0,
    min: -0.021,
    max: 0.020,
    direction: 1,
    speed: 4.0,
    amplitude: 0.040,
    finAmplitude: 0.034,
    waveCycles: 6.0,
  },
};

// These are deliberately colourway variations of the same low-poly model, not a second
// high-poly guppy asset. The source GLB has one skinned mesh and one detailed 512px
// base-colour texture, so the shader keeps that texture as the detail layer and only
// tints the body parts on top of it.
const GUPPY_VARIANTS = [
  {
    id: "red-tail",
    label: "red tail",
    body: 0xb6172e,
    tail: 0xd61f36,
    tailTip: 0x641027,
    fin: 0xef2740,
    finTip: 0x73122d,
    stripe: 0xf05b6b,
    spot: 0x7d1020,
    pattern: 0,
    finStrength: 1.0,
    bodyStrength: 0.78,
    colorGain: 1.16,
    colorSaturation: 1.18,
    textureDetail: 0.3,
    glowColor: 0xef263c,
    glowStrength: 0.11,
  },
  {
    id: "aqua-white",
    label: "aqua white",
    body: 0x61d3e6,
    tail: 0xf3fbff,
    fin: 0xd8f7ff,
    stripe: 0x2df0ff,
    spot: 0x2f9bb4,
    pattern: 0,
    head: 0xf7fdff,
    headStrength: 0.88,
    colorGain: 1.08,
    colorSaturation: 1.08,
    textureDetail: 0.24,
    glowColor: 0x55e7f1,
    glowStrength: 0.045,
  },
  {
    id: "leopard-gold",
    label: "leopard gold",
    body: 0xf0c522,
    tail: 0xffd52e,
    tailTip: 0xf19b12,
    fin: 0xffdf43,
    finTip: 0xf09c16,
    stripe: 0xf5bd2d,
    spot: 0x321609,
    pattern: 1,
    finStrength: 1.0,
    bodyStrength: 0.72,
    colorGain: 1.14,
    colorSaturation: 1.18,
    textureDetail: 0.3,
    leopardStrength: 0.82,
    glowColor: 0xffbd24,
    glowStrength: 0.07,
  },
  {
    id: "ice-blue",
    label: "ice blue",
    body: 0x77cdec,
    tail: 0x9be8f7,
    fin: 0xe9fbff,
    stripe: 0x5af1ff,
    spot: 0x216e92,
    pattern: 0,
    colorGain: 1.08,
    colorSaturation: 1.1,
    textureDetail: 0.24,
    glowColor: 0x58e8f5,
    glowStrength: 0.05,
  },
  {
    id: "white",
    label: "white",
    body: 0xeefaff,
    tail: 0xffffff,
    fin: 0xf7ffff,
    stripe: 0x78e6f4,
    spot: 0x829eaa,
    pattern: 0,
    head: 0xffffff,
    headStrength: 0.88,
    colorGain: 1.06,
    colorSaturation: 1.04,
    textureDetail: 0.24,
    glowColor: 0xa3f4ff,
    glowStrength: 0.035,
  },
  {
    id: "rose-lavender",
    label: "rose lavender",
    body: 0xd488df,
    tail: 0xb568e8,
    tailTip: 0x743bba,
    fin: 0xff83d7,
    finTip: 0xb94baf,
    stripe: 0xf08be9,
    spot: 0x713a76,
    pattern: 0,
    bodyStrength: 0.74,
    colorGain: 1.14,
    colorSaturation: 1.18,
    textureDetail: 0.3,
    glowColor: 0xe968d9,
    glowStrength: 0.075,
  },
];

// Keep a few guppies in the source model's original colours. The colourways are
// additions to the imported asset, not a replacement for its authored appearance.
const GUPPY_APPEARANCES = [null, ...GUPPY_VARIANTS];

function normalizeAsset(asset, targetLength) {
  asset.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(asset);
  if (bounds.isEmpty()) throw new Error("Imported fish has no visible bounds");

  const size = bounds.getSize(new THREE.Vector3());
  const maximumDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maximumDimension) || maximumDimension < 1e-6)
    throw new Error("Imported fish has invalid dimensions");

  // Put the model's visual centre at the behaviour state's origin, then scale its
  // longest dimension to the species size used by the original low-poly fish.
  const factor = targetLength / maximumDimension;
  const centre = bounds.getCenter(new THREE.Vector3());
  const normalized = new THREE.Group();
  normalized.position.copy(centre).multiplyScalar(-factor);
  normalized.scale.setScalar(factor);
  normalized.add(asset);
  return normalized;
}

function cloneFishMaterial(source) {
  if (!source) return source;
  // Keep the source Standard/Physical class. The imported fish are small and many;
  // upgrading every Standard material to Physical adds clearcoat/iridescence work to
  // every fragment and was the main regression in the always-on wallpaper path.
  return source.clone();
}

function createImportedSwimUniforms(swimProfile) {
  return {
    time: { value: 0 },
    phase: { value: swimProfile.phase ?? 0 },
    finPhase: { value: swimProfile.finPhase ?? 0 },
    drive: { value: 0.85 },
    axis: { value: swimProfile.axis },
    min: { value: swimProfile.min },
    max: { value: swimProfile.max },
    direction: { value: swimProfile.direction },
    speed: { value: swimProfile.speed },
    amplitude: { value: swimProfile.amplitude },
    finAmplitude: { value: swimProfile.finAmplitude },
    waveCycles: { value: swimProfile.waveCycles },
  };
}

function applyImportedSwimVertex(shader, material, swimProfile) {
  // The original school remains on its own InstancedMesh/shader. The imported guppy
  // uses its armature below; this compatibility deformation is for the unrigged neon.
  if (!swimProfile || swimProfile.species === "guppy") return;

  material.userData ||= {};
  const importedSwim = material.userData.importedSwimUniforms || createImportedSwimUniforms(swimProfile);
  material.userData.importedSwimUniforms = importedSwim;
  shader.uniforms.importedSwimTime = importedSwim.time;
  shader.uniforms.importedSwimPhase = importedSwim.phase;
  shader.uniforms.importedSwimFinPhase = importedSwim.finPhase;
  shader.uniforms.importedSwimDrive = importedSwim.drive;
  shader.uniforms.importedSwimAxis = importedSwim.axis;
  shader.uniforms.importedSwimMin = importedSwim.min;
  shader.uniforms.importedSwimMax = importedSwim.max;
  shader.uniforms.importedSwimDirection = importedSwim.direction;
  shader.uniforms.importedSwimSpeed = importedSwim.speed;
  shader.uniforms.importedSwimAmplitude = importedSwim.amplitude;
  shader.uniforms.importedSwimFinAmplitude = importedSwim.finAmplitude;
  shader.uniforms.importedSwimCycles = importedSwim.waveCycles;

  shader.vertexShader = `
    uniform float importedSwimTime;
    uniform float importedSwimPhase;
    uniform float importedSwimFinPhase;
    uniform float importedSwimDrive;
    uniform float importedSwimAxis;
    uniform float importedSwimMin;
    uniform float importedSwimMax;
    uniform float importedSwimDirection;
    uniform float importedSwimSpeed;
    uniform float importedSwimAmplitude;
    uniform float importedSwimFinAmplitude;
    uniform float importedSwimCycles;
    ${shader.vertexShader}`;

  // Port the original fish's travelling wave in local coordinates. The original
  // school uses effort for the body wave and a separate fin phase for the membrane;
  // this does the same for imported meshes without touching the original material.
  const deformation = `
    float importedSwimLong = importedSwimAxis < 0.5 ? transformed.x : transformed.y;
    float importedSwimSpan = max(importedSwimMax - importedSwimMin, 0.0001);
    float importedSwimT = clamp(
      (importedSwimLong - importedSwimMin) / importedSwimSpan,
      0.0,
      1.0
    );
    importedSwimT = importedSwimDirection > 0.0
      ? importedSwimT
      : 1.0 - importedSwimT;
    float importedTailWeight = 1.0 - smoothstep(0.12, 0.82, importedSwimT);
    float importedWavePhase = importedSwimTime * importedSwimSpeed
      + importedSwimPhase
      + (1.0 - importedSwimT) * importedSwimCycles;
    float importedBodyWave = sin(importedWavePhase);
    float importedFinWave = sin(importedSwimFinPhase + 1.2
      + (1.0 - importedSwimT) * 1.1);
    float importedTailOffset = importedBodyWave * importedSwimSpan
      * importedSwimAmplitude * importedTailWeight * importedSwimDrive;
    float importedFinOffset = importedFinWave * importedSwimSpan
      * importedSwimFinAmplitude
      * mix(0.22, 1.0, importedTailWeight)
      * importedSwimDrive;
    if (importedSwimAxis < 0.5) {
      transformed.z += importedTailOffset;
      transformed.y += importedFinOffset;
    } else {
      transformed.x += importedTailOffset;
      transformed.z += importedFinOffset;
    }
  `;

  if (shader.vertexShader.includes("#include <skinning_vertex>"))
    shader.vertexShader = shader.vertexShader.replace(
      "#include <skinning_vertex>",
      `#include <skinning_vertex>${deformation}`,
    );
  else
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>${deformation}`,
    );
}

function prepareMaterials(root, variant = null, swimProfile = null) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    // The aquarium's plants and hardscape provide the visual shadow language. Imported
    // fish are small, translucent foreground objects; excluding them from the shadow
    // pass removes a full extra draw for every imported fish without changing their
    // appearance appreciably.
    object.castShadow = false;
    object.receiveShadow = false;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    // GLB materials are shared by clones. Clone the material for each active visual so
    // the aquarium-specific light balance does not mutate a later model unexpectedly.
    const materials = sourceMaterials.map(cloneFishMaterial);
    object.material = Array.isArray(object.material) ? materials : materials[0];
    for (const material of materials) {
      if (!material) continue;
      if (swimProfile) {
        material.userData ||= {};
        material.userData.importedSwimUniforms ||= createImportedSwimUniforms(swimProfile);
      }
      if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
        // The source files are authored for a brighter, more metallic studio setup. The
        // Riverscape tank already supplies the silver fish' specular response, so keeping
        // imported bodies mostly diffuse prevents them from becoming muddy in the dark
        // background and makes them sit beside the original school.
        material.metalness = Math.min(material.metalness, 0.10);
        material.roughness = Math.max(material.roughness, 0.48);
        material.envMapIntensity = 0.82;
        const sourceTransparent = Boolean(material.transparent);
        material.transparent = sourceTransparent;
        material.opacity = sourceTransparent ? Math.min(material.opacity, 0.96) : 1;
        material.depthWrite = !sourceTransparent;
        material.side = sourceTransparent ? THREE.DoubleSide : THREE.FrontSide;
        if (material.isMeshPhysicalMaterial) {
          material.clearcoat = Math.max(material.clearcoat, 0.18);
          material.clearcoatRoughness = Math.min(material.clearcoatRoughness, 0.24);
          material.iridescence = Math.max(material.iridescence, 0.42);
          material.iridescenceIOR = 1.38;
          material.iridescenceThicknessRange = [180, 420];
        }
        if (material.emissive) {
          // A small neutral fill keeps the imported fish readable in the dark tank
          // without turning them into self-glowing objects or flattening highlights.
          material.emissive.setRGB(0.055, 0.062, 0.058);
          material.emissiveIntensity = 0.45;
        }
        material.color.multiplyScalar(1.14);
      }
      if (variant) installGuppyVariant(material, variant, swimProfile);
      else installImportedOptics(material, swimProfile);
      material.needsUpdate = true;
    }
  });
}

function installImportedOptics(material, swimProfile = null) {
  if (!(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) return;
  material.onBeforeCompile = (shader) => {
    applyImportedSwimVertex(shader, material, swimProfile);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_end>",
      `#include <lights_fragment_end>
        float importedViewFresnel = pow(
          1.0 - clamp(dot(normalize(normal), normalize(geometryViewDir)), 0.0, 1.0),
          2.0
        );
        totalEmissiveRadiance += vec3(0.018, 0.072, 0.085)
          * importedViewFresnel * 0.58;
        reflectedLight.indirectDiffuse += diffuseColor.rgb * 0.086;`,
    );
  };
  material.needsUpdate = true;
}

function installGuppyVariant(material, variant, swimProfile = null) {
  if (!variant || !(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) return;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.guppyBodyColor = { value: new THREE.Color(variant.body) };
    shader.uniforms.guppyTailColor = { value: new THREE.Color(variant.tail) };
    shader.uniforms.guppyFinColor = { value: new THREE.Color(variant.fin) };
    shader.uniforms.guppyStripeColor = { value: new THREE.Color(variant.stripe) };
    shader.uniforms.guppySpotColor = { value: new THREE.Color(variant.spot) };
    shader.uniforms.guppyPattern = { value: variant.pattern };
    shader.uniforms.guppyLeopardStrength = { value: variant.leopardStrength ?? 0.52 };
    shader.uniforms.guppyFinStrength = { value: variant.finStrength ?? 1.0 };
    shader.uniforms.guppyBodyStrength = { value: variant.bodyStrength ?? 0.58 };
    shader.uniforms.guppyColorGain = { value: variant.colorGain ?? 1.0 };
    shader.uniforms.guppyColorSaturation = { value: variant.colorSaturation ?? 1.0 };
    shader.uniforms.guppyTextureDetail = { value: variant.textureDetail ?? 0.26 };
    shader.uniforms.guppyGlowColor = {
      value: new THREE.Color(variant.glowColor ?? variant.fin ?? variant.body),
    };
    shader.uniforms.guppyGlowStrength = { value: variant.glowStrength ?? 0 };
    shader.uniforms.guppyTailTipColor = {
      value: new THREE.Color(variant.tailTip ?? variant.tail),
    };
    shader.uniforms.guppyFinTipColor = {
      value: new THREE.Color(variant.finTip ?? variant.fin),
    };
    shader.uniforms.guppyHeadColor = {
      value: new THREE.Color(variant.head ?? variant.body),
    };
    shader.uniforms.guppyHeadStrength = { value: variant.headStrength ?? 0 };

    applyImportedSwimVertex(shader, material, swimProfile);
    shader.vertexShader = `varying vec3 vGuppyLocalPosition;\n${shader.vertexShader}`;
    const positionAssignment = "\n\tvGuppyLocalPosition = transformed;";
    if (shader.vertexShader.includes("#include <skinning_vertex>"))
      shader.vertexShader = shader.vertexShader.replace(
        "#include <skinning_vertex>",
        `#include <skinning_vertex>${positionAssignment}`,
      );
    else
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>${positionAssignment}`,
      );

    shader.fragmentShader = `
      uniform vec3 guppyBodyColor;
      uniform vec3 guppyTailColor;
      uniform vec3 guppyFinColor;
      uniform vec3 guppyStripeColor;
      uniform vec3 guppySpotColor;
      uniform float guppyPattern;
      uniform float guppyLeopardStrength;
      uniform float guppyFinStrength;
      uniform float guppyBodyStrength;
      uniform float guppyColorGain;
      uniform float guppyColorSaturation;
      uniform float guppyTextureDetail;
      uniform vec3 guppyGlowColor;
      uniform float guppyGlowStrength;
      uniform vec3 guppyTailTipColor;
      uniform vec3 guppyFinTipColor;
      uniform vec3 guppyHeadColor;
      uniform float guppyHeadStrength;
      varying vec3 vGuppyLocalPosition;
      ${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
        vec3 guppySourceColor = diffuseColor.rgb;
        float guppyLuma = clamp(dot(guppySourceColor, vec3(0.299, 0.587, 0.114)), 0.34, 1.0);
        // The GLB's authored mesh is not centred on y=0: the body axis is around
        // y=44 and the dorsal/anal fins fan away from it. Centre the masks on the
        // actual source geometry instead of painting most of the fish as a fin.
        float guppyBodyOffsetY = vGuppyLocalPosition.y - 44.0;
        // The original texture's caudal fin reaches from the negative-x tail into
        // the caudal peduncle. Cover that whole region before applying a colourway.
        float guppyTailMask = 1.0 - smoothstep(-20.0, 6.0, vGuppyLocalPosition.x);
        float guppyFinMask = smoothstep(8.0, 18.0, abs(guppyBodyOffsetY));
        guppyFinMask *= smoothstep(-4.0, 8.0, vGuppyLocalPosition.x);
        guppyFinMask *= 1.0 - smoothstep(62.0, 78.0, vGuppyLocalPosition.x);
        guppyFinMask *= 1.0 - guppyTailMask;
        float guppyStripeMask = 1.0 - smoothstep(2.0, 6.5, abs(guppyBodyOffsetY));
        guppyStripeMask *= smoothstep(-4.0, 8.0, vGuppyLocalPosition.x);
        guppyStripeMask *= 1.0 - smoothstep(55.0, 72.0, vGuppyLocalPosition.x);
        guppyStripeMask *= 1.0 - guppyTailMask;
        guppyStripeMask *= 1.0 - guppyFinMask;
        float guppyThinMask = max(guppyTailMask * 0.74, guppyFinMask);
        float guppyTailTipMask = smoothstep(48.0, 86.0, -vGuppyLocalPosition.x) * guppyTailMask;
        float guppyFinTipMask = smoothstep(18.0, 32.0, abs(guppyBodyOffsetY)) * guppyFinMask;
        vec3 guppyTailPart = mix(guppyTailColor, guppyTailTipColor, guppyTailTipMask);
        vec3 guppyFinPart = mix(guppyFinColor, guppyFinTipColor, guppyFinTipMask);
        vec3 guppyPartColor = mix(guppyBodyColor, guppyTailPart, guppyTailMask);
        guppyPartColor = mix(guppyPartColor, guppyFinPart, guppyFinMask);
        vec3 guppyRecolored = guppyPartColor
          * (0.68 + guppyLuma * 0.56)
          * guppyColorGain;
        float guppySourceLuma = max(
          dot(guppySourceColor, vec3(0.299, 0.587, 0.114)),
          0.06
        );
        vec3 guppySourceChroma = clamp(
          guppySourceColor / guppySourceLuma,
          0.35,
          2.2
        );
        guppyRecolored *= mix(
          vec3(1.0),
          guppySourceChroma,
          guppyTextureDetail * (1.0 - guppyTailMask)
        );
        float guppyRecoloredLuma = dot(
          guppyRecolored,
          vec3(0.299, 0.587, 0.114)
        );
        guppyRecolored = mix(
          vec3(guppyRecoloredLuma),
          guppyRecolored,
          guppyColorSaturation
        );
        float guppyColorStrength = mix(
          guppyBodyStrength,
          guppyFinStrength,
          max(guppyFinMask, guppyTailMask)
        );
        diffuseColor.rgb = mix(diffuseColor.rgb, guppyRecolored, guppyColorStrength);
        // Do not paint a synthetic cyan band over the GLB. The source base-colour
        // texture already carries the fish's lateral highlight and body contrast;
        // retaining it here is what keeps the original model's line and fin sheen.
        vec3 guppyCell = floor(vGuppyLocalPosition * vec3(0.17, 0.20, 0.23));
        float guppySpeckle = fract(sin(dot(guppyCell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float guppyLeopard = smoothstep(0.66, 0.84, guppySpeckle) * guppyPattern;
        guppyLeopard *= max(guppyTailMask, 1.0 - guppyFinMask - guppyStripeMask);
        diffuseColor.rgb = mix(
          diffuseColor.rgb,
          guppySpotColor * (0.46 + guppyLuma * 0.45),
          guppyLeopard * guppyLeopardStrength
        );
        float guppyHeadMask = smoothstep(58.0, 78.0, vGuppyLocalPosition.x);
        guppyHeadMask *= 1.0 - guppyTailMask;
        guppyHeadMask *= 1.0 - guppyFinMask;
        vec3 guppyHead = guppyHeadColor * (0.68 + guppyLuma * 0.56);
        diffuseColor.rgb = mix(
          diffuseColor.rgb,
          guppyHead,
          guppyHeadMask * guppyHeadStrength
        );
        diffuseColor.a *= mix(0.98, 0.82, clamp(guppyThinMask, 0.0, 1.0));`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_end>",
      `#include <lights_fragment_end>
        float guppyViewFresnel = pow(
          1.0 - clamp(dot(normalize(normal), normalize(geometryViewDir)), 0.0, 1.0),
          2.0
        );
        vec3 guppyPearl = mix(guppyStripeColor, guppyFinColor, 0.32);
        // Lateral-line colour is a body highlight only. On the caudal fin, use the
        // selected tail palette so a blue stripe can never be emitted across a red,
        // yellow or purple tail.
        vec3 guppyTailSheen = mix(guppyTailColor, guppyTailTipColor, guppyTailTipMask);
        guppyPearl = mix(guppyPearl, guppyTailSheen, guppyTailMask);
        totalEmissiveRadiance += guppyPearl * guppyViewFresnel
          * (0.045 + 0.085 * guppyThinMask);
        float guppyWarmColorMask = max(guppyTailMask, guppyFinMask);
        totalEmissiveRadiance += guppyGlowColor * guppyGlowStrength
          * guppyWarmColorMask * (0.45 + 0.55 * guppyLuma);
        reflectedLight.indirectDiffuse += diffuseColor.rgb
          * (0.052 + 0.078 * guppyThinMask);`,
    );
  };
  material.needsUpdate = true;
}

function setDynamic(root) {
  root.traverse((object) => {
    // Only the moving wrapper, bones, and an animated helper node need local
    // matrix recomposition. Static mesh nodes still receive the forced world update
    // from the wrapper, but do not redo their unchanged local matrix every frame.
    object.matrixAutoUpdate = object === root || object.isBone || object.name === "Cube";
    object.matrixWorldNeedsUpdate = true;
  });
}

function pickAnimation(clips) {
  return clips.find((clip) => /swim|take/i.test(clip.name)) || clips[0] || null;
}

function disposeMaterials(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material?.dispose();
  });
}

export async function createImportedFishSchool(scene, fishSchool) {
  const loader = new GLTFLoader();
  const templates = new Map();
  const visuals = [];
  const stats = {
    requested: SPECS.reduce((total, spec) => total + spec.initialCount, 0),
    loaded: 0,
    animated: 0,
    errors: [],
    species: {},
  };
  let nextGuppyAppearance = 0;

  for (const spec of SPECS) {
    const speciesStats = { loaded: 0, animated: false };
    stats.species[spec.id] = speciesStats;
    try {
      const template = await loader.loadAsync(spec.url);
      templates.set(spec.id, template);
      speciesStats.animated = Boolean(spec.animation && template.animations.length);
    } catch (error) {
      console.warn(`Riverscape could not load ${spec.label}:`, error);
      stats.errors.push(spec.id);
    }
  }

  function createVisual(species, state) {
    const spec = SPEC_BY_ID.get(species);
    const template = templates.get(species);
    if (!spec || !template) return null;

    const asset = SkeletonUtils.clone(template.scene);
    const motion = new THREE.Group();
    const variant = species === "guppy"
      ? GUPPY_APPEARANCES[nextGuppyAppearance++ % GUPPY_APPEARANCES.length]
      : null;
    const swimProfile = {
      ...(IMPORTED_SWIM_PROFILES[species] || IMPORTED_SWIM_PROFILES.guppy),
      species,
      phase: state.phase,
    };
    motion.name = variant
      ? `Imported ${spec.label} (${variant.label})`
      : `Imported ${spec.label}`;
    motion.add(normalizeAsset(asset, spec.length));
    prepareMaterials(motion, variant, swimProfile);
    scene.add(motion);

    const swimMaterials = [];
    motion.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material?.userData?.importedSwimUniforms) swimMaterials.push(material);
      }
    });

    let mixer = null;
    // Keep the asset's authored swim clip when it contains one. The original
    // Riverscape behaviour still owns movement, steering, avoidance, and feeding.
    const clip = spec.animation ? pickAnimation(template.animations) : null;
    if (clip) {
      mixer = new THREE.AnimationMixer(asset);
      mixer.clipAction(clip).play();
      stats.animated++;
    }

    // Hide the corresponding procedural instance while this model owns the behaviour
    // state. The caller decides whether this newly created slot is enabled.
    state.visual = "external";
    state.importedSpecies = spec.id;
    const visual = {
      motion,
      asset,
      state,
      mixer,
      species: spec.id,
      variant: variant?.id || null,
      swimMaterials,
      wobble: spec.animation ? 0.018 : 0.03,
    };
    visuals.push(visual);
    stats.loaded++;
    stats.species[spec.id].loaded++;
    return visual;
  }

  function releaseVisual(visual) {
    const index = visuals.indexOf(visual);
    if (index >= 0) visuals.splice(index, 1);
    visual.mixer?.stopAllAction();
    visual.mixer?.uncacheRoot(visual.asset);
    disposeMaterials(visual.motion);
    scene.remove(visual.motion);
    stats.loaded = Math.max(0, stats.loaded - 1);
    stats.species[visual.species].loaded = Math.max(
      0,
      stats.species[visual.species].loaded - 1,
    );
    if (visual.mixer) stats.animated = Math.max(0, stats.animated - 1);
    visual.state.visual = "procedural";
    visual.state.importedSpecies = null;
    visual.state.enabled = false;
  }

  // Reserve only the initial composition. Additional species claim disabled procedural
  // states when the total budget has room, so no imported species has its own hard cap.
  let stateIndex = 0;
  for (const spec of SPECS) {
    if (!templates.has(spec.id)) continue;
    for (let i = 0; i < spec.initialCount && stateIndex < fishSchool.fish.length; i++) {
      const visual = createVisual(spec.id, fishSchool.fish[stateIndex++]);
      if (visual) visual.state.enabled = true;
    }
  }

  // main.js freezes static scene matrices after setup. Imported roots and animated bones
  // must remain dynamic, while the rest of the aquarium keeps the original optimization.
  function makeDynamic() {
    for (const visual of visuals) setDynamic(visual.motion);
  }

  function update(dt, time) {
    for (const visual of visuals) {
      const { motion, state, mixer } = visual;
      if (!state.enabled) {
        motion.visible = false;
        continue;
      }
      motion.visible = true;
      motion.position.copy(state.position);
      motion.quaternion.copy(state.quaternion);
      if (mixer) mixer.update(dt);
      for (const material of visual.swimMaterials) {
        const uniforms = material.userData.importedSwimUniforms;
        if (!uniforms) continue;
        uniforms.time.value = time;
        uniforms.phase.value = state.phase;
        uniforms.finPhase.value = state.finPhase;
        uniforms.drive.value = 0.25 + state.effort * 0.78;
      }

      // This small roll preserves the original school's body-level response for all
      // imported species without running a second per-bone animation layer.
      const roll = Math.sin(time * 2.1 + state.phase) * visual.wobble * (0.25 + state.effort);
      motion.rotateX(roll);
      motion.updateMatrixWorld(true);
    }
  }

  function getSpeciesNames() {
    return SPECS.map((spec) => spec.id);
  }

  function getSpeciesCounts() {
    return Object.fromEntries(
      SPECS.map((spec) => [
        spec.id,
        visuals.filter((visual) => visual.species === spec.id && visual.state.enabled).length,
      ]),
    );
  }

  function getSpeciesCountsArray() {
    const counts = getSpeciesCounts();
    return SPECS.map((spec) => counts[spec.id] || 0);
  }

  function setSpeciesCount(species, desired) {
    if (!templates.has(species)) return getSpeciesCountsArray();
    const target = Math.max(0, Math.round(Number(desired) || 0));
    let active = visuals.filter((visual) => visual.species === species && visual.state.enabled);

    while (active.length > target) {
      releaseVisual(active.pop());
    }
    while (active.length < target) {
      const state = fishSchool.fish.find(
        (candidate) => !candidate.enabled && candidate.visual === "procedural",
      );
      if (!state) break;
      const visual = createVisual(species, state);
      if (!visual) break;
      state.enabled = true;
      active.push(visual);
    }
    update(0, 0);
    return getSpeciesCountsArray();
  }

  function adjustSpeciesCount(species, delta) {
    const counts = getSpeciesCounts();
    return setSpeciesCount(species, (counts[species] || 0) + Math.round(Number(delta) || 0));
  }

  return {
    update,
    setDynamic: makeDynamic,
    getSpeciesNames,
    getSpeciesCounts,
    getSpeciesCountsArray,
    setSpeciesCount,
    adjustSpeciesCount,
    getStats: () => ({
      requested: stats.requested,
      loaded: stats.loaded,
      animated: stats.animated,
      errors: [...stats.errors],
      species: Object.fromEntries(
        Object.entries(stats.species).map(([id, value]) => [id, { ...value }]),
      ),
    }),
  };
}
