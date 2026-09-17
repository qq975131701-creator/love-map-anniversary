'use client';

/* eslint-disable @next/next/no-img-element -- Blob photos are already compressed and served by Netlify Functions. */

import type { FormEvent, ReactNode } from 'react';
import { optimizedPhotoUrl } from './photo-url';

type MessageKind = 'whisper' | 'capsule';
type DeliveryMode = 'now' | 'scheduled' | 'anniversary' | 'meeting' | 'location';

type LetterPhoto = {
  id: string;
  url: string;
  name: string;
};

export type LetterMessage = {
  id: string;
  kind: MessageKind;
  to: string;
  title: string;
  body: string;
  createdAt: string;
  deliveryMode: DeliveryMode;
  photos?: LetterPhoto[];
};

type EventOption = { id: string; title: string };

type LettersTabProps = {
  messageKind: MessageKind;
  composeOpen: boolean;
  messageTo: string;
  messageTitle: string;
  messageBody: string;
  deliveryMode: DeliveryMode;
  openAt: string;
  capsuleEventId: string;
  locationName: string;
  arrivedLocation: string;
  events: EventOption[];
  lockedCapsules: LetterMessage[];
  openMessages: LetterMessage[];
  userBName: string;
  photoPicker: ReactNode;
  onKindChange: (kind: MessageKind) => void;
  onToChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onDeliveryModeChange: (mode: DeliveryMode) => void;
  onOpenAtChange: (value: string) => void;
  onCapsuleEventChange: (value: string) => void;
  onLocationNameChange: (value: string) => void;
  onArrivedLocationChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (id: string) => void;
  getMessageStatus: (message: LetterMessage) => string;
};

export default function LettersTab(props: LettersTabProps) {
  const {
    messageKind, composeOpen, messageTo, messageTitle, messageBody, deliveryMode,
    openAt, capsuleEventId, locationName, arrivedLocation, events, lockedCapsules,
    openMessages, userBName, photoPicker, onKindChange, onToChange, onTitleChange,
    onBodyChange, onDeliveryModeChange, onOpenAtChange, onCapsuleEventChange,
    onLocationNameChange, onArrivedLocationChange, onSubmit, onRemove, getMessageStatus,
  } = props;

  return (
    <section className="letters-view" aria-label="悄悄话和时光胶囊">
      <div className="message-tabs">
        <button type="button" className={messageKind === 'whisper' ? 'active' : ''} onClick={() => onKindChange('whisper')}>
          💌 悄悄话
        </button>
        <button type="button" className={messageKind === 'capsule' ? 'active' : ''} onClick={() => onKindChange('capsule')}>
          ⏳ 时光胶囊
        </button>
      </div>

      {composeOpen && (
        <form className="message-composer" onSubmit={onSubmit}>
          <label>
            收给谁
            <input value={messageTo} onChange={(event) => onToChange(event.target.value)} placeholder={`${userBName} / 未来的我们`} />
          </label>
          <label>
            标题
            <input value={messageTitle} onChange={(event) => onTitleChange(event.target.value)} placeholder="例如：见面那天再看" />
          </label>
          <label>
            内容
            <textarea value={messageBody} onChange={(event) => onBodyChange(event.target.value)} placeholder="写一封小纸条给 TA 吧" />
          </label>
          {photoPicker}

          {messageKind === 'capsule' && (
            <div className="delivery-grid">
              {([
                ['anniversary', '纪念日'],
                ['meeting', '下次见面'],
                ['location', '到达地点'],
                ['scheduled', '指定时间'],
              ] as [DeliveryMode, string][]).map(([mode, label]) => (
                <button key={mode} type="button" className={deliveryMode === mode ? 'active' : ''} onClick={() => onDeliveryModeChange(mode)}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {messageKind === 'capsule' && deliveryMode === 'scheduled' && (
            <label>
              开启时间
              <input type="datetime-local" value={openAt} onChange={(event) => onOpenAtChange(event.target.value)} />
            </label>
          )}

          {messageKind === 'capsule' && deliveryMode === 'anniversary' && (
            <label>
              到哪个纪念日打开
              <select value={capsuleEventId} onChange={(event) => onCapsuleEventChange(event.target.value)}>
                {events.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}
              </select>
            </label>
          )}

          {messageKind === 'capsule' && deliveryMode === 'location' && (
            <label>
              地点暗号
              <input value={locationName} onChange={(event) => onLocationNameChange(event.target.value)} placeholder="例如：上海虹桥站" />
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
          <input value={arrivedLocation} onChange={(event) => onArrivedLocationChange(event.target.value)} placeholder="下次见面 / 上海虹桥站" />
        </section>
      )}

      {messageKind === 'capsule' && (
        <section className="mail-section waiting-section">
          <h2>等待开启</h2>
          {lockedCapsules.length === 0 ? (
            <article className="empty-mail-card">
              <span>♥</span><strong>暂时没有待开启的胶囊</strong><p>把一句话封存到未来吧</p>
            </article>
          ) : lockedCapsules.map((message) => (
            <article className="letter-card unread" key={message.id}>
              <div className="letter-meta">
                <span>未</span><strong>{message.to} 收</strong><time>{getMessageStatus(message)}</time>
              </div>
              <h3>{message.title}</h3><p>还没到约定的打开时刻。</p>
            </article>
          ))}
        </section>
      )}

      <section className="mail-section read-section">
        <h2>{messageKind === 'whisper' ? '共同信箱' : '已开启胶囊'}</h2>
        <div className="letter-list">
          {openMessages.length === 0 && (
            <article className="empty-mail-card">
              <span>♥</span>
              <strong>{messageKind === 'whisper' ? '还没有悄悄话' : '还没有已开启的胶囊'}</strong>
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
                    <img loading="lazy" decoding="async" src={optimizedPhotoUrl(photo.url, 360, 260)} alt={photo.name || message.title} key={photo.id} />
                  ))}
                </div>
              ) : message.kind === 'whisper' && message.body.length > 8 && <div className="letter-photo" aria-hidden="true" />}
              <button type="button" aria-label={`删除 ${message.title}`} onClick={() => onRemove(message.id)}>删除</button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
