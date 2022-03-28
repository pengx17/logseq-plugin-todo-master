# Logseq Plugin TODO Master

A simple plugin to render a progress bar to gather the overall progress of the current block or page.

https://user-images.githubusercontent.com/584378/143900107-75c9b32e-d808-4454-9268-2c675682ac75.mp4


## Usage
### Commands
- Use slash command `[TODO Master] Add Progress Bar for children blocks` to add a progress bar to the parent (aka the master) block.
- Use slash command `[TODO Master] Add Progress Bar for current page` to add a progress bar to the current page. Can be placed into page properties.

### Implicit Macros based on the rendering position 
The plugin actually has an implicit mode for `{{renderer :todomaster}}` based on the rendering position:
- if it is at the root of the page (without a parent block) and have no children, then it will get the todos for the whole page
- otherwise, it will render the todos for the children blocks

This is useful if you want to add the plugin to your journals page template to track your daily completion.