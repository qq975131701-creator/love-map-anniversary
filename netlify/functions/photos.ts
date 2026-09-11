import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';

const headers = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
      ...init?.headers,
    },
  });
}

function getSpace(value: FormDataEntryValue | null) {
  const rawSpace = typeof value === 'string' ? value : 'our-love-map';
  const normalized = rawSpace.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64);
  return normalized || 'our-love-map';
}

function getExtension(contentType: string, name: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  const match = name.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match?.[1] || 'jpg';
}

function isSafePhotoKey(key: string) {
  return /^photos\/[a-z0-9_-]+\/[a-z0-9-]+\.[a-z0-9]+$/i.test(key);
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const store = getStore({ name: 'love-map-photos', consistency: 'strong' });

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const key = url.searchParams.get('key') || '';
      if (!isSafePhotoKey(key)) return json({ error: 'Invalid photo key' }, { status: 400 });

      const [data, metadata] = await Promise.all([
        store.get(key, { type: 'arrayBuffer' }),
        store.getMetadata(key),
      ]);
      if (!data) return json({ error: 'Photo not found' }, { status: 404 });

      return new Response(data, {
        headers: {
          ...headers,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': typeof metadata?.metadata?.contentType === 'string' ? metadata.metadata.contentType : 'image/jpeg',
        },
      });
    }

    if (req.method === 'POST') {
      const formData = await req.formData();
      const file = formData.get('photo');
      if (!(file instanceof File)) return json({ error: '请选择一张照片' }, { status: 400 });
      if (!file.type.startsWith('image/')) return json({ error: '只支持图片文件' }, { status: 400 });
      if (file.size > 6_000_000) return json({ error: '照片太大了，请压缩到 6MB 以内' }, { status: 413 });

      const space = getSpace(formData.get('space'));
      const id = crypto.randomUUID();
      const extension = getExtension(file.type, file.name);
      const key = `photos/${space}/${id}.${extension}`;
      const createdAt = new Date().toISOString();
      const data = await file.arrayBuffer();

      await store.set(key, data, {
        metadata: {
          contentType: file.type || 'image/jpeg',
          name: file.name || 'photo',
          size: file.size,
          createdAt,
        },
      });

      return json({
        id,
        key,
        url: `/api/photos?key=${encodeURIComponent(key)}`,
        name: file.name || 'photo',
        contentType: file.type || 'image/jpeg',
        size: file.size,
        createdAt,
      });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '照片服务暂时不可用' }, { status: 500 });
  }
}

export const config: Config = {
  method: ['GET', 'POST', 'OPTIONS'],
  path: '/api/photos',
};
