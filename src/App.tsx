import React from "react";
import { useThemeMode, useDebounceValue } from "./utils";

import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
declare global {
  var _logseq: typeof logseq;
}

function getIframe() {
  return window.frameElement as HTMLElement | null;
}

function getCurrentBlockElement(p = getIframe()) {
  return p?.closest("[blockid]") as HTMLElement | null;
}

function useAdaptMainUIStyle(ref: any) {
  React.useEffect(() => {
    logseq.showMainUI(); // always on
    const listener = () => {
      const style: Partial<CSSStyleDeclaration> = {
        userSelect: "none",
        height: "1em",
        margin: "0",
      };
      const iframe = getIframe();
      if (iframe) {
        Object.entries(style).forEach(([key, val]) => {
          // @ts-expect-error ?
          iframe.style[key] = val;
        });
      }
    };
    listener();
  }, [ref]);
}

const iframeBlock = getCurrentBlockElement();
const watchingBlock = getCurrentBlockElement(iframeBlock?.parentElement);

function useWatchCurrentBlockChange() {
  const [changeCounter, setChangeCounter] = React.useState(0);
  const slowCounter = useDebounceValue(changeCounter, 500);
  React.useEffect(() => {
    if (watchingBlock) {
      const mo = new MutationObserver(() => {
        setChangeCounter((c) => c + 1);
      });
      mo.observe(watchingBlock, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      return () => mo.disconnect();
    }
  }, []);

  const res = React.useMemo(() => {
    return {
      uuid:
        // if the containing block does not has blockid, we then find the ID in the iframe attr map
        iframeBlock?.getAttribute("blockid") ??
        getIframe()?.getAttribute("data-block-uuid") ??
        null,
      counter: slowCounter,
    };
  }, [slowCounter]);

  return res;
}

// No block tree API yet. We get the page tree first and then find the block node.
async function getBlockTree(uuid: string) {
  const a = await _logseq.Editor.getBlock(uuid);
  if (a) {
    const page = await _logseq.Editor.getPage(a.page.id);
    if (page) {
      const pageTreeArr = await _logseq.Editor.getPageBlocksTree(
        page.originalName
      );
      // Find the block
      function traverseAndFind(tree: BlockEntity): BlockEntity | null {
        if (tree.uuid === uuid) {
          return tree;
        }
        if (tree.children) {
          for (const child of tree.children) {
            const res = traverseAndFind(child as BlockEntity);
            if (res) {
              return res;
            }
          }
        }
        return null;
      }
      return traverseAndFind({
        children: pageTreeArr,
        uuid: " ",
      } as BlockEntity);
    }
  }
}

const allMarkers = [
  "done",
  "now",
  "later",
  "doing", // maps to now
  "todo", // maps to later
] as const;

type Marker = typeof allMarkers[number];

function getTreeMarkers(roo: BlockEntity): Marker[] {
  const res: any = [];
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
  traverse(roo);
  return res;
}

// We cannot simply use querySelector to find the TODOs, because
// the todo may not yet rendered for various reasons.
function useGetTODOStats(meta: { uuid: string | null }) {
  function unify(m: Marker): Exclude<Marker, "doing" | "todo"> {
    if (m === "todo") {
      return "later";
    }
    if (m === "doing") {
      return "now";
    }
    return m;
  }
  const reduceToMap = (vals?: Marker[]) => {
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
  const [stats, setStats] = React.useState<Marker[]>([]);
  React.useEffect(() => {
    if (meta?.uuid) {
      getBlockTree(meta.uuid).then((tree) => {
        if (tree) {
          const markers = getTreeMarkers(tree);
          setStats(markers);
        }
      });
    }
  }, [meta]);
  return reduceToMap(stats);
}

function App() {
  const themeMode = useThemeMode();
  const value = useWatchCurrentBlockChange();
  useAdaptMainUIStyle(value);
  const markers = useGetTODOStats(value);
  const done = markers.done;
  const now = markers.now;
  const later = markers.later;

  return (
    <main
      style={{ width: "100vw", height: "100vh" }}
      className={`${themeMode}`}
    >
      <div className="dark:text-light-200 light:text-dark-200 flex w-full h-full items-center overflow-hidden">
        <div className="flex rounded border w-full h-full items-stretch">
          <div
            style={{ flexGrow: done }}
            className="bg-green-400 transition-all"
          />
          <div
            style={{ flexGrow: now }}
            className="bg-blue-400 transition-all"
          />
          <div
            style={{ flexGrow: later }}
            className="bg-transparent transition-all"
          />
        </div>
        <div className="text-sm font-serif ml-2">{`${done}/${
          done + now + later
        }`}</div>
      </div>
    </main>
  );
}

export default App;
