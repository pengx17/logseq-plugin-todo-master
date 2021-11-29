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

async function getTODOStats(uuid: string) {
  const markers = await getBlockMarkers(uuid);
  return reduceToMap(markers);
}

async function getBlockMarkers(uuid: string): Promise<Marker[]> {
  const block = await logseq.Editor.getBlock(uuid, { includeChildren: true });

  if (!block) {
    return [];
  }

  const res: any[] = [];
  function traverse(tree: BlockEntity) {
    if (tree.children) {
      for (const child of tree.children) {
        traverse(child as BlockEntity);
      }
    }
    if (tree.uuid && tree.marker) {
      res.push(tree.marker.toLowerCase());
    }
  }
  traverse(block);
  return res;
}

async function render(uuid: string, slot: string) {
  try {
    const status = await getTODOStats(uuid);
    const template = ReactDOMServer.renderToStaticMarkup(
      <ProgressBar {...status} />
    );

    logseq.provideUI({
      key: "js-playground",
      slot,
      reset: true,
      template: template,
    });
  } catch (err: any) {
    console.error(err);
    // skip invalid
  }
}

export function registerCommand() {
  logseq.provideStyle(css`
    .todo-master-progress-bar {
      max-width: 100%;
      width: 300px;
      cursor: default;
      font-family: monospace;
      display: inline-flex;
    }

    .todo-master-progress-bar__bars {
      display: flex;
      flex: 1;
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
    const uuid = payload.uuid;
    const [type] = payload.arguments;
    if (!type?.startsWith(macroPrefix)) {
      return;
    }
    render(uuid, slot);
  });

  logseq.Editor.registerSlashCommand(
    "[TODO Master] Add Progress Bar",
    async () => {
      const newContent = `{{renderer ${macroPrefix}}}`;
      const block = await logseq.Editor.getCurrentBlock();
      if (block) {
        await logseq.Editor.insertAtEditingCursor(newContent);
      }
    }
  );
}
