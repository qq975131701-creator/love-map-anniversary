'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

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

type TabId = 'home' | 'timeline' | 'letters' | 'map' | 'more';
type CloudStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'saved' | 'local' | 'error';
type SharedMemoryData = {
  empty?: boolean;
  space?: string;
  events: Anniversary[];
  messages: SecretMessage[];
  updatedAt?: string | null;
};
type ReconcileResult = {
  sharedCore: string;
  trigger: string;
  needs: string;
  myNeed: string;
  partnerNeed: string;
  avoidNow: string;
  gentleScript: string;
  repairAdvice: string;
  shortReply: string;
  sincereReply: string;
  cuteReply: string;
  repairPlan: string;
  nextStep: string;
};

const storageKey = 'love-map-anniversaries-v2';
const messageStorageKey = 'love-map-secret-messages-v1';
const spaceStorageKey = 'love-map-space-code-v1';
const defaultSpaceCode = 'dadata-xiaoxiao';

const starterEvents: Anniversary[] = [
  {
    id: 'together-333',
    title: '在一起 333 天',
    date: '2025-06-08',
    category: '在一起',
    note: '大大塔小王 & 小小塔大王',
    emoji: '💗',
  },
  {
    id: 'birthday-10000',
    title: '第 10000 天',
    date: '2026-09-19',
    category: '人生里程碑',
    note: '1999.05.04 出生后的第 10000 天纪念日。',
    emoji: '🌸',
  },
  {
    id: 'anniversary-one',
    title: '一周年',
    date: '2026-06-08',
    category: '下一个里程碑',
    note: '把普通日子过成会发光的回忆。',
    emoji: '❤️',
  },
  {
    id: 'first-map',
    title: '爱的地图上线',
    date: '2026-08-30',
    category: '作品',
    note: '记录属于我们的甜蜜回忆。',
    emoji: '🗺️',
  },
];

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: '首页', icon: '⌂' },
  { id: 'timeline', label: '时间轴', icon: '◷' },
  { id: 'letters', label: '信件', icon: '✉' },
  { id: 'map', label: '和好', icon: '♡' },
  { id: 'more', label: '更多', icon: '⋯' },
];

const starterMessages: SecretMessage[] = [
  {
    id: 'first-whisper',
    kind: 'whisper',
    to: '小小塔大王',
    title: '今天也想你',
    body: '这是一封会立刻出现在收件箱里的悄悄话。',
    createdAt: '2026-08-30T12:00',
    deliveryMode: 'now',
  },
  {
    id: 'capsule-anniversary',
    kind: 'capsule',
    to: '未来的我们',
    title: '一周年再打开',
    body: '等到一周年那天，一起看看现在的我们有多可爱。',
    createdAt: '2026-08-30T12:08',
    deliveryMode: 'anniversary',
    anniversaryId: 'anniversary-one',
  },
];

const pad = (value: number) => String(value).padStart(2, '0');

function toLocalDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dayDiff(from: Date, to: Date) {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86400000);
}

function nextOccurrence(date: string, today: Date) {
  const original = parseLocalDate(date);
  let next = new Date(today.getFullYear(), original.getMonth(), original.getDate());
  if (dayDiff(today, next) < 0) {
    next = new Date(today.getFullYear() + 1, original.getMonth(), original.getDate());
  }
  return next;
}

function formatShortDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function formatFullChineseDate(value: Date) {
  return `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日`;
}

function formatMonthLabel(value: Date) {
  return `${value.getFullYear()}年${value.getMonth() + 1}月`;
}

