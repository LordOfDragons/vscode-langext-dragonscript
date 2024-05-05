# DragonScript Language Support

This extension provides language server support for the `DragonScript Script Language`.

The DragonScript repository can be found here:
  - https://github.com/LordOfDragons/dragonscript

Latest API documentation can be found here:
  - https://developer.dragondreams.ch/docs/dragonscript/langapi/latest

Main use is for creating games using the `Drag[en]gine Game Engine`:
  - https://github.com/LordOfDragons/dragengine
  - https://dragondreams.ch/?page_id=152

Module API documentation and Usage pages on the Wiki can be found here:
  - https://lordofdragons.github.io/dragengine/apidoc/dragonscript
  - https://developer.dragondreams.ch/wiki/doku.php/tag:dragonscript?do=showtag&tag=dragonscript

The DragonScript Script Language can be used standalone (using the "dsi" binary)
or as embedded language using a `C++ Binding`. Embedding DragonScript is rather
simple and allows mixing script with native code easily without using unsafe
C-Call hacks.

The Language is `strong typed`, `object oriented` and uses a `forward parsing only` grammar.

The language server supports:
- Provide Diagnostics
- Show Code Completion Proposals
- Show Hovers
- Help With Function and Method Signatures
- Show Definitions of a Symbol
- Find All References to a Symbol
- Highlight All Occurrences of a Symbol in a Document
- Show all Symbol Definitions Within a Document
- Show all Symbol Definitions in Folder
- Possible Actions on Errors or Warnings
- Rename Symbols


## Drag[en]gine Game Engine DragonScript Module

This extension supports the `Drag[en]gine Game Engine`. The installed `DragonScript Modules`
are automatically detected and the latest module version used if the workspace requires
Drag[en]gine. To enable this support see the extension parameter
`dragonscriptLanguage.requiresPackageDragengine`.


## Preview Images

![Preview Image](https://raw.githubusercontent.com/LordOfDragons/vscode-langext-dragonscript/master/images/preview1.png)

![Preview Image](https://raw.githubusercontent.com/LordOfDragons/vscode-langext-dragonscript/master/images/preview2.png)


## Requirements

To edit DragonScript no additional requirements are required.

To edit Drag[en]gine projects using the `DragonScript Script Module` the `Drag[en]gine Game Engine`
is required to be installed for this extension to find and load the Drag[en]gine packages.


## Extension Settings

`dragonscriptLanguage.pathDragengine`:

String type value containing the path to Drag[en]gine installation.
Use empty string to auto-detect (default). Set this path if the Drag[en]gine
Game Engine is not installed in the default path.

It is recommended to set this value on global level.

`dragonscriptLanguage.requiresPackageDragengine`:

Boolean type value indicating if the workspace requires `Drag[en]gine DragonScript Module Package`.
By default this is disabled.

Enable this parameter on workspace level for scripts using the Drag[en]gine Game Engine.

`dragonscriptLanguage.scriptDirectories`:

List of directories (strings) to scan for source files. Typically scripts are located in one
directory (default workspace root). Use empty list to disabled DragonScript support for workspace
or specific directory. The default value is ['.'] scanning the entire workspace directory for
source files.

Set this parameter on workspace or directory level. If set on directory level you can disable
source file scanning on a per directory basis, for example for data directories containing
no source code.


## Support

Report issues to https://github.com/LordOfDragons/vscode-langext-dragonscript/issues
or join the [Discord channel](https://discord.gg/Jeg62ns) to ask for help.


## Release Notes

### 2.0.0

Release with language server support:
- Provide Diagnostics
- Show Code Completion Proposals
- Show Hovers
- Help With Function and Method Signatures
- Show Definitions of a Symbol
- Find All References to a Symbol
- Highlight All Occurrences of a Symbol in a Document
- Show all Symbol Definitions Within a Document
- Show all Symbol Definitions in Folder
- Possible Actions on Errors or Warnings
- Rename Symbols

Added support to detect and use installed Drag[en]gine Game Engine DragonScript modules

### 1.0.0

Initial release with support for syntax highlighting without language server.
