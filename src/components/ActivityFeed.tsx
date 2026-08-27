import type { ActivityEvent } from "../types";

type Props = { events: ActivityEvent[] };

function fmt(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  });
}

export function ActivityFeed({ events }: Props) {
  return (
    <div className="feed" aria-live="polite">
      {events.length === 0 ? (
        <p className="help">No events yet.</p>
      ) : (
        events.map((e) => (
          <div key={e.id} className={`event ${e.actor}`}>
            <span className="who">{e.actor}</span>
            <div>
              <div className="msg">{e.message}</div>
              <time dateTime={new Date(e.ts).toISOString()}>{fmt(e.ts)} ET</time>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
