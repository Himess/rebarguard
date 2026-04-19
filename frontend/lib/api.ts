export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export type Position2D = { x_m: number; y_m: number };

export type RebarGroup = {
  count: number;
  diameter_mm: number;
  steel_class: string;
  position?: 'corner' | 'side' | 'middle' | 'top' | 'bottom' | null;
};

export type Stirrup = {
  diameter_mm: number;
  spacing_mm: number;
  spacing_confinement_mm: number | null;
  hook_angle_deg: number;
  leg_count: number;
  crossties: number;
};

export type ElementType = 'column' | 'beam' | 'slab' | 'shear_wall' | 'stair' | 'foundation';

export type Column = {
  id: string;
  element_type: 'column';
  floor: string;
  position?: Position2D | null;
  width_mm: number;
  depth_mm: number;
  longitudinal: RebarGroup[];
  stirrup: Stirrup;
  concrete_cover_mm: number;
  concrete_class: string;
};

export type Beam = {
  id: string;
  element_type: 'beam';
  floor: string;
  start?: Position2D | null;
  end?: Position2D | null;
  width_mm: number;
  depth_mm: number;
  top_rebar: RebarGroup[];
  bottom_rebar: RebarGroup[];
  stirrup: Stirrup;
  concrete_cover_mm: number;
  concrete_class: string;
};

export type Slab = {
  id: string;
  element_type: 'slab';
  floor: string;
  corners_m: Position2D[];
  thickness_mm: number;
  mesh_top: unknown | null;
  mesh_bottom: unknown | null;
  concrete_cover_mm: number;
  concrete_class: string;
};

export type ShearWall = {
  id: string;
  element_type: 'shear_wall';
  floor_from: string;
  floor_to: string;
  start?: Position2D | null;
  end?: Position2D | null;
  thickness_mm: number;
  length_m: number | null;
  vertical_rebar: RebarGroup[];
  horizontal_rebar: RebarGroup[];
  boundary_element_rebar: RebarGroup[];
  stirrup: Stirrup | null;
  concrete_cover_mm: number;
  concrete_class: string;
};

export type Stair = {
  id: string;
  element_type: 'stair';
  floor_from: string;
  floor_to: string;
  position?: Position2D | null;
  width_m: number | null;
  length_m: number | null;
  rebar: RebarGroup[];
  concrete_class: string;
};

export type StructuralElement = Column | Beam | Slab | ShearWall | Stair;

export type ProjectMetadata = {
  project_name: string;
  owner_name: string | null;
  contractor_name: string | null;
  engineer_name: string | null;
  engineer_license: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  country: string;
  coordinates: { latitude: number; longitude: number } | null;
  parcel_no: string | null;
  earthquake_zone: string | null;
  peak_ground_acceleration_g: number | null;
  soil_class: 'ZA' | 'ZB' | 'ZC' | 'ZD' | 'ZE' | null;
  seismic_design_class: string | null;
  floor_count: number | null;
  basement_count: number;
  default_floor_height_m: number;
  total_height_m: number | null;
  footprint_width_m: number | null;
  footprint_depth_m: number | null;
};

export type StructuralPlan = {
  metadata: ProjectMetadata;
  columns: Column[];
  beams: Beam[];
  slabs: Slab[];
  shear_walls: ShearWall[];
  stairs: Stair[];
  notes: string[];
  confidence: number;
};

export type Project = {
  id: string;
  plan: StructuralPlan;
  created_at: string;
};

export type AgentMessage = {
  id: string;
  timestamp: string;
  agent:
    | 'plan_parser'
    | 'geometry'
    | 'code'
    | 'fraud'
    | 'risk'
    | 'material'
    | 'cover'
    | 'moderator';
  kind: 'observation' | 'challenge' | 'rebuttal' | 'verdict';
  content: string;
  model?: string | null;
  evidence?: Record<string, unknown> | null;
};

export async function uploadProject(pdf: File): Promise<Project> {
  const fd = new FormData();
  fd.append('pdf', pdf);
  const res = await fetch(`${BACKEND_URL}/api/projects`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${BACKEND_URL}/api/projects`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type QuickFinding = {
  title: string;
  severity: 'fail' | 'warn' | 'info';
  bbox: { x: number; y: number; w: number; h: number };
  detail: string;
  ref: string | null;
};

export type QuickScanResult = {
  findings: QuickFinding[];
  elapsed_s: number;
  model: string;
};

export async function analyzeQuickPhoto(photo: File): Promise<QuickScanResult> {
  const fd = new FormData();
  fd.append('photo', photo);
  const res = await fetch(`${BACKEND_URL}/api/quick/analyze`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type InspectionRequest = {
  projectId: string;
  elementId: string;
  elementType?: ElementType;
  photos: File[];
  closeup?: File;
  cover?: File;
};

export function startInspectionStream(
  req: InspectionRequest,
  onMessage: (m: AgentMessage) => void,
  onError?: (e: Error) => void,
  onDone?: () => void,
): () => void {
  const fd = new FormData();
  fd.append('project_id', req.projectId);
  fd.append('element_id', req.elementId);
  fd.append('element_type', req.elementType || 'column');
  req.photos.forEach((p) => fd.append('photos', p));
  if (req.closeup) fd.append('closeup', req.closeup);
  if (req.cover) fd.append('cover', req.cover);

  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/inspections/stream`, {
        method: 'POST',
        body: fd,
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
          if (!dataLine) continue;
          try {
            const msg = JSON.parse(dataLine.slice(6)) as AgentMessage;
            onMessage(msg);
          } catch {
            // ignore malformed
          }
        }
      }
      onDone?.();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') onError?.(e as Error);
    }
  })();

  return () => controller.abort();
}
