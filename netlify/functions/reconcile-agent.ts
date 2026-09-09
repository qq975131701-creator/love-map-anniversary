import type { Config } from '@netlify/functions';

type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type DeepSeekChoice = {
  message?: {
    content?: string;
    reasoning_content?: string;
  };
  finish_reason?: string;
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
        '你是一个情侣吵架后帮助双方和好的中文情绪急救智能体。回答方式要像自然聊天里的聪明助手：先接住情绪，再中立分析，再给出可执行建议，也可以顺手生成能发给对方的话，但不要机械分成固定模块。你不做心理诊断，不评判谁对谁错，不鼓励操控、冷暴力、威胁或反复纠缠。输出必须是严格 json 对象，不要 Markdown，不要额外解释。answer 字段是主回答，可以自然分段。示例 json：{"answer":"我感觉你现在最难受的点，可能不是这件事本身，而是你觉得自己的感受没有被认真接住。\\n\\n这时候先别急着证明谁对谁错，可以先把关系放在前面。你可以发：我刚才情绪有点满，但我不是想和你吵，我其实很在乎你，也想好好听你说。","sharedCore":"你们都还在乎彼此，只是表达在情绪里变硬了。","trigger":"沟通节奏不一致。","needs":"一方想被理解，一方需要空间。","myNeed":"你想确认自己的感受被认真听见。","partnerNeed":"TA 可能也需要被温柔对待和一点缓冲。","avoidNow":"先不要翻旧账、追问结论或用冷话试探。","gentleScript":"我现在还有点委屈，但我想把话说软一点，我们慢慢讲。","repairAdvice":"先承认情绪，再表达在乎。","shortReply":"我不想和你冷着，我们慢慢说好吗？","sincereReply":"刚才我语气不好，但我真的很在乎你。","cuteReply":"我刚才有点笨笨的，可以重新好好说吗？","repairPlan":"先安静十分钟，再发一条软话；今晚只聊感受，不急着判对错。","nextStep":"先休息十分钟，再发一句软话。"}',
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: '根据情侣吵架经过，用自然问答方式给出一个智能回答，帮助用户理解原因、稳定情绪、找到和好的表达。不要按固定三段模板输出。',
        tonePreference: toneMap[tone] || toneMap.apology,
        currentMood: sanitizeText(payload.mood, 20),
        conflict,
        context: {
          anniversaries: payload.events,
          letters: payload.messages,
        },
        outputSchema: {
          answer: '主回答，像聊天助手一样自然完整地回答用户，可以分 2 到 4 个短段落，包含分析、建议和可发送的话，但不要出现固定小标题',
          sharedCore: '先安抚用户当前情绪，再用一句温柔的话概括双方共同在意的核心',
          trigger: '这次争执的导火索，保持中立',
          needs: '双方背后的真实需求，不能责怪任何一方',
          myNeed: '用户这边可能真正想要被满足的需求，用第二人称表达',
          partnerNeed: '对方这边可能真正想要被满足的需求，保持善意推测',
          avoidNow: '此刻先不要做的事，避免升级矛盾',
          gentleScript: '一段可以照着说的柔和开场白，不超过两句',
          repairAdvice: '此刻最适合做什么，具体、温柔、可执行',
          shortReply: '适合直接发送的短句版',
          sincereReply: '更认真完整的和好消息',
          cuteReply: '稍微可爱一点的和好消息',
          repairPlan: '未来 30 分钟的和好计划，按时间顺序但写成一句自然的话',
          nextStep: '未来 30 分钟内建议做的一步降温或靠近行动',
        },
        constraints: [
          '全部使用简体中文',
          'answer 控制在 260 到 520 字之间，语气温柔、聪明、像真实对话',
          'answer 不要使用“原因分析：”“解决方法：”“给对方的话：”这类固定标题',
          'sharedCore、trigger、needs、myNeed、partnerNeed、avoidNow、repairAdvice、nextStep 每个字段控制在 90 字以内',
          'gentleScript、sincereReply、repairPlan 每个字段控制在 140 字以内',
          'shortReply 和 cuteReply 每个字段控制在 70 字以内',
          '不要说教',
          '不要输出“你应该分手”这类结论',
          '不要把任何一方描述成坏人',
        ],
      }),
    },
  ];
}

async function callDeepSeek(apiKey: string, model: string, messages: DeepSeekMessage[], attempt: number) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      thinking: { type: 'disabled' },
      temperature: 0.7,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
      stream: false,
    }),
  });

  const data = await response.json() as DeepSeekResponse;
  const choice = data.choices?.[0];
  const contentLength = choice?.message?.content?.length ?? 0;

  console.info('reconcile-agent.deepseek-response', {
    attempt,
    model,
    ok: response.ok,
    status: response.status,
    contentLength,
    finishReason: choice?.finish_reason ?? null,
    hasReasoningContent: Boolean(choice?.message?.reasoning_content),
    hasError: Boolean(data.error),
  });

  return { response, data, content: choice?.message?.content ?? '' };
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
  const messages = buildMessages(payload);
  let { response, data, content } = await callDeepSeek(apiKey, model, messages, 1);

  if (response.ok && !content) {
    console.warn('reconcile-agent.empty-content-retry', { model });
    messages[1] = {
      ...messages[1],
      content: `${messages[1].content}\n\n请务必只返回一个非空 json 对象，不能返回空 content。`,
    };
    ({ response, data, content } = await callDeepSeek(apiKey, model, messages, 2));
  }

  if (!response.ok) {
    console.error('reconcile-agent.deepseek-error', {
      model,
      status: response.status,
      message: data.error?.message || 'DeepSeek API 调用失败',
    });
    return json({ error: data.error?.message || 'DeepSeek API 调用失败' }, { status: response.status });
  }

  if (!content) {
    console.error('reconcile-agent.empty-content-final', { model });
    return json({ error: '智能体没有返回内容，请稍后再试。' }, { status: 502 });
  }

  try {
    return json(extractJSON(content));
  } catch {
    console.error('reconcile-agent.invalid-json', { model, contentLength: content.length });
    return json({ error: '智能体返回格式暂时无法解析，请再试一次。' }, { status: 502 });
  }
};

export default handler;

export const config: Config = {
  method: ['POST', 'OPTIONS'],
  path: '/api/reconcile-agent',
};
