'use client';

/* eslint-disable @next/next/no-img-element -- Blob photos are already compressed and served by Netlify Functions. */

type TimelinePhoto = {
  id: string;
  url: string;
};

export type TimelineItem = {
  id: string;
  title: string;
  category: string;
  emoji: string;
  originalDate: Date;
  daysPassed: number;
  imageClass: string;
  photos?: TimelinePhoto[];
};

type TimelineGroup = {
  month: string;
  items: TimelineItem[];
};

type TimelineTabProps = {
  groups: TimelineGroup[];
  oldestFirst: boolean;
  selectedId: string;
  onToggleOrder: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

function formatFullChineseDate(value: Date) {
  return `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日`;
}

export default function TimelineTab({
  groups,
  oldestFirst,
  selectedId,
  onToggleOrder,
  onSelect,
  onRemove,
}: TimelineTabProps) {
  return (
    <section className="timeline-view" aria-label="时间轴">
      <button className="sort-chip" type="button" onClick={onToggleOrder}>
        {oldestFirst ? '最早在前' : '最新在前'}
      </button>

      <div className="timeline-rail">
        {groups.map((group) => (
          <section className="month-group" key={group.month}>
            <div className="month-chip">
              <span>▣</span>
              {group.month}
            </div>
            {group.items.map((event) => (
              <article
                className={event.id === selectedId ? 'timeline-memory selected' : 'timeline-memory'}
                key={event.id}
                onClick={() => onSelect(event.id)}
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
                    <img loading="lazy" decoding="async" src={event.photos[0].url} alt={event.title} />
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
                      onRemove(event.id);
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
  );
}
