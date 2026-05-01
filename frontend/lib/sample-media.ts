/**
 * Curated sample media from the Fıstık Ağacı project (1340 Ada 43 Parsel).
 * Real construction-site photos + short clips a visitor can click to try the
 * inspection flows without uploading their own. Hosted from Vercel `public/`.
 */

export type SamplePhoto = {
  filename: string;
  title: string;
  hint: string;
  element: 'foundation' | 'column' | 'beam' | 'slab' | 'wall' | 'stair' | 'site';
};

export type SampleVideo = {
  filename: string;
  title: string;
  hint: string;
  duration_s: number;
};

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    filename: '20230417_130831.jpg',
    title: 'Beam stirrup close-up',
    hint: 'Tight stirrup spacing in confinement zone — count the bars and check pitch.',
    element: 'beam',
  },
  {
    filename: '20230404_095245.jpg',
    title: 'Mat foundation — pre-pour grid',
    hint: 'Full bottom mat reinforcement laid out, spacers visible. Check geometry.',
    element: 'foundation',
  },
  {
    filename: '20230401_092804.jpg',
    title: 'Site overview — foundation cage',
    hint: 'Full mat foundation seen from above, two workers on the cage.',
    element: 'site',
  },
  {
    filename: '20230403_140759.jpg',
    title: 'Column rebar density (looking up)',
    hint: 'Vertical column cage from below — count longitudinal bars per column.',
    element: 'column',
  },
  {
    filename: '20230525_173652.jpg',
    title: 'Shear wall cage in formwork',
    hint: 'Shear wall reinforcement boxed inside formwork before pour.',
    element: 'wall',
  },
  {
    filename: '20230501_140316.jpg',
    title: 'Stair cover detail',
    hint: 'Concrete cover at stair rebar — check the spacer spacing.',
    element: 'stair',
  },
  {
    filename: '20230415_110049.jpg',
    title: 'Column starter bars being tied',
    hint: 'Worker tying column starter rebar onto the foundation slab.',
    element: 'column',
  },
  {
    filename: '20230420_095423.jpg',
    title: 'Slab mat, engineer overlooking',
    hint: 'Slab pre-pour with red electrical conduit + engineer reviewing.',
    element: 'slab',
  },
  {
    filename: '20230509_102244.jpg',
    title: 'Slab + beam underside grid',
    hint: 'Looking up at the slab–beam junction reinforcement.',
    element: 'slab',
  },
  {
    filename: '20230521_101408.jpg',
    title: 'Slab edge / cantilever',
    hint: 'Sloped slab edge meets fresh rebar — anchorage detail.',
    element: 'slab',
  },
  {
    filename: '20230510_114759.jpg',
    title: 'Wall mesh against existing brick',
    hint: 'New shear-wall mesh placed against existing brick wall (retrofit).',
    element: 'wall',
  },
  {
    filename: '20230222_125037.jpg',
    title: 'Wall mesh + formwork prep',
    hint: 'Wall reinforcement mesh seen from below before formwork closes.',
    element: 'wall',
  },
];

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    filename: '20230417_153250.mp4',
    title: 'Worker tying a wall cage',
    hint: 'Construction worker on a wooden ladder tying rebar by hand.',
    duration_s: 3.7,
  },
  {
    filename: '20230510_125126.mp4',
    title: 'Walk over the mat foundation',
    hint: 'Overhead pan across a bottom-mat reinforcement with column starters.',
    duration_s: 6.0,
  },
  {
    filename: '20230415_140420.mp4',
    title: 'Wide foundation aerial',
    hint: 'Wide pan over the foundation cage with bricks + workers in frame.',
    duration_s: 7.9,
  },
];

export function samplePhotoUrl(p: SamplePhoto): string {
  return `/sample-media/photos/${p.filename}`;
}

export function sampleVideoUrl(v: SampleVideo): string {
  return `/sample-media/videos/${v.filename}`;
}

/** Fetch a sample photo as a File so it can be POSTed to the upload endpoints. */
export async function fetchSamplePhotoFile(p: SamplePhoto): Promise<File> {
  const res = await fetch(samplePhotoUrl(p));
  if (!res.ok) throw new Error(`sample fetch failed: ${res.status}`);
  const blob = await res.blob();
  return new File([blob], p.filename, { type: blob.type || 'image/jpeg' });
}

export async function fetchSampleVideoFile(v: SampleVideo): Promise<File> {
  const res = await fetch(sampleVideoUrl(v));
  if (!res.ok) throw new Error(`sample fetch failed: ${res.status}`);
  const blob = await res.blob();
  return new File([blob], v.filename, { type: blob.type || 'video/mp4' });
}
