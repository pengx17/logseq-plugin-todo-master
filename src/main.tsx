import "@logseq/libs";
import { logseq as PL } from "../package.json";
import { registerCommand } from "./register-command";

const magicKey = `__${PL.id}__loaded__`;

function main() {
  const pluginId = logseq.baseInfo.id;
  logseq.hideMainUI();
  console.info(`#${pluginId}: MAIN`);
  registerCommand();
  // @ts-expect-error
  top[magicKey] = logseq;
  console.info(`#${pluginId}: MAIN DONE`);
}

logseq.ready(main).catch(console.error);
