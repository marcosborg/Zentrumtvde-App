import { Capacitor } from '@capacitor/core';
import type { CandidateApplicationBootstrap, CandidateApplicationRecord } from '../types/candidate';
import type { FrontpagePayload } from '../types/frontpage';

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
export const candidateApplicationEndpoint = `${apiBaseUrl}/app/candidatura`;
export const candidateApplicationSaveEndpoint = `${apiBaseUrl}/app/candidatura/save`;
export const candidateApplicationSubmitEndpoint = `${apiBaseUrl}/app/candidatura/submit`;
export const candidateApplicationUploadEndpoint = `${apiBaseUrl}/app/candidatura/upload`;
export const chatSessionEndpoint = `${apiBaseUrl}/app/chat/session`;
export const chatMessageEndpoint = `${apiBaseUrl}/app/chat/message`;

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
