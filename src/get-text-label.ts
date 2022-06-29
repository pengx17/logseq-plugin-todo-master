// eslint-disable-next-line @typescript-eslint/no-explicit-any
let melm: HTMLElement | undefined;

function getMeasurementDiv() {
  // A div used for measurement
  document.getElementById("__textLabelMeasure")?.remove();

  const pre = document.createElement("pre");
  pre.id = "__textLabelMeasure";

  Object.assign(pre.style, {
    whiteSpace: "pre",
    fontWeight: 600,
    width: "auto",
    border: "1px solid transparent",
    padding: "4px",
    margin: "0px",
    opacity: "0",
    position: "absolute",
    top: "-500px",
    left: "0px",
    zIndex: "9999",
    pointerEvents: "none",
    userSelect: "none",
    alignmentBaseline: "mathematical",
    dominantBaseline: "mathematical",
  });

  pre.tabIndex = -1;

  document.body.appendChild(pre);
  return pre;
}

if (typeof window !== "undefined") {
  melm = getMeasurementDiv();
}

let prevText = "";
let prevSize = [0, 0];

export function clearPrevSize() {
  prevText = "";
}

export function getTextLabelSize(text: string) {
  if (!text) {
    return [16, 32];
  }

  if (!melm) {
    // We're in SSR
    return [10, 10];
  }

  if (!melm.isConnected) document.body.appendChild(melm);

  if (text === prevText) {
    return prevSize;
  }

  prevText = text;

  melm.textContent = text;
  melm.style.fontFamily = "monospace";

  // In tests, offsetWidth and offsetHeight will be 0
  const width = melm.offsetWidth || 1;
  const height = melm.offsetHeight || 1;

  prevSize = [width, height];
  return prevSize;
}
