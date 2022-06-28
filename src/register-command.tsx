import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import { parseEDNString, toEDNString } from "edn-data";
import { decode, encode } from "js-base64";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { filter } from "rxjs";

import { change$ } from "./observables";
import { Mode, ProgressBar } from "./progress-bar";
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

// Get the body from the following ...
// #+BEGIN_QUERY
// {:title "{{renderer :todomaster}}"
//  :query [:find (pull ?b [*])
//                  :where
//                 [?b :block/marker _]]}
// #+END_QUERY
function getQueryFromContent(_content: string) {
  try {
    let content = _content.trim();
    const startToken = "#+BEGIN_QUERY";
    const endToken = "#+END_QUERY";

    const startIndex = content.indexOf(startToken);
    const endIndex = content.indexOf(endToken);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    content = content.substring(startIndex + startToken.length, endIndex);
    const contentEDN = (parseEDNString(content) as any).map;
    const query = toEDNString(
      contentEDN.find((r: any) => r[0].key === "query")?.[1]
    );
    // TODO: Logseq inputs can contain magic strings, like :today etc
    // TODO: Need to transform them before passing to DataScript.
    // ref: https://github.com/logseq/logseq/blob/130728adcd7acd4250a78a4e34b1c2d69c0ca3e1/src/main/frontend/db/query_react.cljs#L17-L49
    const inputs: string[] = contentEDN
      .find((r: any) => r[0].key === "inputs")?.[1]
      ?.map(toEDNString);
    return { query, inputs };
  } catch (err) {
    // ignore error
  }
  return null;
}

// Get a simple query from the content
function getSimpleQueryFromContent(_content: string) {
  return _content.trim().match(/{{query\s+(.*)\s*}}/)?.[1];
}

// By default, if UUID is valid, get the block children nodes
// If UUID is not valid and it is rendered in a query block, get the query and render the result
// If the current node is
async function getBlockTreeAndMode(maybeUUID: string) {
  let tree: Partial<BlockEntity> | null = null;
  let mode: Mode | null = null;

  if (checkIsUUid(maybeUUID)) {
    tree = await logseq.Editor.getBlock(maybeUUID, { includeChildren: true });
  }

  if (tree?.content) {
    const queryAndInputs = getQueryFromContent(tree?.content);
    const simpleQuery = getSimpleQueryFromContent(tree?.content);
    if (queryAndInputs) {
      const result = (
        await logseq.DB.datascriptQuery(
          queryAndInputs.query,
          ...(queryAndInputs.inputs ?? [])
        )
      )?.flat();
      mode = "query";
      tree = { children: result };
    } else if (simpleQuery) {
      const result = (await logseq.DB.q(simpleQuery))?.flat();
      mode = "q";
      tree = { children: result };
    }
  }

  if (
    !mode &&
    // If this is the root node and have no children
    tree &&
    tree.children &&
    tree.children.length === 0 &&
    tree.parent?.id &&
    tree.parent?.id === tree.page?.id
  ) {
    const maybePageName = tree?.page?.originalName ?? maybeUUID;

    mode = "page";
    tree = { children: await logseq.Editor.getPageBlocksTree(maybePageName) };
  }

  if (!tree || !tree.children) {
    return null; // Block/page not found
  }

  mode = mode || "block";

  return { tree, mode };
}

function getContentRefIds(content: string): any[] {

  const refIds: any = []

  const results = [...content.matchAll(/\(\(([a-zA-Z0-9-]*)\)\)/g)]

  results.forEach(res => refIds.push(res[1]))

  return refIds
}

function blockHasMarker(block: any, maybeUUID: string): boolean {
  return block.uuid && block.marker && block.uuid !== maybeUUID
}

async function getBlockMarkers(
  maybeUUID: string
): Promise<{ markers: Marker[]; mode: Mode } | null> {
  async function traverse(tree: any, res: any[]): Promise<any[]> {
    if (tree.children) {
      for (const child of tree.children) {
        await traverse(child, res);
      }
    }

    const refIds = getContentRefIds(tree.content)
    for (const refId of refIds) {
      const block = await logseq.Editor.getBlock(refId)
      if (block && blockHasMarker(block, maybeUUID)) {
        res.push(block.marker.toLowerCase());
      }
    }

    if (blockHasMarker(tree, maybeUUID)) {
      res.push(tree.marker.toLowerCase());
    }

    return res
  }

  const maybeTreeAndMode = await getBlockTreeAndMode(maybeUUID);

  if (maybeTreeAndMode) {
    const res = await traverse(maybeTreeAndMode.tree, []);
    return {
      markers: res,
      mode: maybeTreeAndMode.mode,
    };
  }

  return null;
}
const pluginId = "todomaster";

const delay = (t: number) =>
  new Promise((res) => {
    setTimeout(res, t);
  });

function slotExists(slot: string) {
  return Promise.race([
    Promise.resolve(logseq.App.queryElementById(slot)),
    delay(1000).then(() => false),
  ]);
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
        key: pluginId + "__" + slot,
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

  const unsub = change$.subscribe(async (e) => {
    await render(maybeUUID, slot, counter++);
    const exist = await slotExists(slot);
    if (!exist) {
      rendering.delete(slot);
      if (!unsub.closed) {
        unsub.unsubscribe();
      }
    }
  });
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

  async function insertMacro(mode: "page" | "block" = "block") {
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
    "[TODO Master] Add Progress Bar",
    async () => {
      return insertMacro();
    }
  );
}
