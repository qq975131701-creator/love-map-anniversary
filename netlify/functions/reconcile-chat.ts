import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';

type ReconcileRoomRole = 'userA' | 'userB' | 'bot';

type ReconcileChatMessage = {
  id: string;
  role: ReconcileRoomRole;
  title?: string;
  body: string;
  action?: string;
  createdAt: string;
};

const headers = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sanitizeText(value: unknown, fallback = '', maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || fallback : fallback;
}

function sanitizeKeyPart(value: unknown, fallback: string) {
  const normalized = sanitizeText(value, fallback, 100)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function getQuery(req: Request) {
  const url = new URL(req.url);
  return {
    space: sanitizeKeyPart(url.searchParams.get('space'), 'our-love-map'),
    sessionId: sanitizeKeyPart(url.searchParams.get('session'), 'default-session'),
  };
}

function sanitizeMessage(value: unknown, serverCreatedAt?: string): ReconcileChatMessage | null {
  if (!isRecord(value)) return null;
  const body = sanitizeText(value.body, '', 4000);
  if (!body) return null;
  const role: ReconcileRoomRole = value.role === 'userB' ? 'userB' : value.role === 'bot' ? 'bot' : 'userA';

  return {
    id: sanitizeKeyPart(value.id, crypto.randomUUID()),
    role,
    title: sanitizeText(value.title, role === 'bot' ? '桃桃' : '', 40) || undefined,
    body,
    action: sanitizeText(value.action, '', 800) || undefined,
    createdAt: serverCreatedAt || sanitizeText(value.createdAt, new Date().toISOString(), 40),
  };
}

function sessionPrefix(space: string, sessionId: string) {
  return `rooms/${space}/sessions/${sessionId}`;
}

async function readSession(space: string, sessionId: string) {
  const store = getStore({ name: 'love-map-reconcile-chat', consistency: 'strong' });
  const prefix = sessionPrefix(space, sessionId);
  const [listing, clearRecord] = await Promise.all([
    store.list({ prefix: `${prefix}/messages/` }),
    store.get(`${prefix}/clear.json`, { type: 'json' }),
  ]);
  const clearedAt = isRecord(clearRecord) ? sanitizeText(clearRecord.clearedAt, '', 40) || null : null;
  const clearedTime = clearedAt ? new Date(clearedAt).getTime() : 0;
  const records = await Promise.all(
    listing.blobs.slice(-600).map((blob) => store.get(blob.key, { type: 'json' })),
  );
  const messages = records
    .map((record) => sanitizeMessage(record))
    .filter((message): message is ReconcileChatMessage => Boolean(message))
    .filter((message) => !clearedTime || new Date(message.createdAt).getTime() > clearedTime)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return {
    initialized: listing.blobs.length > 0 || Boolean(clearedAt),
    sessionId,
    clearedAt,
    messages,
  };
}

async function writeMessage(space: string, sessionId: string, payload: Record<string, unknown>) {
  const message = sanitizeMessage(payload.message, new Date().toISOString());
  if (!message) return json({ error: '消息内容不能为空' }, { status: 400 });

  const store = getStore({ name: 'love-map-reconcile-chat', consistency: 'strong' });
  const prefix = sessionPrefix(space, sessionId);
  const sortableTime = String(Date.now()).padStart(13, '0');
  await store.setJSON(`${prefix}/messages/${sortableTime}-${message.id}.json`, message);
  return json({ ok: true, message });
}

async function clearSession(space: string, sessionId: string) {
  const clearedAt = new Date().toISOString();
  const store = getStore({ name: 'love-map-reconcile-chat', consistency: 'strong' });
  await store.setJSON(`${sessionPrefix(space, sessionId)}/clear.json`, { clearedAt });
  return json({ ok: true, clearedAt });
}

async function bootstrapSession(space: string, sessionId: string, payload: Record<string, unknown>) {
  const store = getStore({ name: 'love-map-reconcile-chat', consistency: 'strong' });
  const prefix = sessionPrefix(space, sessionId);
  const [listing, clearRecord] = await Promise.all([
    store.list({ prefix: `${prefix}/messages/` }),
    store.get(`${prefix}/clear.json`, { type: 'json' }),
  ]);
  if (listing.blobs.length || clearRecord) return json(await readSession(space, sessionId));

  const inputMessages = Array.isArray(payload.messages) ? payload.messages.slice(-600) : [];
  const messages = inputMessages
    .map((message) => sanitizeMessage(message))
    .filter((message): message is ReconcileChatMessage => Boolean(message));
  await Promise.all(messages.map((message, index) => {
    const time = new Date(message.createdAt).getTime();
    const sortableTime = String(Number.isFinite(time) ? time : Date.now() + index).padStart(13, '0');
    return store.setJSON(`${prefix}/messages/${sortableTime}-${message.id}.json`, message);
  }));
  return json(await readSession(space, sessionId));
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers });

  try {
    if (req.method === 'GET') {
      const { space, sessionId } = getQuery(req);
      return json(await readSession(space, sessionId));
    }

    if (req.method === 'POST') {
      const payload = await req.json();
      if (!isRecord(payload)) return json({ error: '请求格式不正确' }, { status: 400 });
      const space = sanitizeKeyPart(payload.space, 'our-love-map');
      const sessionId = sanitizeKeyPart(payload.sessionId, 'default-session');
      if (payload.action === 'clear') return clearSession(space, sessionId);
      if (payload.action === 'send') return writeMessage(space, sessionId, payload);
      if (payload.action === 'bootstrap') return bootstrapSession(space, sessionId, payload);
      return json({ error: '不支持的聊天操作' }, { status: 400 });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('reconcile-chat failed', error);
    return json(
      { error: error instanceof Error ? error.message : '聊天服务暂时不可用' },
      { status: 500 },
    );
  }
}

export const config: Config = {
  method: ['GET', 'POST', 'OPTIONS'],
  path: '/api/reconcile-chat',
};
