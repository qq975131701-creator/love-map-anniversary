'use client';

/* eslint-disable @next/next/no-img-element -- User-uploaded Blob photos are served through Netlify Functions in a static export. */
import { ChangeEvent, FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

const TimelineTab = lazy(() => import('./components/TimelineTab'));
const LettersTab = lazy(() => import('./components/LettersTab'));
const HouseTab = lazy(() => import('./components/HouseTab'));

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

type TabId = 'home' | 'timeline' | 'letters' | 'more';
type CloudStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'saved' | 'local' | 'error';
type SharedMemoryData = {
  empty?: boolean;
  space?: string;
  roomSettings?: RoomSettings;
  events: Anniversary[];
  messages: SecretMessage[];
  partnerProfile?: PartnerProfileItem[];
  futurePlans?: FuturePlanItem[];
  updatedAt?: string | null;
};
type RoomSettings = {
  roomName: string;
  userAName: string;
  userBName: string;
};
type PartnerProfileOwner = 'userA' | 'userB' | 'us';
type PartnerProfileItem = {
  id: string;
  owner: PartnerProfileOwner;
  label: string;
  updatedAt: string;
};
type FuturePlanStatus = 'todo' | 'planned' | 'done';
type FuturePlanView = 'all' | 'open' | 'done';
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
const partnerProfileStorageKey = 'love-map-partner-profile-v1';
const futurePlanStorageKey = 'love-map-future-plans-v1';
const roomSettingsStorageKey = 'love-map-room-settings-v1';
const legacySpaceStorageKey = 'love-map-space-code-v1';
const sharedRoomKey = 'dadata-xiaoxiao';
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
  const skipNextSaveRef = useRef(false);
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
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [profileOwner, setProfileOwner] = useState<PartnerProfileOwner>('userA');
  const [profileLabel, setProfileLabel] = useState('');
  const [futureTitle, setFutureTitle] = useState('');
  const [futureNote, setFutureNote] = useState('');
  const [futureOccasion, setFutureOccasion] = useState('下次见面');
  const [futureStatus, setFutureStatus] = useState<FuturePlanStatus>('todo');
  const [futureView, setFutureView] = useState<FuturePlanView>('all');
  const [futurePhotos, setFuturePhotos] = useState<PhotoAttachment[]>([]);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<'event' | 'message' | 'future' | null>(null);
  const [localHydrated, setLocalHydrated] = useState(false);
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

      } catch {
        setEvents(starterEvents);
        setMessages(starterMessages);
        setPartnerProfile(starterPartnerProfile);
        setFuturePlans(starterFuturePlans);
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

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      savePendingRef.current = false;
      return;
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
        body: JSON.stringify({ roomSettings, events, messages, partnerProfile, futurePlans }),
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
  }, [cloudHydrated, events, futurePlans, localHydrated, messages, partnerProfile, roomSettings]);

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
          skipNextSaveRef.current = true;
          if (homeComposer !== 'room') {
            const nextRoomSettings = normalizeRoomSettings(payload.roomSettings);
            setRoomSettings((current) => sameRoomSettings(current, nextRoomSettings) ? current : nextRoomSettings);
          }
          setPartnerProfile(payload.partnerProfile?.length ? normalizePartnerProfile(payload.partnerProfile) : starterPartnerProfile);
          setFuturePlans(payload.futurePlans?.length ? normalizeFuturePlans(payload.futurePlans) : starterFuturePlans);
        })
        .catch(() => undefined);
    };

    syncSharedMemory();
    const timer = window.setInterval(syncSharedMemory, 6000);

    return () => window.clearInterval(timer);
  }, [cloudHydrated, cloudStatus, homeComposer]);

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
  const visiblePartnerProfile = profileExpanded ? partnerProfile : partnerProfile.slice(0, 8);
  const visibleFuturePlans = futurePlans.filter((item) => {
    if (futureView === 'done') return item.status === 'done';
    if (futureView === 'open') return item.status !== 'done';
    return true;
  });
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

  const pageTitle =
    activeTab === 'timeline' ? '时间轴' : activeTab === 'letters' ? '信件' : activeTab === 'more' ? '家' : '爱的地图';
  const pageSubtitle =
    activeTab === 'timeline'
      ? `${events.length} 个共同回忆`
      : activeTab === 'letters'
        ? '悄悄话与时光胶囊'
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
            <button className="round-menu" type="button" aria-label="时间轴菜单">≡</button>
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
          <Suspense fallback={<section className="tab-loading">正在打开时间轴...</section>}>
            <TimelineTab
              groups={timelineGroups}
              oldestFirst={oldestFirst}
              selectedId={selectedId}
              onToggleOrder={() => setOldestFirst((value) => !value)}
              onSelect={setSelectedId}
              onRemove={removeEvent}
            />
          </Suspense>
        ) : activeTab === 'letters' ? (
          <Suspense fallback={<section className="tab-loading">正在打开信箱...</section>}>
            <LettersTab
              messageKind={messageKind}
              composeOpen={composeOpen}
              messageTo={messageTo}
              messageTitle={messageTitle}
              messageBody={messageBody}
              deliveryMode={deliveryMode}
              openAt={openAt}
              capsuleEventId={capsuleEventId}
              locationName={locationName}
              arrivedLocation={arrivedLocation}
              events={events}
              lockedCapsules={lockedCapsules}
              openMessages={openMessages}
              userBName={userBName}
              photoPicker={renderPhotoPicker('附加照片', 'message', messagePhotos, setMessagePhotos)}
              onKindChange={(kind) => {
                setMessageKind(kind);
                if (kind === 'whisper') setDeliveryMode('now');
                else {
                  setDeliveryMode('anniversary');
                  setMessageTo('未来的我们');
                }
              }}
              onToChange={setMessageTo}
              onTitleChange={setMessageTitle}
              onBodyChange={setMessageBody}
              onDeliveryModeChange={setDeliveryMode}
              onOpenAtChange={setOpenAt}
              onCapsuleEventChange={setCapsuleEventId}
              onLocationNameChange={setLocationName}
              onArrivedLocationChange={setArrivedLocation}
              onSubmit={sendMessage}
              onRemove={removeMessage}
              getMessageStatus={getMessageStatus}
            />
          </Suspense>
        ) : activeTab === 'more' ? (
          <Suspense fallback={<section className="tab-loading">正在打开我们的家...</section>}>
            <HouseTab
              roomDisplayName={roomDisplayName}
              roomSettings={roomSettings}
              cloudMessage={cloudMessage}
              cloudStatus={cloudStatus}
              homeSyncLabel={homeSyncLabel}
              composer={homeComposer}
              profileExpanded={profileExpanded}
              visiblePartnerProfile={visiblePartnerProfile}
              profileOwner={profileOwner}
              profileLabel={profileLabel}
              futureView={futureView}
              visibleFuturePlans={visibleFuturePlans}
              futureTitle={futureTitle}
              futureOccasion={futureOccasion}
              futureStatus={futureStatus}
              futureNote={futureNote}
              futurePhotoPicker={renderPhotoPicker('愿望配图', 'future', futurePhotos, setFuturePhotos)}
              onComposerChange={setHomeComposer}
              onRoomSettingsChange={setRoomSettings}
              onProfileExpandedChange={setProfileExpanded}
              onProfileOwnerChange={setProfileOwner}
              onProfileLabelChange={setProfileLabel}
              onProfileSubmit={addPartnerProfileItem}
              onFutureViewChange={setFutureView}
              onFutureStatusToggle={cycleFuturePlanStatus}
              onFutureTitleChange={setFutureTitle}
              onFutureOccasionChange={setFutureOccasion}
              onFutureStatusChange={setFutureStatus}
              onFutureNoteChange={setFutureNote}
              onFutureSubmit={addFuturePlanItem}
              onReset={resetDemo}
              getOwnerLabel={getOwnerLabel}
              getOwnerShort={getOwnerShort}
            />
          </Suspense>
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
