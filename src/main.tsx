import "@logseq/libs";
import { registerCommand } from "./register-command";

function main() {
  const pluginId = logseq.baseInfo.id;
  console.info(`#${pluginId}: MAIN`);
  registerCommand();
  console.info(`#${pluginId}: MAIN DONE`);
  logseq.showMainUI({ autoFocus: false });
  logseq.setMainUIInlineStyle({
    top: "-500px",
    left: "0px",
    width: "200px",
    height: "200px",
  });
}

logseq.ready(main).catch(console.error);
