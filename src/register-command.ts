export function registerCommand() {
  logseq.Editor.registerSlashCommand(
    "[TODO Master] Add Progress Bar",
    async () => {
      const block = await logseq.Editor.getCurrentBlock();
      if (block?.uuid) {
        const newContent = ` <iframe src='${logseq.baseInfo.entry}' data-block-uuid='${block.uuid}' style="display: inline-block; height: 1rem; width: 200px"></iframe> `;
        logseq.Editor.insertAtEditingCursor(newContent);
      }
    }
  );
}
