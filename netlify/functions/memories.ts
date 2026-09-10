import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';

type Anniversary = {
  id: string;
  title: string;
  date: string;
  category: string;
  note: string;
  emoji: string;
};

type MessageKind = 'whisper' | 'capsule';
type DeliveryMode = 'now' | 'scheduled' | 'anniversary' | 'meeting' | 'location';

type SecretMessage = {
  id: string;
  kind: MessageKind;
  to: string;
  title: string;
  body: string;
  createdAt: string;
  deliveryMode: DeliveryMode;
  openAt?: string;
  anniversaryId?: string;
  locationName?: string;
  meetingLabel?: string;
};

type ReconcileRoomRole = 'userA' | 'userB' | 'bot';

type ReconcileChatMessage = {
  id: string;
  role: ReconcileRoomRole;
  title?: string;
  body: string;
  action?: string;
  createdAt: string;
};

type ReconcileSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ReconcileChatMessage[];
};

type SharedMemoryData = {
  events: Anniversary[];
  messages: SecretMessage[];
  reconcileChats: ReconcileChatMessage[];
  reconcileSessions: ReconcileSession[];
  updatedAt?: string;
};

const headers = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...headers,
      ...init?.headers,
    },
  });
}

function getSpace(req: Request) {
  const url = new URL(req.url);
  const rawSpace = url.searchParams.get('space') ?? 'our-love-map';
  const normalized = rawSpace.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64);
  return normalized || 'our-love-map';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sanitizeText(value: unknown, fallback = '', maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || fallback : fallback;
}

function sanitizeEvents(value: unknown): Anniversary[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 300).flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = sanitizeText(item.id, crypto.randomUUID(), 80);
    const title = sanitizeText(item.title, '', 80);
    const date = sanitizeText(item.date, '', 10);
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

    return [
      {
        id,
        title,
        date,
        category: sanitizeText(item.category, '重要', 40),
        note: sanitizeText(item.note, '', 800),
        emoji: sanitizeText(item.emoji, '💗', 8),
      },
    ];
  });
}

function sanitizeMessages(value: unknown): SecretMessage[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 500).flatMap((item) => {
    if (!isRecord(item)) return [];
    const kind = item.kind === 'capsule' ? 'capsule' : 'whisper';
    const deliveryModes = new Set(['now', 'scheduled', 'anniversary', 'meeting', 'location']);
    const deliveryMode = typeof item.deliveryMode === 'string' && deliveryModes.has(item.deliveryMode) ? item.deliveryMode as DeliveryMode : 'now';
    const body = sanitizeText(item.body, '', 2000);
    if (!body) return [];

    return [
      {
        id: sanitizeText(item.id, crypto.randomUUID(), 80),
        kind,
        to: sanitizeText(item.to, kind === 'capsule' ? '未来的我们' : '对方', 60),
        title: sanitizeText(item.title, kind === 'capsule' ? '给未来的一封信' : '悄悄话', 80),
        body,
        createdAt: sanitizeText(item.createdAt, new Date().toISOString(), 30),
        deliveryMode,
        openAt: sanitizeText(item.openAt, '', 30) || undefined,
        anniversaryId: sanitizeText(item.anniversaryId, '', 80) || undefined,
        locationName: sanitizeText(item.locationName, '', 80) || undefined,
        meetingLabel: sanitizeText(item.meetingLabel, '', 40) || undefined,
      },
    ];
  });
}

function sanitizeReconcileChats(value: unknown): ReconcileChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value.slice(-600).flatMap((item) => {
    if (!isRecord(item)) return [];
    const role = item.role === 'userB' ? 'userB' : item.role === 'bot' ? 'bot' : 'userA';
    const body = sanitizeText(item.body, '', 4000);
    if (!body) return [];

    return [
      {
        id: sanitizeText(item.id, crypto.randomUUID(), 80),
        role,
        title: sanitizeText(item.title, role === 'bot' ? '桃桃' : '', 40) || undefined,
        body,
        action: sanitizeText(item.action, '', 800) || undefined,
        createdAt: sanitizeText(item.createdAt, new Date().toISOString(), 30),
      },
    ];
  });
}

function sanitizeReconcileSessions(value: unknown): ReconcileSession[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 80).flatMap((item) => {
    if (!isRecord(item)) return [];
    const messages = sanitizeReconcileChats(item.messages);
    if (!messages.length) return [];

    return [
      {
        id: sanitizeText(item.id, crypto.randomUUID(), 80),
        title: sanitizeText(item.title, '新的和好房间', 80),
        createdAt: sanitizeText(item.createdAt, messages[0]?.createdAt || new Date().toISOString(), 30),
        updatedAt: sanitizeText(item.updatedAt, messages.at(-1)?.createdAt || new Date().toISOString(), 30),
        messages,
      },
    ];
  });
}

async function readSpace(space: string) {
  const store = getStore({ name: 'love-map-shared', consistency: 'strong' });
  const data = await store.get(`spaces/${space}.json`, { type: 'json' });

  if (!isRecord(data)) {
    return {
      empty: true,
      space,
      events: [],
      messages: [],
      reconcileChats: [],
      reconcileSessions: [],
      updatedAt: null,
    };
  }

  const reconcileSessions = sanitizeReconcileSessions(data.reconcileSessions);
  const reconcileChats = sanitizeReconcileChats(data.reconcileChats);

  return {
    empty: false,
    space,
    events: sanitizeEvents(data.events),
    messages: sanitizeMessages(data.messages),
    reconcileChats,
    reconcileSessions,
    updatedAt: sanitizeText(data.updatedAt, '', 40) || null,
  };
}

async function writeSpace(space: string, payload: unknown) {
  if (!isRecord(payload)) {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const store = getStore({ name: 'love-map-shared', consistency: 'strong' });
  const data: SharedMemoryData = {
    events: sanitizeEvents(payload.events),
    messages: sanitizeMessages(payload.messages),
    reconcileChats: sanitizeReconcileChats(payload.reconcileChats),
    reconcileSessions: sanitizeReconcileSessions(payload.reconcileSessions),
    updatedAt: new Date().toISOString(),
  };

  await store.setJSON(`spaces/${space}.json`, data);
  return json({ ...data, empty: false, space });
}

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const space = getSpace(req);

  try {
    if (req.method === 'GET') {
      return json(await readSpace(space));
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      return writeSpace(space, await req.json());
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Unexpected server error',
      },
      { status: 500 },
    );
  }
};

export default handler;

export const config: Config = {
  method: ['GET', 'PUT', 'POST', 'OPTIONS'],
  path: '/api/memories',
};
