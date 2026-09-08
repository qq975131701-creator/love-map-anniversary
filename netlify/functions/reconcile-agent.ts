import type { Config } from '@netlify/functions';

type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type DeepSeekChoice = {
  message?: {
    content?: string;
  };
};

type DeepSeekResponse = {
  choices?: DeepSeekChoice[];
  error?: {
    message?: string;
  };
};

declare const Netlify: {
  env: {
    get(name: string): string | undefined;
  };
};

const headers = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sanitizeText(value: unknown, maxLength = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function extractJSON(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || content.match(/\{[\s\S]*\}/)?.[0] || content;
  return JSON.parse(candidate);
}

function buildMessages(payload: Record<string, unknown>): DeepSeekMessage[] {
  const toneMap: Record<string, string> = {
    apology: '先承认自己可能伤到对方，再表达在乎',
    explain: '先解释自己的感受，但避免辩解和指责',
    soft: '语气更柔软一点，可以轻微撒娇，但不要敷衍',
    meet: '先提出见面或语音沟通，让关系降温',
  };
  const tone = sanitizeText(payload.tone, 24);
  const conflict = sanitizeText(payload.conflict, 6000);

  return [
    {
      role: 'system',
      content:
        '你是一个情侣吵架后帮助双方和好的中文情绪急救智能体。你不做心理诊断，不评判谁对谁错，不鼓励操控、冷暴力、威胁或反复纠缠。你的目标是先降温，再把刺人的表达翻译成真实需要，并给出温柔、可执行的和好建议。输出必须是严格 JSON，不要 Markdown，不要额外解释。',
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: '根据情侣吵架经过，生成降温后的中立理解、快捷建议和一句可发送的和好表达。',
        tonePreference: toneMap[tone] || toneMap.apology,
        currentMood: sanitizeText(payload.mood, 20),
        conflict,
        context: {
          anniversaries: payload.events,
          letters: payload.messages,
        },
        outputSchema: {
          sharedCore: '先安抚用户当前情绪，再用一句温柔的话概括双方共同在意的核心',
          trigger: '这次争执的导火索，保持中立',
          needs: '双方背后的真实需求，不能责怪任何一方',
          repairAdvice: '此刻最适合做什么，具体、温柔、可执行',
          shortReply: '适合直接发送的短句版',
          sincereReply: '更认真完整的和好消息',
          cuteReply: '稍微可爱一点的和好消息',
          nextStep: '未来 30 分钟内建议做的一步降温或靠近行动',
        },
        constraints: [
          '全部使用简体中文',
          '每个字段控制在 90 字以内',
          '不要说教',
          '不要输出“你应该分手”这类结论',
          '不要把任何一方描述成坏人',
        ],
      }),
    },
  ];
}

const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const apiKey = Netlify.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    return json({ error: '还没有配置 DEEPSEEK_API_KEY，配置后智能体就能开始分析。' }, { status: 503 });
  }

  const payload = await req.json();
  if (!isRecord(payload) || !sanitizeText(payload.conflict)) {
    return json({ error: '请先输入吵架经过或聊天记录。' }, { status: 400 });
  }

  const model = Netlify.env.get('DEEPSEEK_MODEL') || 'deepseek-v4-flash';
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(payload),
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json() as DeepSeekResponse;
  if (!response.ok) {
    return json({ error: data.error?.message || 'DeepSeek API 调用失败' }, { status: response.status });
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return json({ error: '智能体没有返回内容，请稍后再试。' }, { status: 502 });
  }

  try {
    return json(extractJSON(content));
  } catch {
    return json({ error: '智能体返回格式暂时无法解析，请再试一次。' }, { status: 502 });
  }
};

export default handler;

export const config: Config = {
  method: ['POST', 'OPTIONS'],
  path: '/api/reconcile-agent',
};
