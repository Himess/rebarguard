export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export type StructuralPlan = {
  project_name: string;
  address: string | null;
  earthquake_zone: string | null;
  soil_class: string | null;
  columns: Column[];
  notes: string[];
  confidence: number;
};

export type Column = {
  id: string;
  floor: string;
  width_mm: number;
  depth_mm: number;
  longitudinal: { count: number; diameter_mm: number; steel_class: string }[];
  stirrup: {
    diameter_mm: number;
    spacing_mm: number;
    spacing_confinement_mm: number | null;
    hook_angle_deg: number;
    leg_count: number;
    crossties: number;
  };
  concrete_cover_mm: number;
  concrete_class: string;
};

export type Project = {
  id: string;
  name: string;
  address: string | null;
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

export type InspectionRequest = {
  projectId: string;
  columnId: string;
  city?: string;
  soilClass?: string;
  floors?: number;
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
  fd.append('column_id', req.columnId);
  if (req.city) fd.append('city', req.city);
  if (req.soilClass) fd.append('soil_class', req.soilClass);
  if (req.floors) fd.append('floors', String(req.floors));
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
          const dataLine = part
            .split('\n')
            .find((l) => l.startsWith('data: '));
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
