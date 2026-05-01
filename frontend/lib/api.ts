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
    | 'moderator'
    | 'municipality';
  kind: 'observation' | 'challenge' | 'rebuttal' | 'verdict';
  content: string;
  model?: string | null;
  evidence?: Record<string, unknown> | null;
};

export type InspectionStage =
  | 'foundation'
  | 'ground_floor'
  | 'mid_floor'
  | 'roof'
  | 'other';

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
  confidence: number;
};

export type RegulationArticle = {
  code: string;
  document: 'TBDY 2018' | 'TS 500';
  chapter: string;
  title_en: string;
  title_tr: string;
  text_en: string;
  text_tr: string;
  source: 'document' | 'summary';
  tags: string[];
};

export async function fetchArticle(code: string): Promise<RegulationArticle> {
  const safe = encodeURIComponent(code);
  const res = await fetch(`${BACKEND_URL}/api/regulations/${safe}`);
  if (!res.ok) throw new Error(`article ${code} not found`);
  return res.json();
}

export type QuickScanResult = {
  findings: QuickFinding[];
  elapsed_s: number;
  model: string;
};

// ----------------------------- complaints --------------------------------

export type ComplaintAddress = {
  parcel_no?: string | null;
  district?: string | null;
  city?: string;
  full_address?: string | null;
  contractor_name?: string | null;
  apartment_no?: string | null;
};

export type ComplaintDraft = {
  findings: QuickFinding[];
  address: ComplaintAddress;
  grade: number;
  note?: string;
  citizen_name?: string | null;
  citizen_contact?: string | null;
};

export type ComplaintSubmitResponse = {
  tracking_id: string;
  submitted_at: string;
  status: string;
  eta_days: number;
  message: string;
};

export async function downloadComplaintPdf(draft: ComplaintDraft): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/api/complaints/draft-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error(`PDF generation failed (${res.status})`);
  return res.blob();
}

export async function submitComplaint(
  draft: ComplaintDraft,
): Promise<ComplaintSubmitResponse> {
  const res = await fetch(`${BACKEND_URL}/api/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ----------------------------- audit log ---------------------------------

export type AuditRow = Record<string, unknown> & {
  event?: string;
  ts?: string;
  session_id?: string | null;
  model?: string | null;
  source?: string | null;
};

export type AuditLogResponse = {
  log_path: string;
  count: number;
  summary: Record<string, number>;
  rows: AuditRow[];
};

export async function fetchAuditLog(
  limit = 50,
  event?: string,
): Promise<AuditLogResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (event) params.set('event', event);
  const res = await fetch(`${BACKEND_URL}/api/audit/log?${params}`);
  if (!res.ok) throw new Error(`audit log fetch failed (${res.status})`);
  return res.json();
}

// ----------------------------- demo replay ------------------------------

// ----------------------------- citizen chat ------------------------------

export type ChatMeta = {
  severity: 'ok' | 'moderate' | 'high';
  suggest_complaint: boolean;
};

export type ChatStreamEvent =
  | { kind: 'meta'; conversation_id: string; session_resumed: boolean; model: string }
  | { kind: 'thinking'; phase: string }
  | {
      kind: 'message';
      conversation_id: string;
      session_id: string | null;
      content: string;
      meta: ChatMeta;
      model: string;
    }
  | { kind: 'error'; error: string }
  | { kind: 'done' };

export function sendChatMessage(
  message: string,
  onEvent: (e: ChatStreamEvent) => void,
  options: {
    conversationId?: string;
    photo?: File | null;
    onError?: (e: Error) => void;
    onDone?: () => void;
  } = {},
): () => void {
  const fd = new FormData();
  fd.append('message', message);
  if (options.conversationId) fd.append('conversation_id', options.conversationId);
  if (options.photo) fd.append('photo', options.photo);
  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/stream`, {
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
        // sse-starlette emits CRLF separators on Fly; normalise so `\n\n`
        // splits actually find event boundaries.
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const eventLine = part.split('\n').find((l) => l.startsWith('event: '));
          const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
          if (!dataLine) continue;
          const evtName = (eventLine?.slice(7) || 'message').trim();
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }
          onEvent({ kind: evtName as ChatStreamEvent['kind'], ...payload } as ChatStreamEvent);
        }
      }
      options.onDone?.();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') options.onError?.(e as Error);
    }
  })();
  return () => controller.abort();
}

export async function resetChat(conversationId: string): Promise<void> {
  await fetch(`${BACKEND_URL}/api/chat/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
  });
}

// ----------------------------- video analysis ----------------------------

export type VideoFinding = {
  timestamp_s: number;
  title: string;
  severity: 'fail' | 'warn' | 'info';
  detail: string;
  ref: string | null;
  confidence: number;
};

export type VideoScanResult = {
  findings: VideoFinding[];
  duration_s: number | null;
  summary_en: string;
  summary_tr: string;
  elapsed_s: number;
  model: string;
  source: 'live' | 'demo_fallback';
};

export async function analyzeVideo(video: File): Promise<VideoScanResult> {
  const fd = new FormData();
  fd.append('video', video);
  const res = await fetch(`${BACKEND_URL}/api/video/analyze`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchVideoDemo(): Promise<VideoScanResult> {
  const res = await fetch(`${BACKEND_URL}/api/video/demo`);
  if (!res.ok) throw new Error(`video demo fetch failed (${res.status})`);
  return res.json();
}

export function startReplayStream(
  scenario: string,
  onMessage: (m: AgentMessage) => void,
  onError?: (e: Error) => void,
  onDone?: () => void,
  speed = 1.0,
): () => void {
  const controller = new AbortController();
  (async () => {
    try {
      const url = `${BACKEND_URL}/api/demo/replay/${encodeURIComponent(scenario)}?speed=${speed}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        // SSE separator is two CRLFs per the spec; sse-starlette emits CRLF
        // line endings on Fly. Normalise to LF so we can split on `\n\n`.
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
          if (!dataLine) continue;
          try {
            const obj = JSON.parse(dataLine.slice(6)) as AgentMessage & {
              timestamp?: string;
            };
            // Replay events don't carry a timestamp; synth one so downstream
            // `new Date(m.timestamp)` math doesn't NaN out.
            if (!obj.timestamp) obj.timestamp = new Date().toISOString();
            onMessage(obj);
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
  stage?: InspectionStage;
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
  fd.append('stage', req.stage || 'other');
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
        // Normalise CRLF → LF; sse-starlette emits CRLF on Fly which would
        // otherwise leave `\n\n`-based splits permanently empty.
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
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
