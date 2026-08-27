import { applyMood } from "../store";
import { MOODS, type Mood } from "../types";

export function MoodStrip() {
  return (
    <div className="moods">
      {MOODS.map((mood: Mood) => (
        <button
          key={mood}
          type="button"
          className="mood-btn"
          onClick={() => applyMood(mood, "human")}
        >
          {mood}
        </button>
      ))}
    </div>
  );
}
