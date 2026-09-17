'use client';

/* eslint-disable @next/next/no-img-element -- Blob photos are already compressed and served by Netlify Functions. */

import type { CSSProperties, FormEvent, ReactNode } from 'react';

type PartnerProfileOwner = 'userA' | 'userB' | 'us';
type FuturePlanStatus = 'todo' | 'planned' | 'done';
type FuturePlanView = 'all' | 'open' | 'done';

type PartnerProfileItem = { id: string; owner: PartnerProfileOwner; label: string };
type FuturePlanItem = {
  id: string;
  title: string;
  note: string;
  occasion: string;
  status: FuturePlanStatus;
  photos?: { id: string; url: string }[];
};
type RoomSettings = { roomName: string; userAName: string; userBName: string };

type HouseTabProps = {
  roomDisplayName: string;
  roomSettings: RoomSettings;
  cloudMessage: string;
  cloudStatus: string;
  homeSyncLabel: string;
  composer: 'room' | 'profile' | 'future' | null;
  profileExpanded: boolean;
  visiblePartnerProfile: PartnerProfileItem[];
  profileOwner: PartnerProfileOwner;
  profileLabel: string;
  futureView: FuturePlanView;
  visibleFuturePlans: FuturePlanItem[];
  futureTitle: string;
  futureOccasion: string;
  futureStatus: FuturePlanStatus;
  futureNote: string;
  futurePhotoPicker: ReactNode;
  onComposerChange: (value: HouseTabProps['composer']) => void;
  onRoomSettingsChange: (value: RoomSettings) => void;
  onProfileExpandedChange: (value: boolean) => void;
  onProfileOwnerChange: (value: PartnerProfileOwner) => void;
  onProfileLabelChange: (value: string) => void;
  onProfileSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFutureViewChange: (value: FuturePlanView) => void;
  onFutureStatusToggle: (id: string) => void;
  onFutureTitleChange: (value: string) => void;
  onFutureOccasionChange: (value: string) => void;
  onFutureStatusChange: (value: FuturePlanStatus) => void;
  onFutureNoteChange: (value: string) => void;
  onFutureSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  getOwnerLabel: (owner: PartnerProfileOwner) => string;
  getOwnerShort: (owner: PartnerProfileOwner) => string;
};

const futureStatusLabels: Record<FuturePlanStatus, string> = {
  todo: '想做',
  planned: '约定中',
  done: '已完成',
};

