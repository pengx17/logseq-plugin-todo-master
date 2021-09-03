import "@logseq/libs";
import "virtual:windi.css";

import "./reset.css";

import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import { logseq as PL } from "../package.json";
import { isInlineMode } from "./utils";
import { registerCommand } from "./register-command";

const magicKey = `__${PL.id}__loaded__`;

if (isInlineMode()) {
  // The iframe loaded without normal logseq plugin routine will not have
  // access to logseq API, like logseq.App, loqseq.DB etc.
  // we fallback to the magicKey which is bridged in the top context to pass the handlers
  // around
  // @ts-expect-error hacky
  window._logseq = top[magicKey];
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById("app")
  );
} else {
  function main() {
    const pluginId = logseq.baseInfo.id;
    logseq.hideMainUI();
    console.info(`#${pluginId}: MAIN`);
    registerCommand();
    // @ts-expect-error
    top[magicKey] = logseq;
    console.info(`#${pluginId}: MAIN DONE`);
  }
  // @ts-expect-error
  if (top[magicKey]) {
    // @ts-expect-error
    top.location.reload();
  }

  logseq.ready(main).catch(console.error);
}
