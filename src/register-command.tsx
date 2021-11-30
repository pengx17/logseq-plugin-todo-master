import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ProgressBar } from "./progress-bar";

const macroPrefix = ":todomaster";

const allMarkers = [
  "done",
  "now",
  "later",
  "doing", // maps to now
  "todo", // maps to later
] as const;

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

type Marker = typeof allMarkers[number];

const reduceToMap = (vals?: Marker[]) => {
  function unify(m: Marker): Exclude<Marker, "doing" | "todo"> {
    if (m === "todo") {
      return "later";
    }
    if (m === "doing") {
      return "now";
    }
    return m;
  }
  return (vals ?? []).reduce(
    (acc, val) => {
      const k = unify(val);
      acc[k] = acc[k] + 1;
      return acc;
    },
    {
      done: 0,
      later: 0,
      now: 0,
    }
  );
};

async function getTODOStats(maybeUUID: string) {
  const markers = await getBlockMarkers(maybeUUID);
  return reduceToMap(markers);
}

function checkIsUUid(maybeUUID: string) {
  return maybeUUID.length === 36 && maybeUUID.includes("-");
}

async function getBlockMarkers(maybeUUID: string): Promise<Marker[]> {
  let tree: any;
  if (checkIsUUid(maybeUUID)) {
    tree = await logseq.Editor.getBlock(maybeUUID, { includeChildren: true });
  } else {
    tree = { children: await logseq.Editor.getPageBlocksTree(maybeUUID) };
  }

  if (!tree) {
    return [];
  }

  const res: any[] = [];
  function traverse(tree: any) {
    if (tree.children) {
      for (const child of tree.children) {
        traverse(child);
      }
    }
    if (tree.uuid && tree.marker) {
      res.push(tree.marker.toLowerCase());
    }
  }
  traverse(tree);
  return res;
}

async function render(maybeUUID: string, slot: string, counter: number) {
  try {
    if (rendering.get(slot) !== maybeUUID) {
      return;
    }
    const status = await getTODOStats(maybeUUID);
    if (rendering.get(slot) !== maybeUUID) {
      return;
    }
    const template = ReactDOMServer.renderToStaticMarkup(
      <ProgressBar {...status} />
    );

    // See https://github.com/logseq/logseq-plugin-samples/blob/master/logseq-pomodoro-timer/index.ts#L92
    const pluginId = "todomaster";
    const keepKey = `${pluginId}-${slot}-${logseq.baseInfo.id}`;

    if (counter === 0 || (await logseq.App.queryElementById(keepKey))) {
      logseq.provideUI({
        key: pluginId,
        slot,
        reset: true,
        template: template,
      });
      return true;
    }
  } catch (err: any) {
    console.error(err);
    // skip invalid
  }
}

async function startRendering(maybeUUID: string, slot: string) {
  rendering.set(slot, maybeUUID);
  let counter = 0;

  while (await render(maybeUUID, slot, counter++)) {
    // sleep for 3000ms
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

const rendering = new Map<string, string>();

export function registerCommand() {
  logseq.provideStyle(css`
    .todo-master-progress-bar {
      max-width: 100%;
      width: 300px;
      height: 1rem;
      cursor: default;
      font-family: monospace;
      display: inline-flex;
    }

    .todo-master-progress-bar__bars {
      display: flex;
      flex: 1;
      overflow: hidden;
      align-items: stretch;
      margin-right: 0.5em;
      border-radius: 4px;
      border: 1px solid #eaeaea;
    }

    .todo-master-progress-bar__bar {
      transition: all 0.2s;
      position: relative;
    }

    .todo-master-progress-bar__bar-inner-text {
      position: absolute;
      margin-left: 0.25em;
      display: none;
      white-space: nowrap;
    }

    .todo-master-progress-bar__bar:hover
      .todo-master-progress-bar__bar-inner-text {
      display: block;
    }

    .todo-master-progress-bar__bar-done {
      background-color: var(--ph-highlight-color-green);
    }
    .todo-master-progress-bar__bar-now {
      background-color: var(--ph-highlight-color-blue);
    }
    .todo-master-progress-bar__bar-later {
      background-color: transparent;
    }

    .todo-master-progress-bar__label {
      white-space: nowrap;
    }
  `);

  logseq.App.onMacroRendererSlotted(async ({ payload, slot }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(macroPrefix)) {
      return;
    }

    const maybeUUID = atob(type.substring(macroPrefix.length + 1));
    startRendering(maybeUUID, slot);
  });

  async function insertMacro(mode: "page" | "block") {
    const block = await logseq.Editor.getCurrentBlock();
    if (block && block.uuid) {
      let content = "";
      let maybeUUID = "";
      if (mode === "block") {
        maybeUUID = block.uuid;
      } else {
        const page = await logseq.Editor.getPage(block.page.id);
        if (page?.originalName) {
          maybeUUID = page.originalName;
        }
      }
      if (maybeUUID) {
        content = `{{renderer ${macroPrefix}-${btoa(maybeUUID)}}}`;
        await logseq.Editor.insertAtEditingCursor(content);
      }
    }
  }

  logseq.Editor.registerSlashCommand(
    "[TODO Master] Add Progress Bar for children blocks",
    async () => {
      return insertMacro("block");
    }
  );

  logseq.Editor.registerSlashCommand(
    "[TODO Master] Add Progress Bar for current page",
    async () => {
      return insertMacro("page");
    }
  );
}
