# Change Log

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
