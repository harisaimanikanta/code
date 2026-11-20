// Character identity specs. A spec fully determines a character's look, so the same id
// renders identically in every project (identity continuity). Age variants keep identity
// features (face shape seed, hair style, outfit) and change only age-related traits.
import type { MaterialPresetId } from '../materials/materials';

export type Build = 'slim' | 'average' | 'broad';
export type Sex = 'male' | 'female' | 'neutral';
export type Age = 'young' | 'adult' | 'older' | 'elderly';
export type Hair = 'short' | 'bald' | 'receding' | 'long' | 'bun' | 'cropped' | 'side-part' | 'swept';
export type Outfit = 'labcoat' | 'suit' | 'surgical' | 'casual' | 'sweater' | 'tuxedo' | 'gown';
export type Accessory = 'glasses' | 'stethoscope' | 'tie' | 'bowtie' | 'badge' | 'mask' | 'pen';

export interface CharacterSpec {
  id: string;
  label: string;
  height: number; // meters
  build: Build;
  sex: Sex;
  age: Age;
  faceSeed: number; // deterministic facial proportion variation
  skin: MaterialPresetId;
  hair: Hair;
  hairColor: MaterialPresetId;
  outfit: Outfit;
  outfitMaterial: MaterialPresetId;
  underMaterial: MaterialPresetId; // trousers / under-layer
  accessories: Accessory[];
}

const base: Omit<CharacterSpec, 'id' | 'label'> = {
  height: 1.78, build: 'average', sex: 'male', age: 'adult', faceSeed: 1,
  skin: 'skin-stylized', hair: 'short', hairColor: 'hair-dark',
  outfit: 'suit', outfitMaterial: 'fabric-suit-dark', underMaterial: 'fabric-suit-dark', accessories: [],
};

const def = (id: string, label: string, o: Partial<CharacterSpec>): CharacterSpec => ({ ...base, ...o, id, label });

export const CHARACTER_PRESETS: Record<string, CharacterSpec> = {
  'base-human': def('base-human', 'Base human (neutral)', { sex: 'neutral', outfit: 'casual', outfitMaterial: 'fabric-suit-burgundy' }),
  'male-adult': def('male-adult', 'Male adult', { faceSeed: 3 }),
  'male-broad': def('male-broad', 'Male, broad build', { build: 'broad', height: 1.84, faceSeed: 8, outfit: 'sweater', outfitMaterial: 'fabric-suit-burgundy' }),
  'female-adult': def('female-adult', 'Female adult', { sex: 'female', height: 1.66, build: 'slim', hair: 'long', faceSeed: 5, outfitMaterial: 'fabric-suit-burgundy' }),
  'female-bun': def('female-bun', 'Female, hair in bun', { sex: 'female', height: 1.68, hair: 'bun', faceSeed: 9, outfit: 'suit' }),
  'older-male': def('older-male', 'Older male', { age: 'older', hair: 'receding', hairColor: 'hair-grey', faceSeed: 12, skin: 'skin-stylized-aged' }),
  'older-female': def('older-female', 'Older female', { sex: 'female', height: 1.62, age: 'older', hair: 'bun', hairColor: 'hair-grey', faceSeed: 14, skin: 'skin-stylized-aged' }),
  scientist: def('scientist', 'Scientist (lab coat, glasses)', { outfit: 'labcoat', outfitMaterial: 'fabric-labcoat', accessories: ['glasses'], faceSeed: 21 }),
  'scientist-female': def('scientist-female', 'Scientist (female)', { sex: 'female', height: 1.67, hair: 'bun', outfit: 'labcoat', outfitMaterial: 'fabric-labcoat', faceSeed: 22 }),
  doctor: def('doctor', 'Doctor (lab coat, stethoscope)', { outfit: 'labcoat', outfitMaterial: 'fabric-labcoat', accessories: ['stethoscope', 'tie'], faceSeed: 31, hair: 'cropped' }),
  'doctor-female': def('doctor-female', 'Doctor (female)', { sex: 'female', height: 1.68, hair: 'long', outfit: 'labcoat', outfitMaterial: 'fabric-labcoat', accessories: ['stethoscope'], faceSeed: 32 }),
  researcher: def('researcher', 'Researcher (sweater, badge)', { outfit: 'sweater', outfitMaterial: 'fabric-suit-burgundy', accessories: ['badge', 'glasses'], faceSeed: 41, build: 'slim' }),
  surgeon: def('surgeon', 'Surgeon (scrubs, mask)', { outfit: 'surgical', outfitMaterial: 'red-dark', underMaterial: 'red-dark', accessories: ['mask'], hair: 'cropped', faceSeed: 51 }),
  'young-doctor': def('young-doctor', 'Young doctor (dark side-parted hair, lab coat, tie)', { height: 1.8, hair: 'side-part', outfit: 'labcoat', outfitMaterial: 'fabric-labcoat', underMaterial: 'fabric-suit-dark', accessories: ['tie', 'pen'], faceSeed: 81, skin: 'skin-light' }),
  'senior-pathologist': def('senior-pathologist', 'Senior pathologist (grey swept hair, glasses, lab coat)', { height: 1.76, age: 'older', hair: 'swept', hairColor: 'hair-grey', outfit: 'labcoat', outfitMaterial: 'fabric-labcoat', underMaterial: 'fabric-suit-dark', accessories: ['glasses', 'tie'], faceSeed: 91, skin: 'skin-stylized-aged' }),
  'laureate-tux': def('laureate-tux', 'Laureate in tuxedo', { hair: 'side-part', outfit: 'tuxedo', outfitMaterial: 'fabric-tux', underMaterial: 'fabric-tux', accessories: ['bowtie'], faceSeed: 81, skin: 'skin-light' }),
  patient: def('patient', 'Patient in hospital gown', { hair: 'side-part', outfit: 'gown', outfitMaterial: 'fabric-gown', underMaterial: 'fabric-gown', accessories: [], faceSeed: 81, skin: 'skin-light' }),
  'audience-member': def('audience-member', 'Conference attendee', { faceSeed: 61, accessories: ['tie'] }),
  'background-figure': def('background-figure', 'Background silhouette', { outfitMaterial: 'matte-black', underMaterial: 'matte-black', skin: 'matte-black', hairColor: 'matte-black', faceSeed: 71 }),
};

