import { Capacitor } from '@capacitor/core';
import type { CandidateApplicationBootstrap, CandidateApplicationRecord } from '../types/candidate';
import type { FrontpagePayload } from '../types/frontpage';
import type {
  VehicleHandoverBootstrapPayload,
  VehicleHandoverCreatePayload,
  VehicleHandoverDetail,
} from '../types/handover';
import type { KanbanBoardPayload, KanbanContactPayload, KanbanTaskPayload, KanbanTaskSearchPayload } from '../types/kanban';
import type { ReservedOverviewPayload } from '../types/reserved';

const PRODUCTION_API_BASE_URL = 'https://zentrum-tvde.com';
const LOCAL_API_BASE_URL = 'http://127.0.0.1:8000';

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (Capacitor.isNativePlatform()) {
    return PRODUCTION_API_BASE_URL;
  }

  return LOCAL_API_BASE_URL;
}

const apiBaseUrl = resolveApiBaseUrl();

export const frontpageEndpoint = `${apiBaseUrl}/app/frontpage`;
export const contactEndpoint = `${apiBaseUrl}/app/contact`;
export const adminLoginUrl = `${apiBaseUrl}/admin/login`;
export const appLoginEndpoint = `${apiBaseUrl}/app/auth/login`;
export const appLogoutEndpoint = `${apiBaseUrl}/app/auth/logout`;
export const appDeviceRegisterEndpoint = `${apiBaseUrl}/app/devices/register`;
export const appDeviceUnregisterEndpoint = `${apiBaseUrl}/app/devices/unregister`;
export const candidateApplicationEndpoint = `${apiBaseUrl}/app/candidatura`;
export const candidateApplicationSaveEndpoint = `${apiBaseUrl}/app/candidatura/save`;
export const candidateApplicationSubmitEndpoint = `${apiBaseUrl}/app/candidatura/submit`;
export const candidateApplicationUploadEndpoint = `${apiBaseUrl}/app/candidatura/upload`;
export const chatSessionEndpoint = `${apiBaseUrl}/app/chat/session`;
export const chatMessageEndpoint = `${apiBaseUrl}/app/chat/message`;
export const kanbanEndpoint = `${apiBaseUrl}/app/kanban`;
export const reservedOpsEndpoint = `${apiBaseUrl}/app/ops/overview`;
export const reservedVehicleHandoversEndpoint = `${apiBaseUrl}/app/ops/vehicle-handovers`;

export type ContactFormPayload = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export type ContactFormResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export type CandidateApplicationPayload = {
  token: string;
  accepts_model: boolean;
  independent_driver: boolean;
  rental_terms_read: boolean;
  rental_terms_accept: boolean;
  has_tvde_course: boolean | '';
  certificate_valid: boolean | '';
  experience: string;
  platforms: string[];
  full_name: string;
  email: string;
  phone: string;
  nif: string;
  iban: string;
  rgpd: boolean;
  truth_declaration: boolean;
  contact_authorization: boolean;
  vehicle_type_id: number | '';
};

export type CandidateApplicationStepPayload = CandidateApplicationPayload & {
  step: string;
};

export type CandidateApplicationResponse = {
  status: string;
  token: string;
  application: CandidateApplicationRecord;
  message?: string;
  errors?: Record<string, string[]>;
};

export type WebsiteChatMessage = {
  role: 'assistant' | 'user';
  content: string;
  created_at: string;
};

export type WebsiteChatBootstrap = {
  enabled: boolean;
  session_token: string;
  assistant_name: string;
  messages: WebsiteChatMessage[];
};

export type WebsiteChatReply = {
  session_token: string;
  user_message: WebsiteChatMessage;
  assistant_message: WebsiteChatMessage;
};

export type AppAuthUser = {
  id: number;
  name: string;
  email: string;
};

export type AppLoginResponse = {
  authenticated: boolean;
  token: string;
  user: AppAuthUser;
  message?: string;
  errors?: Record<string, string[]>;
};

export type ApiMessageResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type AppDevicePayload = {
  token: string;
  platform: 'android';
  device_name?: string;
};

