import React from "react";
export { default as style } from "./style.css";

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

export function ProgressBar({
  status,
}: {
  status: {
    later: number;
    now: number;
    done: number;
  } | null;
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
  const percentage = total === 0 ? `0` : ((done / total) * 100).toFixed(2);
  return (
    <div className="todo-master-progress-bar">
      <div className="todo-master-progress-bar__bars">
        {renderBar(done, "done")}
        {renderBar(now, "now")}
        {renderBar(later, "later")}
      </div>
      <div className="todo-master-progress-bar__label">
        <div className="todo-master-progress-bar__percentage-label">
          {percentage}%
        </div>
        <div className="todo-master-progress-bar__fraction-label">{`${done}/${total}`}</div>
      </div>
    </div>
  );
}
