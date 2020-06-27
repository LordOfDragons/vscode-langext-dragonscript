# DragonScript Language Support

This extension provides support to highlight source code in the `DragonScript Script Language`.

The DragonScript repository can be found here:
  - https://github.com/LordOfDragons/dragonscript

Latest API documentation can be found here:
  - https://developer.dragondreams.ch/docs/dragonscript/langapi/latest

Main use is for creating games using the `Drag[en]gine Game Engine`:
  - https://github.com/LordOfDragons/dragengine
  - https://dragondreams.ch/?page_id=152

Latest Module API documentation and Usage pages on the Wiki can be found here:
  - https://developer.dragondreams.ch/docs/dragonscript/scriptapi/latest
  - https://developer.dragondreams.ch/wiki/doku.php/tag:dragonscript?do=showtag&tag=dragonscript

The DragonScript Script Language can be used standalone (using the "dsi" binary)
or as embedded language using a `C++ Binding`. Embedding DragonScript is rather
simple and allows mixing script with native code easily without using unsafe
C-Call hacks.

The Language is `strong typed`, `object oriented` and uses a `forward parsing only` grammar.

## Preview Images

![Preview Image](https://github.com/LordOfDragons/vscode-langext-dragonscript/blob/master/images/preview1.png)

## Requirements

There are no requirements for using this extension.

## Extension Settings

None yet but planed.

## Known Issues

- Visual Studio Code can not handle lookbehind regular expressions correctly.
  This causes line-splicing (back slash at end of line) to prematurly end
  certain language constructs. This results in code on the next line to be
  incorrectly marked invalid.

## Release Notes

### 1.0.0

Initial release with support for syntax highlighting.
