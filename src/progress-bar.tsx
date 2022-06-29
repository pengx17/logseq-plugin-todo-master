import React from "react";
import { getTextLabelSize } from "./get-text-label";

function renderBar(num: number, marker: string) {
  return (
    <div
      style={{ flexGrow: num }}
      className={`todo-master-progress-bar__bar-${marker} todo-master-progress-bar__bar`}
    >
      <div className="todo-master-progress-bar__bar-inner-text">
        {marker}:{num}
      </div>
    </div>
  );
}

export type Mode = "page" | "block" | "query" | "q";

export function ProgressBar({
  status,
  mode,
}: {
  status?: {
    later: number;
    now: number;
    done: number;
  };
  mode?: Mode;
}) {
  if (!status) {
    return (
      <div className="todo-master-progress-bar">
        <div className="todo-master-progress-bar__target-not-found">
          Tracking target not found.
        </div>
      </div>
    );
  }
  const { done, now, later } = status;
  const total = done + now + later;
  const percentage = total === 0 ? `0` : ((done / total) * 100).toFixed(0);
  const shortText = `${percentage}%`;
  const fullText = `${mode}:${done}/${total}`;
  const [width] = getTextLabelSize(fullText);
  return (
    <div className="todo-master-progress-bar">
      <div className="todo-master-progress-bar__bars">
        {renderBar(done, "done")}
        {renderBar(now, "now")}
        {renderBar(later, "later")}
      </div>
      <div className="todo-master-progress-bar__label" style={{ width }}>
        <div className="todo-master-progress-bar__percentage-label">
          {shortText}
        </div>
        <div className="todo-master-progress-bar__fraction-label">
          {fullText}
        </div>
      </div>
    </div>
  );
}
