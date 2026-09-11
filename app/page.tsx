'use client';

/* eslint-disable @next/next/no-img-element -- User-uploaded Blob photos are served through Netlify Functions in a static export. */
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

type PhotoAttachment = {
  id: string;
  key: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
  createdAt: string;
};

type Anniversary = {
  id: string;
  title: string;
  date: string;
  category: string;
  note: string;
  emoji: string;
  photos?: PhotoAttachment[];
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
  photos?: PhotoAttachment[];
};

type TabId = 'home' | 'timeline' | 'letters' | 'map' | 'more';
type CloudStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'saved' | 'local' | 'error';
type SharedMemoryData = {
  empty?: boolean;
  space?: string;
  roomSettings?: RoomSettings;
  events: Anniversary[];
  messages: SecretMessage[];
  reconcileChats?: ReconcileChatMessage[];
  reconcileSessions?: ReconcileSession[];
  partnerProfile?: PartnerProfileItem[];
  futurePlans?: FuturePlanItem[];
  updatedAt?: string | null;
};
type ReconcileResult = {
  answer: string;
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
type RoomSettings = {
  roomName: string;
  userAName: string;
  userBName: string;
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
type PartnerProfileOwner = 'userA' | 'userB' | 'us';
type PartnerProfileItem = {
  id: string;
  owner: PartnerProfileOwner;
  label: string;
  updatedAt: string;
};
type FuturePlanStatus = 'todo' | 'planned' | 'done';
type FuturePlanItem = {
  id: string;
  title: string;
  note: string;
  occasion: string;
  status: FuturePlanStatus;
  createdAt: string;
  photos?: PhotoAttachment[];
};

const storageKey = 'love-map-anniversaries-v2';
const messageStorageKey = 'love-map-secret-messages-v1';
const reconcileChatStorageKey = 'love-map-reconcile-chat-v1';
const reconcileSessionStorageKey = 'love-map-reconcile-sessions-v1';
const partnerProfileStorageKey = 'love-map-partner-profile-v1';
const futurePlanStorageKey = 'love-map-future-plans-v1';
const roomSettingsStorageKey = 'love-map-room-settings-v1';
const legacySpaceStorageKey = 'love-map-space-code-v1';
const sharedRoomKey = 'dadata-xiaoxiao';
const botName = '桃桃';
const defaultRoomSettings: RoomSettings = {
  roomName: '我们的小窝',
  userAName: '大大塔小王',
  userBName: '小小塔大王',
};

const starterEvents: Anniversary[] = [
  {
    id: 'together-333',
    title: '在一起 333 天',
    date: '2025-06-08',
    category: '在一起',
    note: `${defaultRoomSettings.userAName} & ${defaultRoomSettings.userBName}`,
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
  { id: 'more', label: '家', icon: '⌂' },
];

const starterMessages: SecretMessage[] = [
  {
    id: 'first-whisper',
    kind: 'whisper',
    to: defaultRoomSettings.userBName,
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

const starterReconcileChats: ReconcileChatMessage[] = [
  {
    id: 'bot-welcome',
    role: 'bot',
    title: botName,
    body: `我在这里陪你们慢慢说。你们可以切换 ${defaultRoomSettings.userAName} / ${defaultRoomSettings.userBName} 发言；聊到一半时，点“${botName} 总结一下”，我会只根据上面的对话帮你们降温、找重点、给出更好开口的话。`,
    createdAt: '2026-08-30T12:18',
  },
];

const starterReconcileSessions: ReconcileSession[] = [
  {
    id: 'session-welcome',
    title: '第一次和好练习',
    createdAt: '2026-08-30T12:18',
    updatedAt: '2026-08-30T12:18',
    messages: starterReconcileChats,
  },
];

const partnerOwnerMeta: Record<PartnerProfileOwner, { label: string; short: string; icon: string }> = {
  userA: { label: '用户 A', short: 'A', icon: 'A' },
  userB: { label: '用户 B', short: 'B', icon: 'B' },
  us: { label: '我们', short: '我们', icon: '♥' },
};

const futureStatusMeta: Record<FuturePlanStatus, { label: string; icon: string }> = {
  todo: { label: '想做', icon: '○' },
  planned: { label: '约定中', icon: '◐' },
  done: { label: '已完成', icon: '●' },
};

const starterPartnerProfile: PartnerProfileItem[] = [
  {
    id: 'profile-a-slow',
    owner: 'userA',
    label: '慢热',
    updatedAt: '2026-08-30T12:24',
  },
  {
    id: 'profile-b-spicy',
    owner: 'userB',
    label: '爱吃辣',
    updatedAt: '2026-08-30T12:28',
  },
  {
    id: 'profile-us-walk',
    owner: 'us',
    label: '喜欢散步',
    updatedAt: '2026-08-30T12:32',
  },
  { id: 'profile-a-photo', owner: 'userA', label: '爱拍照', updatedAt: '2026-08-30T12:34' },
  { id: 'profile-b-movie', owner: 'userB', label: '电影', updatedAt: '2026-08-30T12:35' },
  { id: 'profile-us-hotpot', owner: 'us', label: '火锅', updatedAt: '2026-08-30T12:36' },
  { id: 'profile-b-sleep', owner: 'userB', label: '早睡', updatedAt: '2026-08-30T12:37' },
  { id: 'profile-a-company', owner: 'userA', label: '需要陪伴感', updatedAt: '2026-08-30T12:38' },
];

const starterFuturePlans: FuturePlanItem[] = [
  {
    id: 'future-sea',
    title: '一周年去海边',
    note: '看日落，拍一张很像电影的合照。',
    occasion: '一周年',
    status: 'planned',
    createdAt: '2026-08-30T12:36',
  },
  {
    id: 'future-hotpot',
    title: '下次见面吃火锅',
    note: '点鸳鸯锅，给彼此夹第一口喜欢的菜。',
    occasion: '下次见面',
    status: 'todo',
    createdAt: '2026-08-30T12:40',
  },
  {
    id: 'future-photo',
    title: '拍一次正式合照',
    note: '把那一天放进时间轴。',
    occasion: '某个周末',
    status: 'todo',
    createdAt: '2026-08-30T12:44',
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

function normalizePartnerProfile(value: unknown): PartnerProfileItem[] {
  if (!Array.isArray(value)) return starterPartnerProfile;

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const owner = record.owner === 'userA' || record.owner === 'userB' || record.owner === 'us' ? record.owner : 'us';
    if (typeof record.label === 'string' && record.label.trim()) {
      return [{
        id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
        owner,
        label: record.label.trim(),
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : toDateTimeLocal(new Date()),
      }];
    }

    if (Array.isArray(record.tags)) {
      return record.tags.flatMap((tag) => {
        if (typeof tag !== 'string' || !tag.trim()) return [];
        return [{
          id: crypto.randomUUID(),
          owner,
          label: tag.trim(),
          updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : toDateTimeLocal(new Date()),
        }];
      });
    }

    if (typeof record.title === 'string' && record.title.trim()) {
      return [{
        id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
        owner,
        label: record.title.trim(),
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : toDateTimeLocal(new Date()),
      }];
    }

    return [];
  });
}

function timeValue(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortReconcileMessages(messages: ReconcileChatMessage[]) {
  return [...messages].sort((a, b) => timeValue(a.createdAt) - timeValue(b.createdAt));
}

function mergeReconcileSessions(localSessions: ReconcileSession[], remoteSessions: ReconcileSession[]) {
  if (!remoteSessions.length) return localSessions;

  let changed = false;
  const sessionMap = new Map(localSessions.map((session) => [session.id, session]));

  remoteSessions.forEach((remoteSession) => {
    const localSession = sessionMap.get(remoteSession.id);
    if (!localSession) {
      changed = true;
      sessionMap.set(remoteSession.id, remoteSession);
      return;
    }

    const localUpdated = timeValue(localSession.updatedAt);
    const remoteUpdated = timeValue(remoteSession.updatedAt);
    const localMessageIds = new Set(localSession.messages.map((message) => message.id));
    const remoteMessageIds = new Set(remoteSession.messages.map((message) => message.id));

    if (remoteUpdated > localUpdated) {
      const localMessagesAfterRemote = localSession.messages.filter(
        (message) => !remoteMessageIds.has(message.id) && timeValue(message.createdAt) > remoteUpdated,
      );
      const nextMessages = sortReconcileMessages([...remoteSession.messages, ...localMessagesAfterRemote]);
      changed = true;
      sessionMap.set(remoteSession.id, {
        ...remoteSession,
        messages: nextMessages,
      });
      return;
    }

    const remoteMessagesToAdd = remoteSession.messages.filter((message) => !localMessageIds.has(message.id));
    if (!remoteMessagesToAdd.length) return;

    changed = true;
    const nextMessages = sortReconcileMessages([...localSession.messages, ...remoteMessagesToAdd]);
    sessionMap.set(remoteSession.id, {
      ...localSession,
      updatedAt: timeValue(remoteSession.updatedAt) > timeValue(localSession.updatedAt) ? remoteSession.updatedAt : localSession.updatedAt,
      messages: nextMessages,
    });
  });

  const merged = [...sessionMap.values()].sort((a, b) => timeValue(b.updatedAt) - timeValue(a.updatedAt));
  if (!changed) {
    const currentOrder = localSessions.map((session) => session.id).join('|');
    const nextOrder = merged.map((session) => session.id).join('|');
    changed = currentOrder !== nextOrder;
  }

  return changed ? merged : localSessions;
}

function normalizePhotos(value: unknown): PhotoAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const key = typeof record.key === 'string' ? record.key : '';
    const url = typeof record.url === 'string' ? record.url : '';
    if (!key || !url) return [];

    return [{
      id: typeof record.id === 'string' ? record.id : key,
      key,
      url,
      name: typeof record.name === 'string' ? record.name : 'photo',
      contentType: typeof record.contentType === 'string' ? record.contentType : 'image/jpeg',
      size: typeof record.size === 'number' ? record.size : 0,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : toDateTimeLocal(new Date()),
    }];
  }).slice(0, 6);
}

function normalizeEvents(value: Anniversary[]) {
  return value.map((event) => ({ ...event, photos: normalizePhotos(event.photos) }));
}

function normalizeMessages(value: SecretMessage[]) {
  return value.map((message) => ({ ...message, photos: normalizePhotos(message.photos) }));
}

function normalizeFuturePlans(value: FuturePlanItem[]) {
  return value.map((plan) => ({ ...plan, photos: normalizePhotos(plan.photos) }));
}

function normalizeRoomSettings(value: unknown): RoomSettings {
  if (!value || typeof value !== 'object') return defaultRoomSettings;
  const record = value as Record<string, unknown>;
  return {
    roomName: typeof record.roomName === 'string' && record.roomName.trim() ? record.roomName.trim().slice(0, 40) : defaultRoomSettings.roomName,
    userAName: typeof record.userAName === 'string' && record.userAName.trim() ? record.userAName.trim().slice(0, 24) : defaultRoomSettings.userAName,
    userBName: typeof record.userBName === 'string' && record.userBName.trim() ? record.userBName.trim().slice(0, 24) : defaultRoomSettings.userBName,
  };
}

function sameRoomSettings(left: RoomSettings, right: RoomSettings) {
  return left.roomName === right.roomName && left.userAName === right.userAName && left.userBName === right.userBName;
}

async function compressPhoto(file: File) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 450_000) return file;

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('照片读取失败'));
      element.src = imageUrl;
    });
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function Home() {
  const [events, setEvents] = useState<Anniversary[]>(starterEvents);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-09-19');
  const [category, setCategory] = useState('重要');
  const [note, setNote] = useState('');
  const [emoji, setEmoji] = useState('💗');
  const [eventPhotos, setEventPhotos] = useState<PhotoAttachment[]>([]);
  const [previewDate, setPreviewDate] = useState(() => toLocalDate(new Date()));
  const [oldestFirst, setOldestFirst] = useState(true);
  const [selectedId, setSelectedId] = useState(starterEvents[0].id);
  const [messages, setMessages] = useState<SecretMessage[]>(starterMessages);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfileItem[]>(starterPartnerProfile);
  const [futurePlans, setFuturePlans] = useState<FuturePlanItem[]>(starterFuturePlans);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>(defaultRoomSettings);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('idle');
  const [cloudMessage, setCloudMessage] = useState('共同空间准备中');
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const savePendingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const audioNodesRef = useRef<OscillatorNode[]>([]);
  const musicTimerRef = useRef<number | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [messageKind, setMessageKind] = useState<MessageKind>('whisper');
  const [messageTo, setMessageTo] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messagePhotos, setMessagePhotos] = useState<PhotoAttachment[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('now');
  const [openAt, setOpenAt] = useState(() => toDateTimeLocal(new Date()));
  const [capsuleEventId, setCapsuleEventId] = useState(starterEvents[2].id);
  const [locationName, setLocationName] = useState('下次见面的地方');
  const [arrivedLocation, setArrivedLocation] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date().getTime());
  const [composeOpen, setComposeOpen] = useState(false);
  const [eventComposerOpen, setEventComposerOpen] = useState(false);
  const [homeComposer, setHomeComposer] = useState<'room' | 'profile' | 'future' | null>(null);
  const [profileOwner, setProfileOwner] = useState<PartnerProfileOwner>('userA');
  const [profileLabel, setProfileLabel] = useState('');
  const [futureTitle, setFutureTitle] = useState('');
  const [futureNote, setFutureNote] = useState('');
  const [futureOccasion, setFutureOccasion] = useState('下次见面');
  const [futureStatus, setFutureStatus] = useState<FuturePlanStatus>('todo');
  const [futurePhotos, setFuturePhotos] = useState<PhotoAttachment[]>([]);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<'event' | 'message' | 'future' | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState('');
  const [reconcileChatInput, setReconcileChatInput] = useState('');
  const [reconcileSessions, setReconcileSessions] = useState<ReconcileSession[]>(starterReconcileSessions);
  const [activeReconcileSessionId, setActiveReconcileSessionId] = useState(() => starterReconcileSessions[0].id);
  const [localHydrated, setLocalHydrated] = useState(false);
  const [reconcileScreen, setReconcileScreen] = useState<'sessions' | 'room'>('sessions');
  const [reconcileSpeaker, setReconcileSpeaker] = useState<'userA' | 'userB'>('userA');
  const [reconcileResult, setReconcileResult] = useState<ReconcileResult>({
    answer:
      '我能感觉到你不是单纯想争输赢，而是希望自己的感受被认真看见。现在最重要的不是立刻讲清所有道理，而是先把语气降下来，让对方知道你还想靠近。\n\n你可以先发一句：“我刚才情绪有点满，但我不是想和你吵。我其实很在乎你，也想好好听你说。”如果对方愿意回应，再慢慢聊刚才真正让你难过的点。',
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
    queueMicrotask(() => {
      try {
        const savedEvents = window.localStorage.getItem(storageKey);
        if (savedEvents) setEvents(normalizeEvents(JSON.parse(savedEvents)));

        const savedMessages = window.localStorage.getItem(messageStorageKey);
        if (savedMessages) setMessages(normalizeMessages(JSON.parse(savedMessages)));

        const savedProfile = window.localStorage.getItem(partnerProfileStorageKey);
        if (savedProfile) setPartnerProfile(normalizePartnerProfile(JSON.parse(savedProfile)));

        const savedPlans = window.localStorage.getItem(futurePlanStorageKey);
        if (savedPlans) setFuturePlans(normalizeFuturePlans(JSON.parse(savedPlans)));

        const savedRoomSettings = window.localStorage.getItem(roomSettingsStorageKey);
        if (savedRoomSettings) {
          setRoomSettings(normalizeRoomSettings(JSON.parse(savedRoomSettings)));
        } else {
          const legacySpace = window.localStorage.getItem(legacySpaceStorageKey);
          if (legacySpace && legacySpace !== sharedRoomKey) {
            setRoomSettings({ ...defaultRoomSettings, roomName: legacySpace });
          }
        }

        const storedSessions = JSON.parse(window.localStorage.getItem(reconcileSessionStorageKey) || '[]') as ReconcileSession[];
        if (storedSessions.length) {
          setReconcileSessions(storedSessions);
          setActiveReconcileSessionId(storedSessions[0].id);
        } else {
          const legacyMessages = JSON.parse(window.localStorage.getItem(reconcileChatStorageKey) || '[]') as ReconcileChatMessage[];
          if (legacyMessages.length) {
            const legacySession = {
              id: 'session-legacy',
              title: '之前的和好聊天',
              createdAt: legacyMessages[0]?.createdAt || toDateTimeLocal(new Date()),
              updatedAt: legacyMessages.at(-1)?.createdAt || toDateTimeLocal(new Date()),
              messages: legacyMessages,
            };
            setReconcileSessions([legacySession]);
            setActiveReconcileSessionId(legacySession.id);
          }
        }
      } catch {
        setEvents(starterEvents);
        setMessages(starterMessages);
        setPartnerProfile(starterPartnerProfile);
        setFuturePlans(starterFuturePlans);
        setReconcileSessions(starterReconcileSessions);
        setRoomSettings(defaultRoomSettings);
      } finally {
        setLocalHydrated(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!localHydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(events));
  }, [events, localHydrated]);

  useEffect(() => {
    if (!localHydrated) return;
    window.localStorage.setItem(messageStorageKey, JSON.stringify(messages));
  }, [localHydrated, messages]);

  useEffect(() => {
    if (!localHydrated) return;
    window.localStorage.setItem(partnerProfileStorageKey, JSON.stringify(partnerProfile));
  }, [localHydrated, partnerProfile]);

  useEffect(() => {
    if (!localHydrated) return;
    window.localStorage.setItem(futurePlanStorageKey, JSON.stringify(futurePlans));
  }, [futurePlans, localHydrated]);

  useEffect(() => {
    if (!localHydrated) return;
    window.localStorage.setItem(reconcileSessionStorageKey, JSON.stringify(reconcileSessions));
  }, [localHydrated, reconcileSessions]);

  useEffect(() => {
    if (!localHydrated) return;
    window.localStorage.setItem(roomSettingsStorageKey, JSON.stringify(roomSettings));
  }, [localHydrated, roomSettings]);

  useEffect(() => {
    if (!localHydrated) return;
    const normalizedSpace = sharedRoomKey;
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
          setEvents(normalizeEvents(payload.events));
          setMessages(normalizeMessages(payload.messages));
          setRoomSettings(normalizeRoomSettings(payload.roomSettings));
          setPartnerProfile(payload.partnerProfile?.length ? normalizePartnerProfile(payload.partnerProfile) : starterPartnerProfile);
          setFuturePlans(payload.futurePlans?.length ? normalizeFuturePlans(payload.futurePlans) : starterFuturePlans);
          const nextSessions = payload.reconcileSessions?.length
            ? payload.reconcileSessions
            : payload.reconcileChats?.length
              ? [
                  {
                    id: 'session-legacy',
                    title: '之前的和好聊天',
                    createdAt: payload.reconcileChats[0]?.createdAt || toDateTimeLocal(new Date()),
                    updatedAt: payload.reconcileChats.at(-1)?.createdAt || toDateTimeLocal(new Date()),
                    messages: payload.reconcileChats,
                  },
                ]
              : starterReconcileSessions;
          setReconcileSessions(nextSessions);
          setActiveReconcileSessionId((current) => nextSessions.some((session) => session.id === current) ? current : nextSessions[0].id);
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
  }, [localHydrated]);

  useEffect(() => {
    if (!localHydrated || !cloudHydrated) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    savePendingRef.current = true;

    saveTimerRef.current = window.setTimeout(() => {
      const normalizedSpace = sharedRoomKey;
      setCloudStatus('saving');
      setCloudMessage('正在保存到共同空间');

      fetch(`/api/memories?space=${encodeURIComponent(normalizedSpace)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomSettings, events, messages, reconcileSessions, partnerProfile, futurePlans }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('保存失败');
          savePendingRef.current = false;
          setCloudStatus('saved');
          setCloudMessage('已保存到共同空间');
        })
        .catch(() => {
          savePendingRef.current = false;
          setCloudStatus('error');
          setCloudMessage('云端保存失败，本机仍已保留');
        });
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [cloudHydrated, events, futurePlans, localHydrated, messages, partnerProfile, reconcileSessions, roomSettings]);

  useEffect(() => {
    if (!cloudHydrated) return;

    const syncSharedMemory = () => {
      if (cloudStatus === 'saving' || savePendingRef.current) return;
      const normalizedSpace = sharedRoomKey;
      fetch(`/api/memories?space=${encodeURIComponent(normalizedSpace)}`, {
        cache: 'no-store',
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('共同空间连接失败');
          return response.json() as Promise<SharedMemoryData>;
        })
        .then((payload) => {
          if (homeComposer !== 'room') {
            const nextRoomSettings = normalizeRoomSettings(payload.roomSettings);
            setRoomSettings((current) => sameRoomSettings(current, nextRoomSettings) ? current : nextRoomSettings);
          }
          setPartnerProfile(payload.partnerProfile?.length ? normalizePartnerProfile(payload.partnerProfile) : starterPartnerProfile);
          setFuturePlans(payload.futurePlans?.length ? normalizeFuturePlans(payload.futurePlans) : starterFuturePlans);
          if (payload.reconcileSessions?.length) {
            setReconcileSessions((current) => mergeReconcileSessions(current, payload.reconcileSessions || []));
            setActiveReconcileSessionId((current) =>
              payload.reconcileSessions?.some((session) => session.id === current)
                ? current
                : payload.reconcileSessions?.[0]?.id || starterReconcileSessions[0].id,
            );
          }
        })
        .catch(() => undefined);
    };

    syncSharedMemory();
    const timer = window.setInterval(syncSharedMemory, activeTab === 'map' && reconcileScreen === 'room' ? 2500 : 6000);

    return () => window.clearInterval(timer);
  }, [activeTab, cloudHydrated, cloudStatus, homeComposer, reconcileScreen]);

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
  const roomDisplayName = roomSettings.roomName || defaultRoomSettings.roomName;
  const userAName = roomSettings.userAName || defaultRoomSettings.userAName;
  const userBName = roomSettings.userBName || defaultRoomSettings.userBName;
  const homeSyncLabel =
    cloudStatus === 'saved' || cloudStatus === 'ready' ? '已同步' : cloudStatus === 'loading' || cloudStatus === 'saving' ? '同步中' : '待同步';
  const activeReconcileSession =
    reconcileSessions.find((session) => session.id === activeReconcileSessionId) ?? reconcileSessions[0] ?? starterReconcileSessions[0];
  const reconcileChatMessages = activeReconcileSession.messages;

  function getRoleName(role: ReconcileRoomRole) {
    if (role === 'userA') return userAName;
    if (role === 'userB') return userBName;
    return botName;
  }

  function getOwnerLabel(owner: PartnerProfileOwner) {
    if (owner === 'userA') return userAName;
    if (owner === 'userB') return userBName;
    return '我们';
  }

  function getOwnerShort(owner: PartnerProfileOwner) {
    if (owner === 'userA') return userAName.slice(0, 1) || 'A';
    if (owner === 'userB') return userBName.slice(0, 1) || 'B';
    return '我们';
  }

  function createWelcomeChat(createdAt: string): ReconcileChatMessage {
    return {
      id: crypto.randomUUID(),
      role: 'bot',
      title: botName,
      body: `我在这里陪你们慢慢说。你们可以切换 ${userAName} / ${userBName} 发言；聊到一半时，点“${botName} 总结一下”，我会只根据上面的对话帮你们降温、找重点、给出更好开口的话。`,
      createdAt,
    };
  }

  function toggleMusic() {
    if (musicPlaying) {
      setMusicEnabled(false);
      stopAudioNodes();
      setMusicPlaying(false);
      return;
    }

    setMusicEnabled(true);
    void startMusic();
  }

  function getSessionPreview(session: ReconcileSession) {
    const lastMessage = session.messages.at(-1);
    if (!lastMessage) return '还没有开始聊天';
    const speaker = getRoleName(lastMessage.role);
    return `${speaker}：${lastMessage.body}`;
  }

  function updateActiveReconcileSession(updater: (session: ReconcileSession) => ReconcileSession) {
    setReconcileSessions((current) =>
      current.map((session) => session.id === activeReconcileSession.id ? updater(session) : session),
    );
  }

  function createReconcileSession() {
    const now = toDateTimeLocal(new Date());
    const id = crypto.randomUUID();
    const session: ReconcileSession = {
      id,
      title: '新的和好房间',
      createdAt: now,
      updatedAt: now,
      messages: [createWelcomeChat(now)],
    };

    setReconcileSessions((current) => [session, ...current]);
    setActiveReconcileSessionId(id);
    setReconcileChatInput('');
    setAgentError('');
    setReconcileScreen('room');
  }

  function openReconcileSession(id: string) {
    setActiveReconcileSessionId(id);
    setReconcileChatInput('');
    setAgentError('');
    setReconcileScreen('room');
  }

  const stopAudioNodes = useCallback(() => {
    if (musicTimerRef.current) {
      window.clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
    audioNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch {
        // The oscillator may already be stopped by the browser.
      }
      node.disconnect();
    });
    audioNodesRef.current = [];
    audioGainRef.current?.disconnect();
    audioGainRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const startMusic = useCallback(async () => {
    if (audioContextRef.current) return;
    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const gain = context.createGain();
    gain.gain.value = 0.035;
    gain.connect(context.destination);

    const lead = context.createOscillator();
    const harmony = context.createOscillator();
    lead.type = 'sine';
    harmony.type = 'triangle';
    lead.frequency.value = 392;
    harmony.frequency.value = 196;
    lead.connect(gain);
    harmony.connect(gain);
    lead.start();
    harmony.start();

    audioContextRef.current = context;
    audioGainRef.current = gain;
    audioNodesRef.current = [lead, harmony];

    const notes = [392, 440, 523.25, 493.88, 440, 392, 329.63, 349.23];
    let index = 0;
    const playStep = () => {
      const now = context.currentTime;
      const note = notes[index % notes.length];
      lead.frequency.setTargetAtTime(note, now, 0.08);
      harmony.frequency.setTargetAtTime(note / 2, now, 0.12);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.18);
      gain.gain.linearRampToValueAtTime(0.026, now + 0.9);
      index += 1;
    };

    playStep();
    musicTimerRef.current = window.setInterval(playStep, 950);

    try {
      await context.resume();
      setMusicPlaying(context.state === 'running');
    } catch {
      setMusicPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (musicEnabled) {
      void startMusic();
    } else {
      stopAudioNodes();
    }

    return () => stopAudioNodes();
  }, [musicEnabled, startMusic, stopAudioNodes]);

  async function uploadPhoto(file: File) {
    const normalizedSpace = sharedRoomKey;
    const preparedFile = await compressPhoto(file);
    if (preparedFile.size > 5_800_000) {
      throw new Error('照片太大了，请换一张较小的照片');
    }

    const formData = new FormData();
    formData.append('space', normalizedSpace);
    formData.append('photo', preparedFile);

    const response = await fetch('/api/photos', {
      method: 'POST',
      body: formData,
    });
    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('当前预览没有启动照片接口，请用 netlify dev 或部署后测试上传');
    }

    const payload = await response.json() as PhotoAttachment & { error?: string };
    if (!response.ok || payload.error) throw new Error(payload.error || '照片上传失败');
    return payload;
  }

  async function handlePhotoInput(
    event: ChangeEvent<HTMLInputElement>,
    target: 'event' | 'message' | 'future',
    photos: PhotoAttachment[],
    setPhotos: (photos: PhotoAttachment[]) => void,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCloudStatus('error');
      setCloudMessage('请选择图片文件');
      return;
    }

    setUploadingPhotoFor(target);
    setCloudStatus('saving');
    setCloudMessage('正在上传照片');
    try {
      const photo = await uploadPhoto(file);
      setPhotos([photo, ...photos].slice(0, 6));
      setCloudStatus('saved');
      setCloudMessage('照片已上传');
    } catch (error) {
      setCloudStatus('error');
      setCloudMessage(error instanceof Error ? error.message : '照片上传失败');
    } finally {
      setUploadingPhotoFor(null);
    }
  }

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
        photos: eventPhotos,
      },
      ...current,
    ]);
    setSelectedId(id);
    setEventComposerOpen(false);
    setTitle('');
    setNote('');
    setEmoji('💗');
    setEventPhotos([]);
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
    setPartnerProfile(starterPartnerProfile);
    setFuturePlans(starterFuturePlans);
    setHomeComposer(null);
    setEventPhotos([]);
    setMessagePhotos([]);
    setFuturePhotos([]);
  }

  function addPartnerProfileItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedLabel = profileLabel.trim();
    if (!trimmedLabel) return;

    setPartnerProfile((current) => [
      {
        id: crypto.randomUUID(),
        owner: profileOwner,
        label: trimmedLabel,
        updatedAt: toDateTimeLocal(new Date()),
      },
      ...current,
    ]);
    setHomeComposer(null);
    setProfileLabel('');
  }

  function addFuturePlanItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = futureTitle.trim();
    if (!trimmedTitle) return;

    setFuturePlans((current) => [
      {
        id: crypto.randomUUID(),
        title: trimmedTitle,
        note: futureNote.trim(),
        occasion: futureOccasion.trim() || '未来某天',
        status: futureStatus,
        createdAt: toDateTimeLocal(new Date()),
        photos: futurePhotos,
      },
      ...current,
    ]);
    setHomeComposer(null);
    setFutureTitle('');
    setFutureNote('');
    setFutureOccasion('下次见面');
    setFutureStatus('todo');
    setFuturePhotos([]);
  }

  function cycleFuturePlanStatus(id: string) {
    const nextStatus: Record<FuturePlanStatus, FuturePlanStatus> = {
      todo: 'planned',
      planned: 'done',
      done: 'todo',
    };

    setFuturePlans((current) =>
      current.map((item) => item.id === id ? { ...item, status: nextStatus[item.status] } : item),
    );
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
        to: messageTo.trim() || (messageKind === 'capsule' ? '未来的我们' : userBName),
        title: trimmedTitle || (messageKind === 'capsule' ? '给未来的一封信' : '悄悄话'),
        body: trimmedBody,
        createdAt: toDateTimeLocal(new Date()),
        deliveryMode: normalizedMode,
        openAt: normalizedMode === 'scheduled' ? openAt : undefined,
        anniversaryId: normalizedMode === 'anniversary' ? selectedCapsuleEvent?.id : undefined,
        meetingLabel: normalizedMode === 'meeting' ? '下次见面' : undefined,
        locationName: normalizedMode === 'location' ? locationName.trim() || '指定地点' : undefined,
        photos: messagePhotos,
      },
      ...current,
    ]);
    setComposeOpen(false);
    setMessageTitle('');
    setMessageBody('');
    setMessagePhotos([]);
  }

  function removeMessage(id: string) {
    setMessages((current) => current.filter((message) => message.id !== id));
  }

  async function requestReconcileAnalysis(conflict: string) {
    const response = await fetch('/api/reconcile-agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conflict,
        tone: 'soft',
        mood: '想和好',
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

    const nextResult = {
      answer: payload.answer || reconcileResult.answer,
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
    };

    setReconcileResult(nextResult);
    return nextResult;
  }

  function sendReconcileMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = reconcileChatInput.trim();
    if (!body) return;
    setAgentError('');
    const now = toDateTimeLocal(new Date());
    updateActiveReconcileSession((session) => {
      const messages = [
        ...session.messages,
        {
          id: crypto.randomUUID(),
          role: reconcileSpeaker,
          body,
          createdAt: now,
        },
      ];
      const humanCount = messages.filter((message) => message.role !== 'bot').length;
      return {
        ...session,
        title: session.title === '新的和好房间' && humanCount === 1 ? body.slice(0, 14) || session.title : session.title,
        updatedAt: now,
        messages,
      };
    });
    setReconcileChatInput('');
  }

  async function summarizeReconcileChat() {
    const humanMessages = activeReconcileSession.messages.filter((message) => message.role !== 'bot');
    if (!humanMessages.length || agentLoading) {
      setAgentError(`先让 ${userAName} 和 ${userBName} 说几句，${botName} 才知道怎么帮你们。`);
      return;
    }

    const transcript = humanMessages
      .slice(-40)
      .map((message) => `${getRoleName(message.role)}：${message.body}`)
      .join('\n');

    setAgentLoading(true);
    setAgentError('');

    try {
      const result = await requestReconcileAnalysis(
        `下面是情侣吵架聊天室里的对话。请你作为第三方智能调停机器人，像自然聊天一样总结双方真正想表达的内容，指出误会可能在哪里，给出现在最适合的一步，并生成一段其中一方可以温柔发给对方的话。\n\n${transcript}`,
      );
      const now = toDateTimeLocal(new Date());
      updateActiveReconcileSession((session) => ({
        ...session,
        updatedAt: now,
        messages: [
          ...session.messages,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            title: botName,
            body: result.answer || result.repairAdvice,
            createdAt: now,
          },
        ],
      }));
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : '智能体暂时不可用，请稍后再试');
    } finally {
      setAgentLoading(false);
    }
  }

  function resetReconcileChat() {
    const now = toDateTimeLocal(new Date());
    updateActiveReconcileSession((session) => ({
      ...session,
      updatedAt: now,
      messages: [createWelcomeChat(now)],
    }));
    setReconcileChatInput('');
    setAgentError('');
  }

  const pageTitle =
    activeTab === 'timeline' ? '时间轴' : activeTab === 'letters' ? '信件' : activeTab === 'map' ? '和好智能体' : activeTab === 'more' ? '家' : '爱的地图';
  const pageSubtitle =
    activeTab === 'timeline'
      ? `${events.length} 个共同回忆`
      : activeTab === 'letters'
        ? '悄悄话与时光胶囊'
        : activeTab === 'map'
          ? '不评判，只帮你们靠近'
          : activeTab === 'more'
            ? '我们的房间与同步设置'
            : '记录属于我们的甜蜜回忆';

  function renderPhotoPicker(
    label: string,
    target: 'event' | 'message' | 'future',
    photos: PhotoAttachment[],
    setPhotos: (photos: PhotoAttachment[]) => void,
  ) {
    return (
      <div className="photo-picker">
        <div>
          <span>{label}</span>
          <label>
            {uploadingPhotoFor === target ? '上传中...' : '＋ 添加照片'}
            <input
              type="file"
              accept="image/*"
              disabled={uploadingPhotoFor === target}
              onChange={(event) => void handlePhotoInput(event, target, photos, setPhotos)}
            />
          </label>
        </div>
        {photos.length > 0 && (
          <div className="photo-strip">
            {photos.map((photo) => (
              <figure className="photo-thumb" key={photo.id}>
                <img src={photo.url} alt={photo.name || '上传的照片'} />
                <button type="button" onClick={() => setPhotos(photos.filter((item) => item.id !== photo.id))} aria-label={`移除 ${photo.name}`}>
                  ×
                </button>
              </figure>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className={todaysEvents.length ? 'love-app celebrating' : 'love-app'}>
      <div className="phone-shell">
        <header className={activeTab === 'more' ? 'app-header home-hidden-header' : 'app-header'}>
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
            <div className="header-actions">
              <button
                className={musicPlaying ? 'music-toggle playing' : 'music-toggle'}
                type="button"
                aria-label={musicPlaying ? '关闭背景音乐' : '打开背景音乐'}
                onClick={toggleMusic}
              >
                {musicPlaying ? '♪' : '音'}
              </button>
              <div className="profile-badge" aria-label="纪念日主人">
                <span className="avatar avatar-one">{userAName.slice(0, 1) || 'A'}</span>
                <strong>{userAName}</strong>
                <em>🌸</em>
              </div>
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
                        {event.photos?.[0] ? (
                          <img src={event.photos[0].url} alt={event.title} />
                        ) : (
                          <strong>{event.emoji}</strong>
                        )}
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
                  <input value={messageTo} onChange={(event) => setMessageTo(event.target.value)} placeholder={`${userBName} / 未来的我们`} />
                </label>
                <label>
                  标题
                  <input value={messageTitle} onChange={(event) => setMessageTitle(event.target.value)} placeholder="例如：见面那天再看" />
                </label>
                <label>
                  内容
                  <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="写一封小纸条给 TA 吧" />
                </label>
                {renderPhotoPicker('附加照片', 'message', messagePhotos, setMessagePhotos)}

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
                    {message.photos?.length ? (
                      <div className="letter-photo-grid">
                        {message.photos.slice(0, 3).map((photo) => (
                          <img src={photo.url} alt={photo.name || message.title} key={photo.id} />
                        ))}
                      </div>
                    ) : message.kind === 'whisper' && message.body.length > 8 && (
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
            {reconcileScreen === 'sessions' ? (
              <section className="reconcile-session-hub" aria-label="和好会话列表">
                <section className="session-hero-card">
                  <div>
                    <span>桃桃聊天室</span>
                    <h2>把话说开</h2>
                    <p>每一次愿意沟通，都会被好好保存。</p>
                  </div>
                </section>

                <button className="new-session-card" type="button" onClick={createReconcileSession}>
                  <span>＋</span>
                  <div>
                    <strong>新建和好房间</strong>
                    <p>{userAName}、{userBName} 和 {botName} 一起慢慢聊</p>
                  </div>
                  <em>›</em>
                </button>

                <section className="session-list" aria-label="最近会话">
                  <div className="section-title">
                    <div>
                      <p>最近会话</p>
                      <h2>继续上一次没有说完的话</h2>
                    </div>
                  </div>
                  {reconcileSessions.map((session) => (
                    <article className="session-card" key={session.id}>
                      <button type="button" onClick={() => openReconcileSession(session.id)}>
                        <div>
                          <h3>{session.title}</h3>
                          <time>{session.updatedAt.slice(0, 10)}</time>
                        </div>
                        <div className="session-avatars" aria-hidden="true">
                          <span> A </span>
                          <span> B </span>
                          <span>桃</span>
                        </div>
                        <p>{getSessionPreview(session)}</p>
                        <strong>继续聊 ›</strong>
                      </button>
                    </article>
                  ))}
                </section>
              </section>
            ) : (
            <section className="reconcile-chat-page" aria-label="和好三方聊天室">
              <div className="room-back-row">
                <button type="button" onClick={() => setReconcileScreen('sessions')} aria-label="返回会话列表">
                  ‹ 会话
                </button>
                <span>{activeReconcileSession.title}</span>
              </div>

              <section className="repair-stage chat-stage" aria-label="三十秒降温">
                <div className="repair-stage-copy">
                  <span>{botName} 在房间里</span>
                  <h2>慢慢说</h2>
                  <p>{userAName} 和 {userBName} 都可以发言，需要时让 {botName} 总结。</p>
                </div>
                <div className="breathing-circle compact" aria-hidden="true">
                  <strong>30</strong>
                  <em>秒</em>
                </div>
              </section>

              <div className="room-toolbar" aria-label="聊天室操作">
                <div className="speaker-switch" aria-label="当前发言人">
                  {([
                    ['userA', userAName],
                    ['userB', userBName],
                  ] as const).map(([role, label]) => (
                    <button
                      key={role}
                      type="button"
                      className={reconcileSpeaker === role ? 'active' : ''}
                      onClick={() => setReconcileSpeaker(role)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button className="summarize-button" type="button" onClick={summarizeReconcileChat} disabled={agentLoading}>
                  {agentLoading ? `${botName} 正在想` : `${botName} 总结一下`}
                </button>
              </div>

              <div className="chat-thread room-thread" aria-live="polite">
                {reconcileChatMessages.map((message) => (
                  <article className={`chat-bubble ${message.role}`} key={message.id}>
                    <span>
                      {message.role === 'bot' ? message.title || botName : getRoleName(message.role)}
                    </span>
                    <p>{message.body}</p>
                  </article>
                ))}
                {agentLoading && (
                  <article className="chat-bubble bot typing">
                    <span>{botName}</span>
                    <p>我在读你们刚才说的话，先帮你们把情绪和真正想表达的意思分开。</p>
                  </article>
                )}
              </div>

              <div className="suggestion-row" aria-label="快捷输入">
                {['我现在有点委屈', '我不是不在乎你', '我们能不能慢慢说'].map((text) => (
                  <button key={text} type="button" onClick={() => setReconcileChatInput(text)}>
                    {text}
                  </button>
                ))}
              </div>

              {agentError && <p className="agent-error">{agentError}</p>}
              <form className="chat-input-bar" onSubmit={sendReconcileMessage}>
                <input
                  value={reconcileChatInput}
                  onChange={(event) => setReconcileChatInput(event.target.value)}
                  placeholder={`${getRoleName(reconcileSpeaker)} 说点什么...`}
                  aria-label="聊天室发言"
                />
                <button type="submit" disabled={!reconcileChatInput.trim()}>
                  发送
                </button>
              </form>

              <button className="clear-room-button" type="button" onClick={resetReconcileChat}>
                清空并重新聊
              </button>
            </section>
            )}
          </section>
        ) : activeTab === 'more' ? (
          <section className="settings-view" aria-label="家">
            <section className="home-scene" aria-label="我们的房间">
              <div className="home-status-bar" aria-hidden="true">
                <strong>9:41</strong>
                <span>▮▮▮ ◒ ▰</span>
              </div>
              <div className="home-scene-copy">
                <h2>家 <span>♥</span></h2>
                <p>我们的房间</p>
                <small>和你在一起，<br />就是最温暖的家。</small>
              </div>
              <div className="home-living-room" aria-hidden="true">
                <span className="wall-note">一起<br />更好的未来 ♡</span>
                <span className="flower-vase" />
                <span className="plant-leaf leaf-one" />
                <span className="plant-leaf leaf-two" />
                <span className="plant-leaf leaf-three" />
                <span className="sofa-back" />
                <span className="sofa-seat" />
                <span className="soft-pillow">有你<br />就有家 ♡</span>
              </div>
            </section>

            <article className="home-room-card">
              <div className="room-visual" aria-hidden="true">
                <span>⌂</span>
                <i>♥</i>
              </div>
              <div className="sync-status-row">
                <div>
                  <p>房间名称</p>
                  <h2>
                    {roomDisplayName}
                    <button type="button" onClick={() => setHomeComposer('room')} aria-label="编辑房间名称">
                      ✎
                    </button>
                  </h2>
                  <small title={cloudMessage}><span className={`sync-dot ${cloudStatus}`} />{homeSyncLabel} · 两个人的爱都在这里</small>
                </div>
                <em>›</em>
              </div>
            </article>

            <section className="home-memory-card partner-profile-card" aria-label="双方性格爱好">
              <div className="section-title">
                <span className="home-section-icon">♥</span>
                <div>
                  <p>双方性格爱好</p>
                  <h2>所有标签都可以自己定义</h2>
                </div>
                <button type="button" onClick={() => setHomeComposer('profile')}>
                  ♡
                </button>
              </div>

              <div className="tag-wall">
                {partnerProfile.slice(0, 8).map((item, index) => (
                  <button
                    className={`couple-tag-note owner-${item.owner}`}
                    style={{ '--tag-tilt': `${[-4, 3, -2, 4, -3, 2, -5, 3][index % 8]}deg` } as CSSProperties}
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setProfileOwner(item.owner);
                      setHomeComposer('profile');
                    }}
                  >
                    <span>{getOwnerShort(item.owner)}</span>
                    <strong>{item.label}</strong>
                  </button>
                ))}
                <button className="add-tag-note" type="button" onClick={() => setHomeComposer('profile')}>
                  <span>＋</span>
                  添加标签
                </button>
                <p>不同的我们，<br />更完整的爱。</p>
              </div>
            </section>

            <section className="home-memory-card future-plan-card" aria-label="未来想一起做">
              <div className="section-title">
                <span className="home-section-icon star">★</span>
                <div>
                  <p>未来想一起做</p>
                  <h2>把想做的事，一件件变成我们的回忆。</h2>
                </div>
                <button type="button" onClick={() => setHomeComposer('future')}>
                  添加 <span>＋</span>
                </button>
              </div>

              <div className="future-list">
                {futurePlans.slice(0, 3).map((item, index) => (
                  <article className={`future-item ${item.status}`} key={item.id}>
                    <button type="button" onClick={() => cycleFuturePlanStatus(item.id)} aria-label={`切换 ${item.title} 状态`}>
                      {item.status === 'done' ? '✓' : ''}
                    </button>
                    <div className={`future-thumb thumb-${index + 1}`}>
                      {item.photos?.[0] && <img src={item.photos[0].url} alt={item.title} />}
                    </div>
                    <div>
                      <h3>{item.title}</h3>
                      {item.note && <p>{item.note}</p>}
                    </div>
                    <span>{item.occasion}</span>
                    <em>›</em>
                  </article>
                ))}
              </div>
              <p className="future-signature">未来的每一件小事<br />都有你 ♡</p>
            </section>

            <button className="reset-wide-button" type="button" onClick={resetDemo}>
              重置为示例内容
            </button>

            {homeComposer === 'room' && (
              <div className="modal-backdrop" role="presentation">
                <section className="composer-card modal-card" role="dialog" aria-modal="true" aria-label="编辑房间名称">
                  <div className="section-title">
                    <div>
                      <p>我们的房间</p>
                      <h2>改房间名称和两个人的名字</h2>
                    </div>
                    <button type="button" onClick={() => setHomeComposer(null)}>
                      关闭
                    </button>
                  </div>
                  <label>
                    房间名称
                    <input
                      value={roomSettings.roomName}
                      onChange={(event) => setRoomSettings((current) => ({ ...current, roomName: event.target.value }))}
                      placeholder="例如：我们的小窝"
                    />
                  </label>
                  <label>
                    用户 A 名字
                    <input
                      value={roomSettings.userAName}
                      onChange={(event) => setRoomSettings((current) => ({ ...current, userAName: event.target.value }))}
                      placeholder="输入用户 A 的名字"
                    />
                  </label>
                  <label>
                    用户 B 名字
                    <input
                      value={roomSettings.userBName}
                      onChange={(event) => setRoomSettings((current) => ({ ...current, userBName: event.target.value }))}
                      placeholder="输入用户 B 的名字"
                    />
                  </label>
                  <button className="save-button" type="button" onClick={() => setHomeComposer(null)}>
                    保存设置
                  </button>
                </section>
              </div>
            )}

            {homeComposer === 'profile' && (
              <div className="modal-backdrop" role="presentation">
                <section className="composer-card modal-card" role="dialog" aria-modal="true" aria-label="添加双方性格爱好标签">
                  <div className="section-title">
                    <div>
                      <p>双方性格爱好</p>
                      <h2>添加一个自定义标签</h2>
                    </div>
                    <button type="button" onClick={() => setHomeComposer(null)}>
                      关闭
                    </button>
                  </div>
                  <form onSubmit={addPartnerProfileItem}>
                    <label>
                      归属
                      <select value={profileOwner} onChange={(event) => setProfileOwner(event.target.value as PartnerProfileOwner)}>
                        {(Object.keys(partnerOwnerMeta) as PartnerProfileOwner[]).map((owner) => (
                          <option key={owner} value={owner}>{getOwnerLabel(owner)}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      标签
                      <input value={profileLabel} onChange={(event) => setProfileLabel(event.target.value)} placeholder="例如：慢热 / 爱拍照 / 喜欢散步" />
                    </label>
                    <button className="save-button" type="submit">
                      保存标签
                    </button>
                  </form>
                </section>
              </div>
            )}

            {homeComposer === 'future' && (
              <div className="modal-backdrop" role="presentation">
                <section className="composer-card modal-card" role="dialog" aria-modal="true" aria-label="添加未来想一起做的事情">
                  <div className="section-title">
                    <div>
                      <p>未来想一起做</p>
                      <h2>把一个小愿望放进家里</h2>
                    </div>
                    <button type="button" onClick={() => setHomeComposer(null)}>
                      关闭
                    </button>
                  </div>
                  <form onSubmit={addFuturePlanItem}>
                    <label>
                      想做的事
                      <input value={futureTitle} onChange={(event) => setFutureTitle(event.target.value)} placeholder="例如：一周年去海边" />
                    </label>
                    <label>
                      场景
                      <input value={futureOccasion} onChange={(event) => setFutureOccasion(event.target.value)} placeholder="一周年 / 下次见面 / 某个周末" />
                    </label>
                    <label>
                      状态
                      <select value={futureStatus} onChange={(event) => setFutureStatus(event.target.value as FuturePlanStatus)}>
                        {(Object.entries(futureStatusMeta) as [FuturePlanStatus, { label: string; icon: string }][]).map(([status, meta]) => (
                          <option key={status} value={status}>{meta.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      小备注
                      <textarea value={futureNote} onChange={(event) => setFutureNote(event.target.value)} placeholder="写一句为什么想一起做" />
                    </label>
                    {renderPhotoPicker('愿望配图', 'future', futurePhotos, setFuturePhotos)}
                    <button className="save-button" type="submit">
                      保存未来清单
                    </button>
                  </form>
                </section>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="mood-card" aria-label="今日心情">
              <div className="mood-box happy">
                <span>🌸</span>
                <strong>开心</strong>
                <p>{userAName}</p>
              </div>
              <div className="mood-divider">
                <span />
                <strong>♥</strong>
                <span />
              </div>
              <div className="mood-box cloud">
                <span>☁️</span>
                <strong>{todaysEvents.length ? '超想庆祝' : '还没记心情'}</strong>
                <p>{userBName}</p>
              </div>
              <footer>
                <span>♥</span>
                <strong>戳一戳 {userBName}</strong>
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
                    {renderPhotoPicker('纪念照片', 'event', eventPhotos, setEventPhotos)}
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