function toDateTimeLocal(value: Date) {
  return `${toLocalDate(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function getMapPoint(index: number, total: number) {
  if (total <= 1) return { left: 50, top: 45 };

  const progress = index / Math.max(1, total - 1);
  const wave = Math.sin(progress * Math.PI * 3.2);
  return {
    left: 8 + progress * 84,
    top: 24 + ((index * 37) % 28) + wave * 10,
  };
}

export default function Home() {
  const [events, setEvents] = useState<Anniversary[]>(() => {
    if (typeof window === 'undefined') return starterEvents;

    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : starterEvents;
  });
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-09-19');
  const [category, setCategory] = useState('重要');
  const [note, setNote] = useState('');
  const [emoji, setEmoji] = useState('💗');
  const [previewDate, setPreviewDate] = useState(() => toLocalDate(new Date()));
  const [oldestFirst, setOldestFirst] = useState(true);
  const [selectedId, setSelectedId] = useState(starterEvents[0].id);
  const [messages, setMessages] = useState<SecretMessage[]>(() => {
    if (typeof window === 'undefined') return starterMessages;

    const saved = window.localStorage.getItem(messageStorageKey);
    return saved ? JSON.parse(saved) : starterMessages;
  });
  const [spaceCode, setSpaceCode] = useState(() => {
    if (typeof window === 'undefined') return defaultSpaceCode;

    return window.localStorage.getItem(spaceStorageKey) || defaultSpaceCode;
  });
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('idle');
  const [cloudMessage, setCloudMessage] = useState('共同空间准备中');
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const [messageKind, setMessageKind] = useState<MessageKind>('whisper');
  const [messageTo, setMessageTo] = useState('小小塔大王');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('now');
  const [openAt, setOpenAt] = useState(() => toDateTimeLocal(new Date()));
  const [capsuleEventId, setCapsuleEventId] = useState(starterEvents[2].id);
  const [locationName, setLocationName] = useState('下次见面的地方');
  const [arrivedLocation, setArrivedLocation] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date().getTime());
  const [composeOpen, setComposeOpen] = useState(false);
  const [eventComposerOpen, setEventComposerOpen] = useState(false);
  const [fightText, setFightText] = useState('');
  const [fightTone, setFightTone] = useState<'apology' | 'explain' | 'soft' | 'meet'>('apology');
  const [fightMood, setFightMood] = useState('委屈');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState('');
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<ReconcileResult>({
    sharedCore: '你们都想被在乎，只是表达方式在情绪里变硬了。',
    trigger: '沟通节奏不一致，加上期待没有被及时看见。',
    needs: '一方需要被理解，另一方可能需要一点空间和确定感。',
    myNeed: '你可能想确认自己被认真听见，而不是被一句话带过去。',
    partnerNeed: 'TA 可能也想被温柔对待，并希望对话不要继续升级。',
    avoidNow: '先不要翻旧账、连续追问或用冷话试探，对方越紧张越难靠近。',
    gentleScript: '我现在还有点委屈，但我想先把话说软一点。我们都慢慢讲，我会认真听你。',
    repairAdvice: '先承认情绪，再表达在乎，最后约一个轻松时刻继续聊。',
    shortReply: '我不想和你冷着，我刚才语气不好。我们慢慢说，好吗？',
    sincereReply: '刚才我有点被情绪带着走了，说话可能让你不舒服。其实我很在乎你，也想认真听听你的感受。',
    cuteReply: '我刚才有点笨笨的，但我真的不想和你不开心。可以给我一个重新好好说话的机会吗？',
    repairPlan: '先各自安静 10 分钟，再发一条软话；如果对方愿意，今晚只聊感受，不急着判定谁对谁错。',
    nextStep: '10 分钟后发一句软话，今晚只确认彼此还在乎，明天再复盘细节。',
  });
  const [mapScale, setMapScale] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    window.localStorage.setItem(messageStorageKey, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    window.localStorage.setItem(spaceStorageKey, spaceCode);
  }, [spaceCode]);

  useEffect(() => {
    const normalizedSpace = spaceCode.trim() || defaultSpaceCode;
    const controller = new AbortController();

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setCloudHydrated(false);
      setCloudStatus('loading');
      setCloudMessage('正在连接共同空间');
    });

    fetch(`/api/memories?space=${encodeURIComponent(normalizedSpace)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('共同空间连接失败');
        return response.json() as Promise<SharedMemoryData>;
      })
      .then((payload) => {
        if (!payload.empty) {
          setEvents(payload.events);
          setMessages(payload.messages);
          setSelectedId(payload.events[0]?.id ?? starterEvents[0].id);
        }

        setCloudHydrated(true);
        setCloudStatus(payload.empty ? 'ready' : 'saved');
        setCloudMessage(payload.empty ? '已创建共同空间，将自动保存' : '已同步共同空间');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCloudHydrated(false);
        setCloudStatus('local');
        setCloudMessage('当前使用本机数据，部署到 Netlify 后会自动同步');
      });

    return () => controller.abort();
  }, [spaceCode]);

  useEffect(() => {
    if (!cloudHydrated) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      const normalizedSpace = spaceCode.trim() || defaultSpaceCode;
      setCloudStatus('saving');
      setCloudMessage('正在保存到共同空间');

      fetch(`/api/memories?space=${encodeURIComponent(normalizedSpace)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events, messages }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('保存失败');
          setCloudStatus('saved');
          setCloudMessage('已保存到共同空间');
        })
        .catch(() => {
          setCloudStatus('error');
          setCloudMessage('云端保存失败，本机仍已保留');
        });
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [cloudHydrated, events, messages, spaceCode]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date().getTime()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const today = useMemo(
    () => (previewDate ? parseLocalDate(previewDate) : new Date()),
    [previewDate],
  );

  const enriched = useMemo(
    () =>
      events
        .map((event) => {
          const originalDate = parseLocalDate(event.date);
          const nextDate = nextOccurrence(event.date, today);
          const daysUntil = dayDiff(today, nextDate);
          const daysPassed = Math.max(0, dayDiff(originalDate, today));
          return { ...event, originalDate, nextDate, daysUntil, daysPassed };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil),
    [events, today],
  );

  const todaysEvents = enriched.filter((event) => event.daysUntil === 0);
  const featured = enriched.find((event) => event.id === selectedId) ?? enriched[0];
  const nextMilestone = enriched.find((event) => event.daysUntil > 0) ?? featured;
  const pathEvents = enriched;
  const timelineGroups = useMemo(() => {
    const sorted = events
      .map((event, index) => {
        const originalDate = parseLocalDate(event.date);
        return {
          ...event,
          originalDate,
          daysPassed: Math.max(0, dayDiff(originalDate, today)),
          imageClass: `memory-photo-${(index % 4) + 1}`,
        };
      })
      .sort((a, b) =>
        oldestFirst
          ? a.originalDate.getTime() - b.originalDate.getTime()
          : b.originalDate.getTime() - a.originalDate.getTime(),
      );

    return sorted.reduce<{ month: string; items: typeof sorted }[]>((groups, item) => {
      const month = formatMonthLabel(item.originalDate);
      const currentGroup = groups[groups.length - 1];
      if (currentGroup?.month === month) {
        currentGroup.items.push(item);
      } else {
        groups.push({ month, items: [item] });
      }
      return groups;
    }, []);
  }, [events, oldestFirst, today]);
  const selectedCapsuleEvent = events.find((event) => event.id === capsuleEventId) ?? events[0];
  const isMessageOpen = useCallback(
    (message: SecretMessage) => {
      if (message.kind === 'whisper') return true;
      if (message.deliveryMode === 'now') return true;
      if (message.deliveryMode === 'scheduled') {
        return message.openAt ? new Date(message.openAt).getTime() <= currentTime : true;
      }
      if (message.deliveryMode === 'anniversary') {
        const event = events.find((item) => item.id === message.anniversaryId);
        return event ? dayDiff(parseLocalDate(event.date), today) >= 0 : false;
      }
      if (message.deliveryMode === 'meeting') {
        return arrivedLocation.trim() === '下次见面';
      }
      if (message.deliveryMode === 'location') {
        return Boolean(message.locationName && arrivedLocation.trim() === message.locationName);
      }
      return false;
    },
    [arrivedLocation, currentTime, events, today],
  );
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.kind === messageKind),
    [messageKind, messages],
  );
  const lockedCapsules = visibleMessages.filter((message) => !isMessageOpen(message));
  const openMessages = visibleMessages.filter((message) => isMessageOpen(message));

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !date) return;
    const id = crypto.randomUUID();

    setEvents((current) => [
      {
        id,
        title: trimmedTitle,
        date,
        category: category.trim() || '重要',
        note: note.trim(),
        emoji: emoji.trim() || '💗',
      },
      ...current,
    ]);
    setSelectedId(id);
    setEventComposerOpen(false);
    setTitle('');
    setNote('');
    setEmoji('💗');
  }

  function removeEvent(id: string) {
    setEvents((current) => current.filter((event) => event.id !== id));
    if (selectedId === id) {
      setSelectedId(enriched.find((event) => event.id !== id)?.id ?? starterEvents[0].id);
    }
  }

  function resetDemo() {
    setEvents(starterEvents);
    setPreviewDate(toLocalDate(new Date()));
    setSelectedId(starterEvents[0].id);
    setMessages(starterMessages);
  }

  function openTimelineFor(id: string) {
    setSelectedId(id);
    setActiveTab('timeline');
  }

  function zoomMap(direction: 1 | -1) {
    setMapScale((value) => Math.min(2.2, Math.max(0.82, Number((value + direction * 0.16).toFixed(2)))));
  }

  function resetMapView() {
    setMapScale(1);
    setMapOffset({ x: 0, y: 0 });
  }

  function startMapDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ x: event.clientX, y: event.clientY, originX: mapOffset.x, originY: mapOffset.y });
  }

  function dragMap(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart) return;
    setMapOffset({
      x: dragStart.originX + event.clientX - dragStart.x,
      y: dragStart.originY + event.clientY - dragStart.y,
    });
  }

  function stopMapDrag() {
    setDragStart(null);
  }

  function getMessageStatus(message: SecretMessage) {
    if (isMessageOpen(message)) return message.kind === 'capsule' ? '已开启' : '已送达';
    if (message.deliveryMode === 'scheduled' && message.openAt) return `定时 ${message.openAt.replace('T', ' ')}`;
    if (message.deliveryMode === 'anniversary') {
      const event = events.find((item) => item.id === message.anniversaryId);
      return event ? `等到 ${event.title}` : '等待纪念日';
    }
    if (message.deliveryMode === 'meeting') return '下次见面打开';
    return `到达 ${message.locationName || '指定地点'} 打开`;
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = messageBody.trim();
    const trimmedTitle = messageTitle.trim();
    if (!trimmedBody) return;

    const id = crypto.randomUUID();
    const normalizedMode = messageKind === 'whisper' ? 'now' : deliveryMode === 'now' ? 'anniversary' : deliveryMode;
    setMessages((current) => [
      {
        id,
        kind: messageKind,
        to: messageTo.trim() || (messageKind === 'capsule' ? '未来的我们' : '对方'),
        title: trimmedTitle || (messageKind === 'capsule' ? '给未来的一封信' : '悄悄话'),
        body: trimmedBody,
        createdAt: toDateTimeLocal(new Date()),
        deliveryMode: normalizedMode,
        openAt: normalizedMode === 'scheduled' ? openAt : undefined,
        anniversaryId: normalizedMode === 'anniversary' ? selectedCapsuleEvent?.id : undefined,
        meetingLabel: normalizedMode === 'meeting' ? '下次见面' : undefined,
        locationName: normalizedMode === 'location' ? locationName.trim() || '指定地点' : undefined,
      },
      ...current,
    ]);
    setComposeOpen(false);
    setMessageTitle('');
    setMessageBody('');
  }

  function removeMessage(id: string) {
    setMessages((current) => current.filter((message) => message.id !== id));
  }

  async function analyzeFight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = fightText.trim();
    if (!trimmedText) {
      setAgentError('先写一点刚才发生了什么，智能体才知道从哪里开始帮你们。');
      return;
    }

    setAgentLoading(true);
    setAgentError('');

    try {
      const response = await fetch('/api/reconcile-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conflict: trimmedText,
          tone: fightTone,
          mood: fightMood,
          events: events.slice(0, 12).map((item) => ({
            title: item.title,
            date: item.date,
            category: item.category,
            note: item.note,
          })),
          messages: messages.slice(0, 12).map((item) => ({
            kind: item.kind,
            title: item.title,
            body: item.body,
          })),
        }),
      });

      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('当前预览没有启动智能体接口。请用 netlify dev 本地联调，或部署到 Netlify 后再测试。');
      }

      const payload = await response.json() as Partial<ReconcileResult> & { error?: string };
      if (!response.ok) throw new Error(payload.error || '智能体暂时没有回应');

      setReconcileResult({
        sharedCore: payload.sharedCore || reconcileResult.sharedCore,
        trigger: payload.trigger || reconcileResult.trigger,
        needs: payload.needs || reconcileResult.needs,
        myNeed: payload.myNeed || reconcileResult.myNeed,
        partnerNeed: payload.partnerNeed || reconcileResult.partnerNeed,
        avoidNow: payload.avoidNow || reconcileResult.avoidNow,
        gentleScript: payload.gentleScript || reconcileResult.gentleScript,
        repairAdvice: payload.repairAdvice || reconcileResult.repairAdvice,
        shortReply: payload.shortReply || reconcileResult.shortReply,
        sincereReply: payload.sincereReply || reconcileResult.sincereReply,
        cuteReply: payload.cuteReply || reconcileResult.cuteReply,
        repairPlan: payload.repairPlan || reconcileResult.repairPlan,
        nextStep: payload.nextStep || reconcileResult.nextStep,
      });
      setFullReportOpen(true);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : '智能体暂时不可用，请稍后再试');
    } finally {
      setAgentLoading(false);
    }
  }

  const pageTitle =
    activeTab === 'timeline' ? '时间轴' : activeTab === 'letters' ? '信件' : activeTab === 'map' ? '和好智能体' : activeTab === 'more' ? '更多' : '爱的地图';
  const pageSubtitle =
    activeTab === 'timeline'
      ? `${events.length} 个共同回忆`
      : activeTab === 'letters'
        ? '悄悄话与时光胶囊'
        : activeTab === 'map'
          ? '不评判，只帮你们靠近'
          : activeTab === 'more'
            ? '共同空间与同步设置'
            : '记录属于我们的甜蜜回忆';

  return (
    <main className={todaysEvents.length ? 'love-app celebrating' : 'love-app'}>
      <div className="phone-shell">
        <header className="app-header">
          <div>
            <h1>{pageTitle}</h1>
            <p>{pageSubtitle}</p>
          </div>
          {activeTab === 'timeline' ? (
            <button className="round-menu" type="button" aria-label="时间轴菜单">
              ≡
            </button>
          ) : activeTab === 'letters' ? (
            <button
              className="round-menu soft-heart"
              type="button"
              aria-label="写一封信"
              onClick={() => setComposeOpen((value) => !value)}
            >
              ♥
            </button>
          ) : (
            <div className="profile-badge" aria-label="纪念日主人">
              <span className="avatar avatar-one">大</span>
              <strong>大大塔小王</strong>
              <em>🌸</em>
            </div>
          )}
        </header>

        {activeTab === 'timeline' ? (
          <section className="timeline-view" aria-label="时间轴">
            <button
              className="sort-chip"
              type="button"
              onClick={() => setOldestFirst((value) => !value)}
            >
              {oldestFirst ? '最早在前' : '最新在前'}
            </button>

            <div className="timeline-rail">
              {timelineGroups.map((group) => (
                <section className="month-group" key={group.month}>
                  <div className="month-chip">
                    <span>▣</span>
                    {group.month}
                  </div>
                  {group.items.map((event) => (
                    <article
                      className={event.id === selectedId ? 'timeline-memory selected' : 'timeline-memory'}
                      key={event.id}
                      onClick={() => setSelectedId(event.id)}
                    >
                      <i className="timeline-dot" />
                      <p>{formatFullChineseDate(event.originalDate)}</p>
                      <h2>
                        <span>•</span>
                        {event.title}
                        <em> · {event.category}</em>
                      </h2>
                      <div className={`memory-photo ${event.imageClass}`}>
                        <strong>{event.emoji}</strong>
                      </div>
                      <footer>
                        <span>{event.category}</span>
                        <small>{event.daysPassed} 天</small>
                        <button
                          type="button"
                          aria-label={`删除 ${event.title}`}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            removeEvent(event.id);
                          }}
                        >
                          删除
                        </button>
                      </footer>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          </section>
        ) : activeTab === 'letters' ? (
          <section className="letters-view" aria-label="悄悄话和时光胶囊">
            <div className="message-tabs">
              <button
                type="button"
                className={messageKind === 'whisper' ? 'active' : ''}
                onClick={() => {
                  setMessageKind('whisper');
                  setDeliveryMode('now');
                }}
              >
                💌 悄悄话
              </button>
              <button
                type="button"
                className={messageKind === 'capsule' ? 'active' : ''}
                onClick={() => {
                  setMessageKind('capsule');
                  setDeliveryMode('anniversary');
                  setMessageTo('未来的我们');
                }}
              >
                ⏳ 时光胶囊
              </button>
            </div>

            {composeOpen && (
              <form className="message-composer" onSubmit={sendMessage}>
                <label>
                  收给谁
                  <input value={messageTo} onChange={(event) => setMessageTo(event.target.value)} placeholder="小小塔大王 / 未来的我们" />
                </label>
                <label>
                  标题
                  <input value={messageTitle} onChange={(event) => setMessageTitle(event.target.value)} placeholder="例如：见面那天再看" />
                </label>
                <label>
                  内容
                  <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="写一封小纸条给 TA 吧" />
                </label>

                {messageKind === 'capsule' && (
                  <div className="delivery-grid">
                    {([
                        ['anniversary', '纪念日'],
                        ['meeting', '下次见面'],
                        ['location', '到达地点'],
                        ['scheduled', '指定时间'],
                      ] as [DeliveryMode, string][]).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        className={deliveryMode === mode ? 'active' : ''}
                        onClick={() => setDeliveryMode(mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {messageKind === 'capsule' && deliveryMode === 'scheduled' && (
                  <label>
                    开启时间
                    <input type="datetime-local" value={openAt} onChange={(event) => setOpenAt(event.target.value)} />
                  </label>
                )}

                {messageKind === 'capsule' && deliveryMode === 'anniversary' && (
                  <label>
                    到哪个纪念日打开
                    <select value={capsuleEventId} onChange={(event) => setCapsuleEventId(event.target.value)}>
                      {events.map((event) => (
                        <option value={event.id} key={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {messageKind === 'capsule' && deliveryMode === 'location' && (
                  <label>
                    地点暗号
                    <input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="例如：上海虹桥站" />
                  </label>
                )}

                <button className="send-button" type="submit">
                  {messageKind === 'capsule' ? '封存胶囊' : '写到共同信箱'}
                </button>
              </form>
            )}

            {messageKind === 'capsule' && (
              <section className="arrival-card">
                <div>
                  <p>开启条件</p>
                  <span>输入“下次见面”或地点暗号，可打开对应胶囊。</span>
                </div>
                <input value={arrivedLocation} onChange={(event) => setArrivedLocation(event.target.value)} placeholder="下次见面 / 上海虹桥站" />
              </section>
            )}

            {messageKind === 'capsule' && (
              <section className="mail-section waiting-section">
                <h2>等待开启</h2>
                {lockedCapsules.length === 0 ? (
                  <article className="empty-mail-card">
                    <span>♥</span>
                    <strong>暂时没有待开启的胶囊</strong>
                    <p>把一句话封存到未来吧</p>
                  </article>
                ) : (
                  lockedCapsules.map((message) => (
                    <article className="letter-card unread" key={message.id}>
                      <div className="letter-meta">
                        <span>未</span>
                        <strong>{message.to} 收</strong>
                        <time>{getMessageStatus(message)}</time>
                      </div>
                      <h3>{message.title}</h3>
                      <p>还没到约定的打开时刻。</p>
                    </article>
                  ))
                )}
              </section>
            )}

            <section className="mail-section read-section">
              <h2>{messageKind === 'whisper' ? '共同信箱' : '已开启胶囊'}</h2>
              <div className="letter-list">
                {openMessages.length === 0 && (
                  <article className="empty-mail-card">
                    <span>♥</span>
                    <strong>
                      {messageKind === 'whisper' ? '还没有悄悄话' : '还没有已开启的胶囊'}
                    </strong>
                    <p>{messageKind === 'whisper' ? '写完就会直接出现在这里' : '到了约定条件后会自动出现'}</p>
                  </article>
                )}
                {openMessages.map((message) => (
                  <article className={message.kind === 'capsule' ? 'letter-card capsule' : 'letter-card'} key={message.id}>
                    <div className="letter-meta">
                      <span>{message.to.includes('未来') ? '未' : message.to.slice(0, 1) || 'TA'}</span>
                      <strong>{message.to} 收</strong>
                      <time>{message.createdAt.slice(5, 10).replace('-', '月')}日</time>
                    </div>
                    <h3>{message.title}</h3>
                    <p>{message.body}</p>
                    {message.kind === 'whisper' && message.body.length > 8 && (
                      <div className="letter-photo" aria-hidden="true" />
                    )}
                    <button type="button" aria-label={`删除 ${message.title}`} onClick={() => removeMessage(message.id)}>
                      删除
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : activeTab === 'map' ? (
          <section className="reconcile-view" aria-label="情侣吵架分析智能体">
            <section className="reconcile-hero">
              <span className="reconcile-hero-image" aria-hidden="true" />
              <div>
                <p>再大的争吵，也抵不过我还是想和你在一起</p>
                <h2>和好智能体</h2>
                <span>先降温，再好好说。这里不会评判谁对谁错，只帮你们找回靠近的方式。</span>
              </div>
            </section>

            <form className="fight-composer" onSubmit={analyzeFight}>
              <section className="cooldown-card" aria-label="三十秒降温">
                <p>现在先做 30 秒降温</p>
                <span>深呼吸，让情绪先安静下来</span>
                <div className="breathing-circle" aria-hidden="true">
                  <strong>深呼吸</strong>
                  <em>放松一下</em>
                </div>
                <div className="mood-chip-grid" aria-label="当前情绪">
                  {['委屈', '生气', '想哭', '想和好'].map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      className={fightMood === mood ? 'active' : ''}
                      onClick={() => setFightMood(mood)}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
                <small>先让情绪安静下来，我们再一起看看发生了什么。</small>
              </section>

              <label>
                发生了什么
                <textarea
                  value={fightText}
                  onChange={(event) => setFightText(event.target.value)}
                  placeholder="可以只写几句话：我现在很委屈，因为刚才他说话很冲，我其实只是想被理解。"
                />
              </label>

              <div className="tone-grid" aria-label="想让智能体帮什么">
                {([
                  ['apology', '我该先道歉吗'],
                  ['explain', '帮我解释清楚'],
                  ['soft', '把话说软一点'],
                  ['meet', '约 TA 好好聊'],
                ] as const).map(([tone, label]) => (
                  <button
                    key={tone}
                    type="button"
                    className={fightTone === tone ? 'active' : ''}
                    onClick={() => setFightTone(tone)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {agentError && <p className="agent-error">{agentError}</p>}
              <button className="agent-button" type="submit" disabled={agentLoading}>
                {agentLoading ? '正在帮你降温分析...' : '开始分析'}
              </button>
            </form>

            <article className="shared-core-card">
              <span>现在的你：{fightMood}</span>
              <strong>{reconcileResult.sharedCore}</strong>
            </article>

            <section className="quick-question-grid" aria-label="你可能想问">
              <div className="section-title">
                <div>
                  <p>你可能想问</p>
                  <h2>选一个方向继续靠近</h2>
                </div>
              </div>
              {[
                ['我该先道歉吗', reconcileResult.repairAdvice],
                ['帮我把话说软一点', reconcileResult.shortReply],
                ['分析我们吵架的核心', reconcileResult.needs],
              ].map(([question, answer]) => (
                <article key={question}>
                  <span>{question}</span>
                  <p>{answer}</p>
                </article>
              ))}
            </section>

            <article className="next-step-card">
              <span>慢一点会更好</span>
              <p>{reconcileResult.nextStep}</p>
            </article>

            <section className="full-report-card" aria-label="完整和好分析报告">
              <button
                className="report-toggle"
                type="button"
                aria-expanded={fullReportOpen}
                onClick={() => setFullReportOpen((open) => !open)}
              >
                <span>
                  <em>完整分析</em>
                  <strong>{fullReportOpen ? '收起报告' : '查看完整分析'}</strong>
                </span>
                <i aria-hidden="true">{fullReportOpen ? '⌃' : '⌄'}</i>
              </button>

              {fullReportOpen && (
                <div className="full-report-body">
                  {[
                    ['发生了什么', reconcileResult.trigger],
                    ['你可能真正想要', reconcileResult.myNeed],
                    ['TA 可能真正想要', reconcileResult.partnerNeed],
                    ['现在先别做', reconcileResult.avoidNow],
                    ['可以怎么说', reconcileResult.gentleScript],
                    ['30 分钟和好计划', reconcileResult.repairPlan],
                  ].map(([title, content]) => (
                    <article className="report-row" key={title}>
                      <span>{title}</span>
                      <p>{content}</p>
                    </article>
                  ))}

                  <article className="report-row message-variants">
                    <span>三种可发送的话</span>
                    {[
                      ['短句版', reconcileResult.shortReply],
                      ['认真版', reconcileResult.sincereReply],
                      ['软软版', reconcileResult.cuteReply],
                    ].map(([label, content]) => (
                      <p className="message-variant" key={label}>
                        <strong>{label}</strong>
                        {content}
                      </p>
                    ))}
                  </article>
                </div>
              )}
            </section>
          </section>
        ) : activeTab === 'more' ? (
          <section className="settings-view" aria-label="更多设置">
            <article className="sync-card">
              <div className="sync-status-row">
                <span className={`sync-dot ${cloudStatus}`} />
                <div>
                  <p>共同空间</p>
                  <h2>{cloudMessage}</h2>
                </div>
              </div>
              <label>
                空间码
                <input
                  value={spaceCode}
                  onChange={(event) => setSpaceCode(event.target.value)}
                  placeholder="输入你们共同约定的空间码"
                />
              </label>
              <small>你和对方使用同一个空间码，就会看到同一份纪念日、悄悄话和时光胶囊。</small>
            </article>

            <section className="stats-grid" aria-label="记录统计">
              <article>
                <span>{events.length}</span>
                <p>纪念日</p>
              </article>
              <article>
                <span>{messages.filter((message) => message.kind === 'whisper').length}</span>
                <p>悄悄话</p>
              </article>
              <article>
                <span>{messages.filter((message) => message.kind === 'capsule').length}</span>
                <p>胶囊</p>
              </article>
            </section>

            <button className="reset-wide-button" type="button" onClick={resetDemo}>
              重置为示例内容
            </button>
          </section>
        ) : (
          <>
            <section className="mood-card" aria-label="今日心情">
              <div className="mood-box happy">
                <span>🌸</span>
                <strong>开心</strong>
                <p>大大塔小王</p>
              </div>
              <div className="mood-divider">
                <span />
                <strong>♥</strong>
                <span />
              </div>
              <div className="mood-box cloud">
                <span>☁️</span>
                <strong>{todaysEvents.length ? '超想庆祝' : '还没记心情'}</strong>
                <p>小小塔大王</p>
              </div>
              <footer>
                <span>♥</span>
                <strong>戳一戳 小小塔大王</strong>
                <em>{events.length} 次</em>
              </footer>
            </section>

            <section className="map-card" aria-label="纪念日地图">
              <div className="map-toolbar">
                <div>
                  <span>可缩放地图</span>
                  <strong>{pathEvents.length} 个节点</strong>
                </div>
                <div className="zoom-controls" aria-label="地图缩放控制">
                  <button type="button" onClick={() => zoomMap(-1)} aria-label="缩小地图">
                    −
                  </button>
                  <button type="button" onClick={resetMapView} aria-label="重置地图">
                    {Math.round(mapScale * 100)}%
                  </button>
                  <button type="button" onClick={() => zoomMap(1)} aria-label="放大地图">
                    +
                  </button>
                </div>
              </div>

              <div
                className="zoom-map-viewport"
                onPointerDown={startMapDrag}
                onPointerMove={dragMap}
                onPointerUp={stopMapDrag}
                onPointerCancel={stopMapDrag}
              >
                <div
                  className="zoom-map-canvas"
                  style={{
                    transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapScale})`,
                  }}
                >
                  <div className="memory-path" aria-hidden="true">
                    <span className="path-line" />
                  </div>
                  <div className="map-pins">
                    {pathEvents.map((event, index) => {
                      const point = getMapPoint(index, pathEvents.length);
                      return (
                        <button
                          type="button"
                          key={event.id}
                          className={event.id === featured?.id ? 'pin selected' : 'pin'}
                          style={{
                            '--pin': index,
                            left: `${point.left}%`,
                            top: `${point.top}%`,
                          } as CSSProperties}
                          onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                          onClick={() => setSelectedId(event.id)}
                          aria-label={`查看 ${event.title}`}
                        >
                          <b>{event.emoji}</b>
                          <small>{event.title}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {featured && (
                <article className="feature-ticket polaroid-ticket">
                  <div className="polaroid-photo">
                    <span>{featured.emoji}</span>
                  </div>
                  <p>{featured.category}</p>
                  <strong>{featured.daysUntil === 0 ? '今天' : featured.daysUntil}</strong>
                  <span>
                    {featured.title} · {formatShortDate(featured.nextDate)}
                  </span>
                  <button type="button" onClick={() => openTimelineFor(featured.id)}>
                    我们的故事
                  </button>
                </article>
              )}
            </section>

            <section className="milestone-card">
              <div>
                <p>下一个里程碑</p>
                <h2>{nextMilestone?.title ?? '等待添加'}</h2>
                <span>
                  还剩 <strong>{nextMilestone?.daysUntil ?? 0}</strong> 天
                </span>
              </div>
              <div className="bear-asset" aria-hidden="true">
                <span>ʕ•ᴥ•ʔ</span>
                <i>♥</i>
              </div>
            </section>

            <section className="quick-add-card">
              <button type="button" onClick={() => setEventComposerOpen(true)}>
                <span>＋</span>
                添加纪念日
              </button>
              <button type="button" onClick={resetDemo}>
                重置示例
              </button>
            </section>

            {eventComposerOpen && (
              <div className="modal-backdrop" role="presentation">
                <section className="composer-card modal-card" role="dialog" aria-modal="true" aria-label="添加纪念日">
                  <div className="section-title">
                    <div>
                      <p>添加纪念日</p>
                      <h2>把重要日子放进地图</h2>
                    </div>
                    <button type="button" onClick={() => setEventComposerOpen(false)}>
                      关闭
                    </button>
                  </div>
                  <form onSubmit={addEvent}>
                    <label>
                      名称
                      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：第一次看海" />
                    </label>
                    <div className="form-row">
                      <label>
                        日期
                        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                      </label>
                      <label>
                        图标
                        <input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={4} />
                      </label>
                    </div>
                    <label>
                      分类
                      <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="生日 / 恋爱 / 旅行" />
                    </label>
                    <label>
                      小纸条
                      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="写一句只有你们懂的话" />
                    </label>
                    <button className="save-button" type="submit">
                      保存到地图
                    </button>
                  </form>
                </section>
              </div>
            )}
          </>
        )}

        <nav className="bottom-nav" aria-label="页面导航">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