export async function fetchFrontpage(): Promise<FrontpagePayload> {
  const response = await fetch(frontpageEndpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'Endpoint /app/frontpage nao encontrado. Confirma se o Laravel local esta atualizado e em execucao.'
        : `Frontpage request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as FrontpagePayload;
}

export async function submitContactForm(
  payload: ContactFormPayload,
): Promise<ContactFormResponse> {
  const response = await fetch(contactEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as ContactFormResponse | null;

  if (!response.ok) {
    throw data ?? { message: 'Nao foi possivel enviar o pedido.' };
  }

  return data ?? { message: 'Pedido enviado com sucesso.' };
}

export async function loginReservedArea(email: string, password: string): Promise<AppLoginResponse> {
  const response = await fetch(appLoginEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = (await response.json().catch(() => null)) as AppLoginResponse | null;

  if (!response.ok || !data) {
    throw data ?? new Error('Nao foi possivel validar o acesso.');
  }

  return data;
}

async function authFetch(input: RequestInfo | URL, token: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

export async function logoutReservedArea(token: string): Promise<void> {
  await authFetch(appLogoutEndpoint, token, {
    method: 'POST',
  }).catch(() => undefined);
}

export async function registerAppDevice(token: string, payload: AppDevicePayload): Promise<ApiMessageResponse> {
  const response = await authFetch(appDeviceRegisterEndpoint, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as ApiMessageResponse | null;

  if (!response.ok) {
    throw new Error(data?.message || 'Nao foi possivel registar o dispositivo.');
  }

  return data ?? { message: 'Dispositivo registado.' };
}

export async function unregisterAppDevice(token: string, deviceToken: string): Promise<ApiMessageResponse> {
  const response = await authFetch(appDeviceUnregisterEndpoint, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: deviceToken,
    }),
  });

  const data = (await response.json().catch(() => null)) as ApiMessageResponse | null;

  if (!response.ok) {
    throw new Error(data?.message || 'Nao foi possivel remover o dispositivo.');
  }

  return data ?? { message: 'Dispositivo removido.' };
}

export async function fetchKanbanBoard(token: string, boardId?: number): Promise<KanbanBoardPayload> {
  const url = boardId ? `${kanbanEndpoint}?board_id=${boardId}` : kanbanEndpoint;
  const response = await authFetch(url, token, {
    method: 'GET',
  });

  const data = (await response.json().catch(() => null)) as KanbanBoardPayload | { message?: string } | null;

  if (!response.ok || !data || !('stages' in data)) {
    throw new Error((data && 'message' in data && data.message) || 'Nao foi possivel carregar o kanban.');
  }

  return data;
}

export async function fetchKanbanTask(token: string, taskId: number): Promise<KanbanTaskPayload> {
  const response = await authFetch(`${kanbanEndpoint}/tasks/${taskId}`, token, {
    method: 'GET',
  });

  const data = (await response.json().catch(() => null)) as KanbanTaskPayload | { message?: string } | null;

  if (!response.ok || !data || !('task' in data)) {
    throw new Error((data && 'message' in data && data.message) || 'Nao foi possivel carregar a tarefa.');
  }

  return data;
}

export async function searchKanbanTasks(token: string, query: string, boardId?: number): Promise<KanbanTaskSearchPayload> {
  const searchParams = new URLSearchParams({ q: query });

  if (boardId) {
    searchParams.set('board_id', String(boardId));
  }

  const response = await authFetch(`${kanbanEndpoint}/search?${searchParams.toString()}`, token, {
    method: 'GET',
  });

  const data = (await response.json().catch(() => null)) as KanbanTaskSearchPayload | { message?: string } | null;

  if (!response.ok || !data || !('results' in data)) {
    throw new Error((data && 'message' in data && data.message) || 'Nao foi possivel pesquisar tarefas.');
  }

  return data;
}

export async function addKanbanTaskComment(
  token: string,
  taskId: number,
  body: string,
  isInternal = true,
): Promise<KanbanTaskPayload> {
  const response = await authFetch(`${kanbanEndpoint}/tasks/${taskId}/comments`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body,
      is_internal: isInternal,
    }),
  });

  const data = (await response.json().catch(() => null)) as KanbanTaskPayload | { message?: string; errors?: Record<string, string[]> } | null;

  if (!response.ok || !data || !('task' in data)) {
    throw data ?? new Error('Nao foi possivel guardar a observacao.');
  }

  return data;
}

export async function moveKanbanTask(token: string, taskId: number, stageId: number): Promise<KanbanTaskPayload> {
  const response = await authFetch(`${kanbanEndpoint}/tasks/${taskId}/move`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stage_id: stageId,
    }),
  });

  const data = (await response.json().catch(() => null)) as KanbanTaskPayload | { message?: string; errors?: Record<string, string[]> } | null;

  if (!response.ok || !data || !('task' in data)) {
    throw data ?? new Error('Nao foi possivel mover a tarefa.');
  }

  return data;
}

export async function createKanbanContact(
  token: string,
  payload: { name: string; phone: string; email: string; board_id?: number },
): Promise<KanbanContactPayload> {
  const response = await authFetch(`${kanbanEndpoint}/contacts`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | KanbanContactPayload
    | { message?: string; errors?: Record<string, string[]> }
    | null;

  if (!response.ok || !data || !('task' in data)) {
    throw data ?? new Error('Nao foi possivel criar o contacto.');
  }

  return data;
}

export async function deleteKanbanTask(token: string, taskId: number): Promise<ApiMessageResponse> {
  const response = await authFetch(`${kanbanEndpoint}/tasks/${taskId}`, token, {
    method: 'DELETE',
  });

  const data = (await response.json().catch(() => null)) as ApiMessageResponse | null;

  if (!response.ok) {
    throw data ?? new Error('Nao foi possivel eliminar a tarefa.');
  }

  return data ?? { message: 'Tarefa eliminada.' };
}

export async function restoreKanbanTask(token: string, taskId: number, stageId: number): Promise<KanbanTaskPayload> {
  const response = await authFetch(`${kanbanEndpoint}/tasks/${taskId}/restore`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stage_id: stageId,
    }),
  });

  const data = (await response.json().catch(() => null)) as KanbanTaskPayload | { message?: string; errors?: Record<string, string[]> } | null;

  if (!response.ok || !data || !('task' in data)) {
    throw data ?? new Error('Nao foi possivel restaurar a tarefa.');
  }

  return data;
}

export async function fetchReservedOverview(token: string): Promise<ReservedOverviewPayload> {
  const response = await authFetch(reservedOpsEndpoint, token, {
    method: 'GET',
  });

  const data = (await response.json().catch(() => null)) as ReservedOverviewPayload | { message?: string } | null;

  if (!response.ok || !data || !('candidate_applications' in data)) {
    throw new Error((data && 'message' in data && data.message) || 'Nao foi possivel carregar a area reservada.');
  }

  return data;
}

export async function fetchVehicleHandoversBootstrap(token: string): Promise<VehicleHandoverBootstrapPayload> {
  const response = await authFetch(reservedVehicleHandoversEndpoint, token, {
    method: 'GET',
  });

  const data = (await response.json().catch(() => null)) as VehicleHandoverBootstrapPayload | { message?: string } | null;

  if (!response.ok || !data || !('recent_procedures' in data)) {
    throw new Error((data && 'message' in data && data.message) || 'Nao foi possivel carregar os procedimentos.');
  }

  return data;
}

export async function createVehicleHandover(token: string, payload: VehicleHandoverCreatePayload): Promise<VehicleHandoverDetail> {
  const response = await authFetch(reservedVehicleHandoversEndpoint, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | { procedure: VehicleHandoverDetail; message?: string; errors?: Record<string, string[]> }
    | { message?: string; errors?: Record<string, string[]> }
    | null;

  if (!response.ok || !data || !('procedure' in data)) {
    throw data ?? new Error('Nao foi possivel registar o procedimento.');
  }

  return data.procedure;
}

export async function fetchVehicleHandover(token: string, procedureId: number): Promise<VehicleHandoverDetail> {
  const response = await authFetch(`${reservedVehicleHandoversEndpoint}/${procedureId}`, token, {
    method: 'GET',
  });

  const data = (await response.json().catch(() => null)) as { procedure: VehicleHandoverDetail; message?: string } | { message?: string } | null;

  if (!response.ok || !data || !('procedure' in data)) {
    throw new Error((data && 'message' in data && data.message) || 'Nao foi possivel carregar o procedimento.');
  }

  return data.procedure;
}

export async function fetchCandidateApplication(token?: string): Promise<CandidateApplicationBootstrap> {
  const url = token
    ? `${candidateApplicationEndpoint}?token=${encodeURIComponent(token)}`
    : candidateApplicationEndpoint;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel carregar a candidatura.');
  }

  return (await response.json()) as CandidateApplicationBootstrap;
}

export async function saveCandidateApplicationStep(
  payload: CandidateApplicationStepPayload,
): Promise<CandidateApplicationResponse> {
  const response = await fetch(candidateApplicationSaveEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as CandidateApplicationResponse | null;

  if (!response.ok || !data) {
    throw data ?? new Error('Nao foi possivel guardar a candidatura.');
  }

  return data;
}

export async function submitCandidateApplication(
  payload: CandidateApplicationPayload,
): Promise<CandidateApplicationResponse> {
  const response = await fetch(candidateApplicationSubmitEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as CandidateApplicationResponse | null;

  if (!response.ok || !data) {
    throw data ?? new Error('Nao foi possivel submeter a candidatura.');
  }

  return data;
}

export async function uploadCandidateApplicationFile(
  token: string,
  field: string,
  file: File,
): Promise<CandidateApplicationResponse> {
  const formData = new FormData();
  formData.append('token', token);
  formData.append('field', field);
  formData.append('file', file);

  const response = await fetch(candidateApplicationUploadEndpoint, {
    method: 'POST',
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as CandidateApplicationResponse | null;

  if (!response.ok || !data) {
    throw data ?? new Error('Nao foi possivel enviar o ficheiro.');
  }

  return data;
}

export async function startWebsiteChat(sessionToken?: string | null): Promise<WebsiteChatBootstrap> {
  const response = await fetch(chatSessionEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_token: sessionToken || null,
    }),
  });

  const data = (await response.json().catch(() => null)) as WebsiteChatBootstrap | null;

  if (!response.ok || !data) {
    throw new Error('Nao foi possivel iniciar o chat.');
  }

  return data;
}

export async function sendWebsiteChatMessage(
  sessionToken: string,
  message: string,
): Promise<WebsiteChatReply> {
  const response = await fetch(chatMessageEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_token: sessionToken,
      message,
    }),
  });

  const data = (await response.json().catch(() => null)) as WebsiteChatReply | null;

  if (!response.ok || !data) {
    throw new Error('Nao foi possivel enviar a mensagem.');
  }

  return data;
}
