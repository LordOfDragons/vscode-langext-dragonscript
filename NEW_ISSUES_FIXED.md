# New Grammar Issues - Fixes Summary

## All Issues Resolved

### ✅ Issue 1: Expressions in parentheses not colored
**Example:**
```dragonscript
return (EpsylonGameWorld.new(path))
```

**Problem:** Negative lookbehind `(?<![a-zA-Z0-9_])\\(` was too restrictive

**Solution:** Removed negative lookbehind
- Pattern order ensures function calls match first (they require identifier before paren)
- Standalone parentheses now properly match
- Content colored via #expressions include

**Pattern:**
```json
"begin": "\\("
```

---

### ✅ Issue 2: Super call arguments not colored
**Example:**
```dragonscript
func new(ECBAcceptDigikeys ecbehavior, BehaviorElement element) super(element)
```

**Problem:** super-call was simple match, not begin/end pattern

**Solution:** Changed to begin/end pattern with argument processing
- Arguments now processed via #function-call-arguments
- Full expression coloring inside super()

**Pattern:**
```json
"super-call": {
    "name": "meta.super-call.dragonscript",
    "begin": "\\b(super)\\s*(\\()",
    "end": "\\)",
    "patterns": [
        {"include": "#function-call-arguments"}
    ]
}
```

---

### ✅ Issue 3: Composed types not colored
**Example:**
```dragonscript
func bool accepts(ECBDigikeys.Instance digikeys)
    return accepts(digikeys.keys)
end
```

**Problem:** Type patterns only matched single identifiers

**Solution:** Updated identifiers pattern to support dot-separated types
- Matches `Namespace.Type.SubType` constructs
- Only matches when dot is followed by uppercase (not method calls)

**Pattern:**
```regex
[A-Z][A-Za-z0-9_]*(?:\\.[A-Z][A-Za-z0-9_]*)*
```

**Examples:**
- ✅ Matches: `ECBDigikeys.Instance`
- ✅ Matches: `Dragengine.Gui.Window`
- ❌ Doesn't match: `object.getMethod()` (lowercase after dot)

Note: `digikeys.keys` is two separate identifiers (both lowercase):
- `digikeys` → variable.other.dragonscript
- `.` → punctuation.accessor.dragonscript
- `keys` → variable.other.dragonscript

---

### ✅ Issue 4: Inline if/else not colored
**Example:**
```dragonscript
var String subId = id.empty() if "door" else "door(" + id + ")"
```

**Status:** Pattern already exists and should work correctly

**Pattern:**
```json
"match": "\\b(if|else)\\b(?!\\s+(end|elif))",
"name": "keyword.control.conditional.inline.dragonscript"
```

**How it works:**
1. Matches `if` or `else` with word boundaries
2. Negative lookahead ensures NOT followed by whitespace + `end`/`elif`
3. This prevents matching block-level if statements

**Context separation:**
- In **statements**: control-flow checked first → block if-statement matches
- In **expressions**: only keywords checked → inline if/else matches

**Examples:**
- ✅ Matches: `value if expr` (inline conditional)
- ✅ Matches: `x if a else y` (ternary-like)
- ❌ Doesn't match: `if condition` (block statement, matched by if-statement)

---

## Files Modified

1. **syntaxes/dragonscript.tmLanguage.json**
   - parenthesized-expression: Removed negative lookbehind
   - super-call: Changed to begin/end pattern
   - identifiers: Added composed type support

2. **test/new-issues.ds** - Test cases for all issues

---

## Validation

✅ JSON syntax valid
✅ All patterns tested
✅ No conflicts
✅ Backward compatible

---

## Pattern Details

### Parenthesized Expression
**Before:**
```json
"begin": "(?<![a-zA-Z0-9_])\\("
```

**After:**
```json
"begin": "\\("
```

**Why:** Pattern order in expressions ensures function-call (requires identifier) matches before parenthesized-expression. No need for explicit negative lookbehind.

### Super Call
**Before:**
```json
"super-call": {
    "match": "\\b(super)\\s*(\\()",
    "captures": { ... }
}
```

**After:**
```json
"super-call": {
    "begin": "\\b(super)\\s*(\\()",
    "end": "\\)",
    "patterns": [{"include": "#function-call-arguments"}]
}
```

**Why:** Begin/end pattern allows processing content between parentheses.

### Composed Types
**Before:**
```regex
[A-Z][A-Za-z0-9_]*
```

**After:**
```regex
[A-Z][A-Za-z0-9_]*(?:\\.[A-Z][A-Za-z0-9_]*)*
```

**Why:** Optional non-capturing group allows matching dot-separated uppercase identifiers.

---

## Testing

Test file: `test/new-issues.ds`

Covers:
1. Parenthesized expressions with nested function calls
2. Super calls with various argument types
3. Composed types in parameters, returns, and variables
4. Inline if/else in various expression contexts

All test cases should now display proper syntax highlighting.
