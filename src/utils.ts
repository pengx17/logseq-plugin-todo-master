import React, { useState } from "react";
import { useDebounce, useMountedState } from "react-use";

export const useAppVisible = () => {
  const [visible, setVisible] = useState(logseq.isMainUIVisible);
  const isMounted = useMountedState();
  React.useEffect(() => {
    const eventName = "ui:visible:changed";
    const handler = async ({ visible }: any) => {
      if (isMounted()) {
        setVisible(visible);
      }
    };
    logseq.on(eventName, handler);
    return () => {
      logseq.off(eventName, handler);
    };
  }, []);
  return visible;
};

export const useSidebarVisible = () => {
  const [visible, setVisible] = useState(false);
  const isMounted = useMountedState();
  React.useEffect(() => {
    logseq.App.onSidebarVisibleChanged(({ visible }) => {
      if (isMounted()) {
        setVisible(visible);
      }
    });
  }, []);
  return visible;
};

export const useThemeMode = (logseq: typeof window.logseq) => {
  const isMounted = useMountedState();
  const [mode, setMode] = React.useState<"dark" | "light">("light");
  React.useEffect(() => {
    setMode(
      (top!.document
        .querySelector("html")
        ?.getAttribute("data-theme") as typeof mode) ??
        (matchMedia("prefers-color-scheme: dark").matches ? "dark" : "light")
    );
    return logseq.App.onThemeModeChanged((s) => {
      if (isMounted()) {
        setMode(s.mode);
      }
    });
  }, [isMounted]);

  return mode;
};

export const isInlineMode = () => {
  return !window.frameElement?.className.includes("lsp-iframe-sandbox");
};

export function useDebounceValue<T>(v: T, timeout: number = 50) {
  const [state, setState] = React.useState(v);
  useDebounce(
    () => {
      setState(v);
    },
    timeout,
    [v]
  );
  return state;
}