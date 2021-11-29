import React from "react";

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
  later,
  now,
  done,
}: {
  later: number;
  now: number;
  done: number;
}) {
  const total = done + now + later;
  return (
    <div className="todo-master-progress-bar">
      <div className="todo-master-progress-bar__bars">
        {renderBar(done, "done")}
        {renderBar(now, "now")}
        {renderBar(later, "later")}
      </div>
      <div className="todo-master-progress-bar__label">{`${done}/${total}`}</div>
    </div>
  );
}
