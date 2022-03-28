import React from "react";
import { encode, decode } from "js-base64";
import ReactDOMServer from "react-dom/server";
import { ProgressBar } from "./progress-bar";
import style from "./style.tcss?raw";

const macroPrefix = ":todomaster";

const allMarkers = [
  "done",
  "now",
  "later",
  "doing", // maps to now
  "todo", // maps to later
] as const;

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
  const result = await getBlockMarkers(maybeUUID);
  return result
    ? { mapping: reduceToMap(result.markers), mode: result.mode }
    : null;
}

function checkIsUUid(maybeUUID: string) {
  return maybeUUID.length === 36 && maybeUUID.includes("-");
}

async function getBlockMarkers(
  maybeUUID: string
): Promise<{ markers: Marker[]; mode: "page" | "block" } | null> {
  let tree: any;
  let pageMode = false;
  if (checkIsUUid(maybeUUID)) {
    tree = await logseq.Editor.getBlock(maybeUUID, { includeChildren: true });

    // If this is the root node and have no children
    if (
      tree &&
      tree.children &&
      tree.children.length === 0 &&
      tree.parent?.id &&
      tree.parent?.id === tree.page?.id
    ) {
      maybeUUID = tree.page?.originalName;
      tree = null;
    }
  }

  if (!tree) {
    tree = { children: await logseq.Editor.getPageBlocksTree(maybeUUID) };
    pageMode = true;
  }

  if (!tree || !tree.children) {
    return null; // Block/page not found
  }

  const res: any[] = [];
  function traverse(tree: any) {
    if (tree.children) {
      for (const child of tree.children) {
        traverse(child);
      }
    }

    if (tree.uuid && tree.marker && tree.uuid !== maybeUUID) {
      res.push(tree.marker.toLowerCase());
    }
  }
  traverse(tree);
  return {
    markers: res,
    mode: pageMode ? "page" : "block",
  };
}
const pluginId = "todomaster";
const slotElId = (slot: string) => `${pluginId}-${slot}-${logseq.baseInfo.id}`;

function slotExists(slot: string) {
  return Promise.resolve(logseq.App.queryElementById(slotElId(slot)));
}

// slot -> rendering state
const rendering = new Map<string, { maybeUUID: string; template: string }>();

async function render(maybeUUID: string, slot: string, counter: number) {
  try {
    if (rendering.get(slot)?.maybeUUID !== maybeUUID) {
      return;
    }
    const status = await getTODOStats(maybeUUID);
    if (rendering.get(slot)?.maybeUUID !== maybeUUID) {
      return;
    }
    const template = ReactDOMServer.renderToStaticMarkup(
      <ProgressBar status={status?.mapping} mode={status?.mode} />
    );

    // See https://github.com/logseq/logseq-plugin-samples/blob/master/logseq-pomodoro-timer/index.ts#L92
    if (counter === 0 || (await slotExists(slot))) {
      // No need to rerender if template is the same
      if (rendering.get(slot)?.template === template) {
        return true;
      }
      rendering.get(slot)!.template = template;
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
  rendering.set(slot, { maybeUUID, template: "" });
  let counter = 0;

  while (await render(maybeUUID, slot, counter++)) {
    // sleep for 3000ms
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (!(await slotExists(slot))) {
      rendering.delete(slot);
      break;
    }
  }
}

export function registerCommand() {
  logseq.provideStyle(style);

  logseq.App.onMacroRendererSlotted(async ({ payload, slot }) => {
    const [type] = payload.arguments;
    if (!type?.startsWith(macroPrefix)) {
      return;
    }

    logseq.provideStyle({
      key: slot,
      style: `#${slot} {display: inline-flex;}`,
    });

    let maybeUUID = null;
    // Implicitly use the current block
    if (type === macroPrefix) {
      maybeUUID = payload.uuid;
    } else {
      maybeUUID = decode(type.substring(macroPrefix.length + 1));
    }
    if (maybeUUID) {
      startRendering(maybeUUID, slot);
    }
  });

  async function insertMacro(mode: "page" | "block") {
    const block = await logseq.Editor.getCurrentBlock();
    if (block && block.uuid) {
      let content = "";
      let maybeUUID = "";
      if (mode === "block") {
        // We will from now on always use implicit block IDs to get rid of "Tracking target not found" issue
        // maybeUUID = block.uuid;
      } else {
        const page = await logseq.Editor.getPage(block.page.id);
        if (page?.originalName) {
          maybeUUID = page.originalName;
        }
      }
      if (maybeUUID) {
        // Use base64 to avoid incorrectly rendering in properties
        content = `{{renderer ${macroPrefix}-${encode(maybeUUID)}}}`;
      } else {
        content = `{{renderer ${macroPrefix}}}`;
      }
      await logseq.Editor.insertAtEditingCursor(content);
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
