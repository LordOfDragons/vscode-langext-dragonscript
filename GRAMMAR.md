# DragonScript TextMate Grammar

This document describes the improved TextMate grammar for DragonScript language syntax highlighting in Visual Studio Code.

## Overview

The DragonScript TextMate grammar has been completely rewritten to provide better syntax highlighting and type colorization for DragonScript (.ds) files. The grammar was designed by analyzing over 1,400 real-world DragonScript files from:

- [Drag[en]gine DragonScript Module](https://github.com/LordOfDragons/dragengine/tree/master/src/modules/scripting/dragonscript/scripts) (1133 files)
- [DemoCap Project](https://github.com/LordOfDragons/democap/tree/main/data) (291 files)

## Key Features

### 1. Enhanced Type Highlighting

The grammar intelligently colorizes types in contexts where they are clearly identifiable:

- **Function return types**: `func int getValue()` - `int` is highlighted as a type
- **Parameter types**: `func void setValue(String name, int count)` - types are properly colored
- **Variable declarations**: `var Array items` - `Array` is highlighted as a type
- **Cast expressions**: `obj cast String` - `String` is colored as a type
- **Exception types**: `catch EInvalidParam e` - exception types are highlighted
- **Inheritance**: `extends BaseClass implements Interface` - parent types are colored

### 2. Type Categories

Types are categorized for better semantic highlighting:

- **Primitive types**: `void`, `bool`, `byte`, `int`, `float`
- **Built-in types**: `Object`, `String`, `Array`, `Dictionary`, `Block`, `Exception`, etc.
- **User-defined types**: Any capitalized identifier in type positions

### 3. Language Constructs

The grammar properly handles all DragonScript language features:

#### Declarations
- `namespace` - Namespace declarations with dot-separated paths
- `pin` - Import declarations
- `requires` - Package requirements
- `class` / `interface` / `enum` - Type declarations
- `func` - Function/method declarations
- `var` - Variable declarations

#### Modifiers
- Access: `public`, `protected`, `private`
- Function: `native`, `abstract`, `static`, `fixed`

#### Control Flow
- Conditionals: `if`, `elif`, `else` (both block and inline forms)
- Loops: `while`, `for` (with `to`, `downto`, `step`)
- Switch: `select`, `case`, `else`
- Exception handling: `try`, `catch`, `throw`
- Flow control: `break`, `continue`, `return`
- Blocks: `block ... end`

#### Operators

**Arithmetic**: `+`, `-`, `*`, `/`, `%`, `++`, `--`

**Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`

**Logical**: `and`, `or`, `not` (keyword-based)

**Bitwise**: `&`, `|`, `^`, `~`, `<<`, `>>`

**Assignment**: `=`, `+=`, `-=`, `*=`, `/=`, `%=`, `<<=`, `>>=`, `&=`, `|=`, `^=`

**Type operators**: `cast`, `castable`, `typeof`, `isnull`

**Other**: `new`, `this`, `super`

### 4. Literals

#### Numbers
- **Decimal**: `42`, `-17`
- **Hexadecimal**: `0h2A` (prefix `0h`)
- **Binary**: `0b1010` (prefix `0b`)
- **Octal**: `0o52` (prefix `0o`)
- **Float**: `3.14`, `1.5e-3`, `2e10`

#### Strings and Characters
- **Strings**: `"Hello World"` with escape sequences
- **Characters**: `'A'` with escape sequences
- **Escape sequences**: `\u1234` (unicode), `\x41` (hex), `\0` (octal), `\n`, `\t`, etc.

#### Boolean and Null
- **Booleans**: `true`, `false`
- **Null**: `null`

### 5. Comments

- **Single-line**: `// comment`
- **Multi-line**: `/* comment */`
- **Documentation**: `/** \brief ... */` with tag support
  - Tags: `\brief`, `\param`, `\returns`, `\throws`, `\author`, `\version`, `\deprecated`, etc.

### 6. Special Features

#### Line Continuation
```dragonscript
public static fixed var String defaultPath = \
    "/some/long/path"
```

#### Inline Conditionals
```dragonscript
return count > 0 if "Active" else "Inactive"
```

#### Block Expressions
```dragonscript
items.forEach(block String each
    processItem(each)
end)
```

#### Member Variable Convention
Variables starting with `p` (e.g., `pMember`, `pCounter`) are highlighted as member variables.

## Scope Names

The grammar uses semantic scope names following TextMate conventions:

### Types
- `storage.type.primitive.dragonscript` - Primitive types (int, float, etc.)
- `storage.type.builtin.dragonscript` - Built-in types (String, Array, etc.)
- `storage.type.dragonscript` - User-defined types
- `storage.type.class.dragonscript` - Class declarations
- `storage.type.interface.dragonscript` - Interface declarations
- `storage.type.enum.dragonscript` - Enum declarations

### Keywords
- `keyword.control.*` - Control flow keywords
- `keyword.operator.*` - Operators
- `storage.modifier.*` - Modifiers (public, private, etc.)

### Entities
- `entity.name.function.*` - Function names
- `entity.name.type.*` - Type names in declarations
- `entity.other.inherited-class.*` - Parent classes/interfaces

### Variables
- `variable.parameter.*` - Function parameters
- `variable.other.*` - Regular variables
- `variable.other.member.*` - Member variables (p prefix)
- `variable.other.constant.*` - Constants (ALL_CAPS)
- `variable.language.*` - Language variables (this, super)

### Literals
- `constant.numeric.*` - Numbers
- `constant.language.*` - true, false, null
- `constant.character.escape.*` - Escape sequences
- `string.quoted.*` - Strings

### Comments
- `comment.line.*` - Line comments
- `comment.block.*` - Block comments
- `comment.block.documentation.*` - Doc comments

## Grammar Structure

The grammar is organized hierarchically:

1. **Top level**: Namespaces, classes, interfaces, enums
2. **Class/Interface body**: Members, methods, nested types
3. **Function body**: Statements, expressions, control flow
4. **Expressions**: Literals, operators, function calls, type casts

Pattern matching prioritizes more specific patterns first, ensuring accurate highlighting in complex scenarios.

## Testing

The grammar has been validated against:

- Repository test files (test/accept.ds, test/testfile1.ds)
- 1,424 real DragonScript files from production codebases
- Custom test files covering edge cases and complex patterns

## Compatibility

- Designed for Visual Studio Code 1.63.0+
- Compatible with standard TextMate color themes
- Follows VSCode semantic highlighting guidelines

## Implementation Details

- **File**: `syntaxes/dragonscript.tmLanguage.json`
- **Scope**: `source.dragonscript`
- **Size**: 856 lines
- **Format**: JSON (TextMate grammar format)

## Future Enhancements

Potential improvements for future versions:

1. More granular operator precedence highlighting
2. Enhanced semantic token support
3. Better handling of deeply nested structures
4. Specific highlighting for Drag[en]gine API classes

## References

- [DragonScript Language Documentation](https://developer.dragondreams.ch/docs/dragonscript/langapi/latest)
- [Drag[en]gine Game Engine](https://dragondreams.ch/)
- [TextMate Grammar Guide](https://macromates.com/manual/en/language_grammars)
- [VSCode Syntax Highlighting Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)
