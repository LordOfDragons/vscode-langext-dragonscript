# Change Log

## 2.6.0

- Added new setting `dragonscriptLanguage.scriptVersion` to specify the Drag[en]gine
  DragonScript version to validate against. Use empty string to use the latest available
  version. If the version is not found locally it is downloaded from the online
  Drag[en]gine release repository.
- Added automatic detection of the required DragonScript version from the Drag[en]gine
  project file (`.degp`). The project file is searched in the workspace directory and
  parent directories and watched for changes.
- Added language status bar items for `.ds` files showing the Project Script Version
  (from `.degp`) and the Editor Script Version (from settings, clickable).
- If the required DragonScript version is not installed locally it is downloaded from
  the online Drag[en]gine release repository automatically.

## 2.5.0

- Added "File -> New..." menu entry "DragonScript Template File" to create new DragonScript
  files from templates. Templates available:
  - **Game**: Drag[en]gine game application class (`BaseGameApp` subclass)
  - **Game Loader**: Drag[en]gine game loader class (`WindowGameWorld.Loader` subclass)
  - **Behavior**: Drag[en]gine element class behavior (`DefaultECBehavior` subclass)
  - **Behavior (BT/SM)**: Drag[en]gine element class behavior with behavior tree and
    state machine support (`DefaultECBehavior` subclass with `ECComposeBTSM`)
- Fixed type completion inserting superfluous pins
- Fixed line splicing breaking semantic token contexts
- Added missing `\ref` highlight in doxygen comments
- Fixed single line comments not highlighted in all situations
- Fixed doxygen auto-brief first line spilling over into code if no period at end of line
- Fixed `new` function call not highlighting as keyword
- Improved compatibility with non-VSCode LSP clients
- Hardening of LSP server against client not supporting `globalStoragePath`
- Hardening against file system failures
- Added support for Haiku OS

## 2.4.0

- Added theme override to underline written to variables and deprecated elements.
  Can be disabled if the uses does not want to use this
- Added support for generating semantic tokens
- Improved TextMate grammer file
- Workaround for handling files contained in delga by vscode by unpacking them into
  a temporary directory (delga/deal caching)

## 2.3.0

- All XML Schemas used by Drag[en]gine added.

## 2.2.5

- Added support to register various XML Schemas used by Drag[en]gine.

## 2.2.0

- Potential fix for code scanning alert no. 2: Inefficient regular expression
- Added support to find game engine scripts in deal files. Required for
  Drag[en]gine 1.26.1 and never
- Fixed override function completion not qualifying arguments if colliding with type
  of same name. For example if overriding a function "void onEvent(Instance instance)"
  in a class where in a parent class something is named "Instance" now qualifying the
  "Instance" type would use the wrong type and no overriding would happen. This fix
  avoids this subtle kind of mistake that could otherwise be only noticed by looking
  at the hover information (override information would be missing)

## 2.1.0

Various bug fixes, hardenings and these improvements:
- Added support for defining base packages. Base packages allow referencing installed
  game or application projects. This is useful to write modifications or extensions
  for applications. Base packages can be either an directory with source code or a
  _.delga_ file. Delga files is the typical use case. See the new setting
  _dragonscript.basePackages_. For Delga files only the documentation is shown.
  Source code is not shown to protect copyrights of installed applications.
- Added support for functions without documentation to inherit the base class function
  documentation. Travels up the inheritance chain until a function with documentation
  is found.
- Added support for functions to show their inheritance chain in the hover information
  panel. Includes all parent functions overwriting base class functions, the base class
  function itself and the interface function if applicable. Class and function are
  hyperlinked individually for easy navigation.
- Improved the "\ref tag" documentation parsing to support more situations.
- Added icon for _.ds_ files.

## 2.0.0

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

## 1.0.0

Initial release with support for syntax highlighting without language server.
