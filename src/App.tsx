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
        width: "600px",
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

const iframe = getCurrentBlockElement();
const watchingBlock = getCurrentBlockElement(iframe?.parentElement);

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
      uuid: watchingBlock?.getAttribute("blockid") ?? null,
      counter: slowCounter,
    };
  }, [slowCounter]);

  return res;
}

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

function getTreeMarkers(roo: BlockEntity) {
  const res: any = [];
  function traverse(tree: BlockEntity) {
    if (tree.children) {
      for (const child of tree.children) {
        traverse(child as BlockEntity);
      }
    }
    if (tree.uuid && tree.marker) {
      res.push(tree.marker);
    }
  }
  traverse(roo);
  return res;
}

function useGetTODOStats(meta: { uuid: string | null }) {
  const [stats, setStats] = React.useState<any>(undefined);
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
  return stats;
}

const toSet = (vals?: string[]) => {
  return (vals ?? []).reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

function App() {
  const themeMode = useThemeMode();
  const value = useWatchCurrentBlockChange();
  useAdaptMainUIStyle(value);
  const markers = toSet(useGetTODOStats(value));
  const done = markers["DONE"] ?? 0;
  const now = markers["NOW"] ?? 0;
  const later = markers["LATER"] ?? 0;

  return (
    <main
      style={{ width: "100vw", height: "100vh" }}
      className={`${themeMode}`}
    >
      <div className="dark:text-light-200 flex h-full items-center">
        <div className="w-48 flex rounded border h-full items-stretch">
          <div style={{ flexGrow: done }} className="bg-green-400 " />
          <div style={{ flexGrow: now }} className="bg-blue-400" />
          <div style={{ flexGrow: later }} className="bg-transparent" />
        </div>
        <div className="text-sm font-serif ml-2">{`${done}/${
          done + now + later
        }`}</div>
      </div>
    </main>
  );
}

export default App;