export default function HouseTab(props: HouseTabProps) {
  const {
    roomDisplayName, roomSettings, cloudMessage, cloudStatus, homeSyncLabel, composer,
    profileExpanded, visiblePartnerProfile, profileOwner, profileLabel, futureView,
    visibleFuturePlans, futureTitle, futureOccasion, futureStatus, futureNote,
    futurePhotoPicker, onComposerChange, onRoomSettingsChange, onProfileExpandedChange,
    onProfileOwnerChange, onProfileLabelChange, onProfileSubmit, onFutureViewChange,
    onFutureStatusToggle, onFutureTitleChange, onFutureOccasionChange, onFutureStatusChange,
    onFutureNoteChange, onFutureSubmit, onReset, getOwnerLabel, getOwnerShort,
  } = props;

  return (
    <section className="settings-view" aria-label="家">
      <section className="home-scene" aria-label="我们的房间">
        <div className="home-scene-copy">
          <p className="home-room-title">
            {roomDisplayName}
            <button type="button" onClick={() => onComposerChange('room')} aria-label="编辑房间名称">✎</button>
          </p>
          <em title={cloudMessage}><span className={`sync-dot ${cloudStatus}`} />{homeSyncLabel} · 两个人的爱都在这里</em>
          <small>和你在一起，<br />就是最温暖的家。</small>
        </div>
      </section>

      <section className="home-memory-card partner-profile-card" aria-label="双方性格爱好">
        <div className="section-title">
          <span className="home-section-icon">♥</span>
          <div><p>双方性格爱好</p><h2>所有标签都可以自己定义</h2></div>
          <button type="button" onClick={() => onComposerChange('profile')}>♡</button>
        </div>
        <div className={profileExpanded ? 'tag-wall expanded' : 'tag-wall'}>
          {visiblePartnerProfile.map((item, index) => (
            <button
              className={`couple-tag-note owner-${item.owner}`}
              style={{ '--tag-tilt': `${[-4, 3, -2, 4, -3, 2, -5, 3][index % 8]}deg` } as CSSProperties}
              type="button"
              key={item.id}
              onClick={() => { onProfileOwnerChange(item.owner); onComposerChange('profile'); }}
            >
              <span>{getOwnerShort(item.owner)}</span><strong>{item.label}</strong>
            </button>
          ))}
          <button className="add-tag-note more-tag-note" type="button" aria-expanded={profileExpanded} onClick={() => onProfileExpandedChange(!profileExpanded)}>
            <span>{profileExpanded ? '⌃' : '⋯'}</span>{profileExpanded ? '收起' : '更多'}
          </button>
          <p>不同的我们，<br />更完整的爱。</p>
        </div>
      </section>

      <section className="home-memory-card future-plan-card" aria-label="未来想一起做">
        <div className="section-title">
          <span className="home-section-icon star">★</span>
          <div><p>未来想一起做</p><h2>把想做的事，一件件变成我们的回忆。</h2></div>
          <button type="button" onClick={() => onComposerChange('future')}>♡</button>
        </div>
        <div className="future-filter" aria-label="未来计划筛选">
          {([['all', '全部'], ['open', '未做完'], ['done', '已做完']] as [FuturePlanView, string][]).map(([view, label]) => (
            <button key={view} type="button" className={futureView === view ? 'active' : ''} onClick={() => onFutureViewChange(view)}>{label}</button>
          ))}
        </div>
        <div className="future-list">
          {visibleFuturePlans.length === 0 && (
            <article className="future-empty">
              {futureView === 'done' ? '还没有完成的愿望' : futureView === 'open' ? '暂时没有未完成的愿望' : '还没有写下想一起做的事'}
            </article>
          )}
          {visibleFuturePlans.slice(0, 3).map((item, index) => (
            <article className={`future-item ${item.status}`} key={item.id}>
              <button type="button" onClick={() => onFutureStatusToggle(item.id)} aria-label={`切换 ${item.title} 状态`}>{item.status === 'done' ? '✓' : ''}</button>
              <div className={`future-thumb thumb-${(index % 3) + 1}`}>
                {item.photos?.[0] && <img loading="lazy" decoding="async" src={item.photos[0].url} alt={item.title} />}
              </div>
              <div><h3>{item.title}</h3>{item.note && <p>{item.note}</p>}</div>
              <span>{item.occasion}</span><em>›</em>
            </article>
          ))}
          {visibleFuturePlans.length > 3 && (
            <div className="future-extra-grid" aria-label="更多未来计划">
              {visibleFuturePlans.slice(3).map((item, index) => (
                <button className={`future-extra-card ${item.status}`} type="button" key={item.id} onClick={() => onFutureStatusToggle(item.id)} aria-label={`切换 ${item.title} 状态`}>
                  <span className={`future-thumb thumb-${((index + 3) % 3) + 1}`}>
                    {item.photos?.[0] && <img loading="lazy" decoding="async" src={item.photos[0].url} alt={item.title} />}
                  </span>
                  <strong>{item.title}</strong><em>{item.occasion}</em>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="future-signature">未来的每一件小事<br />都有你 ♡</p>
      </section>

      <button className="reset-wide-button" type="button" onClick={onReset}>重置为示例内容</button>

      {composer === 'room' && (
        <div className="modal-backdrop" role="presentation">
          <section className="composer-card modal-card" role="dialog" aria-modal="true" aria-label="编辑房间名称">
            <div className="section-title"><div><p>我们的房间</p><h2>改房间名称和两个人的名字</h2></div><button type="button" onClick={() => onComposerChange(null)}>关闭</button></div>
            <label>房间名称<input value={roomSettings.roomName} onChange={(event) => onRoomSettingsChange({ ...roomSettings, roomName: event.target.value })} placeholder="例如：我们的小窝" /></label>
            <label>用户 A 名字<input value={roomSettings.userAName} onChange={(event) => onRoomSettingsChange({ ...roomSettings, userAName: event.target.value })} placeholder="输入用户 A 的名字" /></label>
            <label>用户 B 名字<input value={roomSettings.userBName} onChange={(event) => onRoomSettingsChange({ ...roomSettings, userBName: event.target.value })} placeholder="输入用户 B 的名字" /></label>
            <button className="save-button" type="button" onClick={() => onComposerChange(null)}>保存设置</button>
          </section>
        </div>
      )}

      {composer === 'profile' && (
        <div className="modal-backdrop" role="presentation">
          <section className="composer-card modal-card" role="dialog" aria-modal="true" aria-label="添加双方性格爱好标签">
            <div className="section-title"><div><p>双方性格爱好</p><h2>添加一个自定义标签</h2></div><button type="button" onClick={() => onComposerChange(null)}>关闭</button></div>
            <form onSubmit={onProfileSubmit}>
              <label>归属<select value={profileOwner} onChange={(event) => onProfileOwnerChange(event.target.value as PartnerProfileOwner)}>
                {(['userA', 'userB', 'us'] as PartnerProfileOwner[]).map((owner) => <option key={owner} value={owner}>{getOwnerLabel(owner)}</option>)}
              </select></label>
              <label>标签<input value={profileLabel} onChange={(event) => onProfileLabelChange(event.target.value)} placeholder="例如：慢热 / 爱拍照 / 喜欢散步" /></label>
              <button className="save-button" type="submit">保存标签</button>
            </form>
          </section>
        </div>
      )}

      {composer === 'future' && (
        <div className="modal-backdrop" role="presentation">
          <section className="composer-card modal-card" role="dialog" aria-modal="true" aria-label="添加未来想一起做的事情">
            <div className="section-title"><div><p>未来想一起做</p><h2>把一个小愿望放进家里</h2></div><button type="button" onClick={() => onComposerChange(null)}>关闭</button></div>
            <form onSubmit={onFutureSubmit}>
              <label>想做的事<input value={futureTitle} onChange={(event) => onFutureTitleChange(event.target.value)} placeholder="例如：一周年去海边" /></label>
              <label>场景<input value={futureOccasion} onChange={(event) => onFutureOccasionChange(event.target.value)} placeholder="一周年 / 下次见面 / 某个周末" /></label>
              <label>状态<select value={futureStatus} onChange={(event) => onFutureStatusChange(event.target.value as FuturePlanStatus)}>
                {(Object.entries(futureStatusLabels) as [FuturePlanStatus, string][]).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
              </select></label>
              <label>小备注<textarea value={futureNote} onChange={(event) => onFutureNoteChange(event.target.value)} placeholder="写一句为什么想一起做" /></label>
              {futurePhotoPicker}
              <button className="save-button" type="submit">保存未来清单</button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