/** Age-shifted variant of a character, preserving identity (face seed, hair style, outfit). */
/** Same identity (face, hair style, skin) in a different outfit — e.g. the young doctor in a tuxedo or gown. */
export function outfitVariant(spec: CharacterSpec, outfit: Outfit): CharacterSpec {
  const mats: Record<Outfit, [string, string]> = { labcoat: ['fabric-labcoat', 'fabric-suit-dark'], suit: ['fabric-suit-dark', 'fabric-suit-dark'], surgical: ['red-dark', 'red-dark'], casual: ['fabric-suit-burgundy', 'fabric-suit-dark'], sweater: ['fabric-wool', 'fabric-suit-dark'], tuxedo: ['fabric-tux', 'fabric-tux'], gown: ['fabric-gown', 'fabric-gown'] };
  return { ...spec, id: `${spec.id}+${outfit}`, outfit, outfitMaterial: mats[outfit][0] as MaterialPresetId, underMaterial: mats[outfit][1] as MaterialPresetId, accessories: outfit === 'tuxedo' ? ['bowtie', ...spec.accessories.filter((a) => a === 'glasses')] : outfit === 'gown' ? spec.accessories.filter((a) => a === 'glasses') : spec.accessories };
}

export function ageVariant(spec: CharacterSpec, age: Age): CharacterSpec {
  const greys = age === 'older' || age === 'elderly';
  return {
    ...spec,
    id: `${spec.id}@${age}`,
    label: `${spec.label} (${age})`,
    age,
    hairColor: greys ? 'hair-grey' : spec.hairColor === 'hair-grey' ? 'hair-dark' : spec.hairColor,
    hair: age === 'elderly' && spec.hair === 'short' ? 'receding' : spec.hair,
    skin: greys ? 'skin-stylized-aged' : spec.skin === 'skin-stylized-aged' ? 'skin-stylized' : spec.skin,
    height: spec.height - (age === 'elderly' ? 0.05 : age === 'older' ? 0.02 : 0),
  };
}

export function resolveCharacter(idOrSpec: string | CharacterSpec): CharacterSpec {
  if (typeof idOrSpec !== 'string') return idOrSpec;
  // grammar: <preset>[@age][+outfit]   e.g. "young-doctor@older+tuxedo"
  const [head, outfit] = idOrSpec.split('+');
  const [id, age] = head.split('@');
  const spec = CHARACTER_PRESETS[id];
  if (!spec) throw new Error(`Unknown character preset "${id}". Known: ${Object.keys(CHARACTER_PRESETS).join(', ')}`);
  let out = age ? ageVariant(spec, age as Age) : spec;
  if (outfit) out = outfitVariant(out, outfit as Outfit);
  return out;
}
