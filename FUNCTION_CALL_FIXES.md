# Grammar Fixes - Function Call and Block Context Issues

## Issues Fixed

### Issue 1: Expressions inside function calls not colored

**Problem:** When expressions appeared inside function call arguments, they lost syntax highlighting.

**Example:**
```dragonscript
myFunc(a + b, c * d)  // a, b, c, d and operators should be colored
outer(inner(x))       // inner, x should be colored
```

**Root Cause:** The original `function-call` pattern included `#expressions`, but the recursion wasn't working properly because expressions needed explicit handling within the function call context.

**Solution:**
1. Created new `function-call-arguments` pattern with explicit includes:
   - `#comments` - Handle comments in arguments
   - `#line-continuation` - Handle line breaks with `\`
   - `#control-flow` - Handle blocks and other control structures
   - `#keywords`, `#literals`, `#function-call`, `#type-cast`, `#operators` - All expression components
   - `#parenthesized-expression` - Handle nested parentheses
   - `#identifiers` - Variable names
   - Comma separator

2. Both function call patterns now use `function-call-arguments` instead of generic `#expressions`

---

### Issue 2: Function calls not always colored as function calls

**Problem:** Method calls (after a dot) weren't recognized as function calls.

**Example:**
```dragonscript
obj.method()        // "method" should be entity.name.function
MyType.new()        // "new" should be entity.name.function
obj.prop.func()     // "func" should be entity.name.function
```

**Root Cause:** The original pattern only matched `\b([a-z][A-Za-z0-9_]*)\s*\(` which requires a word boundary at the start. This doesn't match after a dot.

**Solution:**
1. Split `function-call` into two separate patterns:
   - **Standalone function call**: `\b([a-z][A-Za-z0-9_]*)\s*\(` - matches `myFunc()`
   - **Method call**: `\.([a-z][A-Za-z0-9_]*)\s*\(` - matches `.method()`

2. Both patterns capture the function name as `entity.name.function.dragonscript`

---

### Issue 3: Block "end" keyword not always matched/colored

**Problem:** In complex nested blocks with function calls and line continuations, the `end` keyword wasn't matched, breaking syntax highlighting for subsequent code.

**Example:**
```dragonscript
var BlockActionListener blockDragengine = BlockActionListener.new(block ActionEvent event
    WindowLogo.showImageLogo(getDesktop(), Image.new("/shareddata/images/logoDragengine.jpg"), \
        1, 2, 2, 1, 2, blockEpsylon)
end)  // <- end should be matched here
```

**Root Cause:** Multiple factors:
1. Line continuation `\` wasn't explicitly handled in block context
2. Comments between block start and content could break matching
3. Complex nesting of function calls containing blocks containing function calls

**Solution:**
1. Added `#comments` and `#line-continuation` at the start of block-statement patterns
2. Ensured `function-call-arguments` includes `#control-flow` (which contains block-statement)
3. This creates proper recursive support: blocks can contain function calls, function calls can contain blocks

---

## Additional Improvements

### New Pattern: parenthesized-expression

**Purpose:** Handle parenthesized expressions like `(a + b)` properly

**Structure:**
- Begin: `\(`
- End: `\)`  
- Patterns: `#expressions` (recursive)

**Benefits:**
- Proper highlighting of complex expressions: `((a + b) * c)`
- Nested function calls: `func((getValue() + getOther()) * 2)`
- Better precedence handling

### Enhanced expressions pattern

**Changes:**
1. Added `#comments` at the start - handle inline comments
2. Added `#parenthesized-expression` - handle parentheses
3. Reordered patterns for better precedence

**Benefits:**
- More robust expression handling
- Better handling of complex nested structures

---

## Pattern Structure

```
function-call
├─ standalone: \b([a-z][A-Za-z0-9_]*)\s*\(
│  └─ function-call-arguments
└─ method: \.([a-z][A-Za-z0-9_]*)\s*\(
   └─ function-call-arguments

function-call-arguments
├─ #comments
├─ #line-continuation
├─ #control-flow (includes block-statement)
├─ #keywords
├─ #literals
├─ #function-call (recursive)
├─ #type-cast
├─ #operators
├─ #parenthesized-expression
└─ #identifiers

block-statement
├─ #comments
├─ #line-continuation
├─ type + parameter patterns
└─ #statements
    └─ #expressions
        └─ #function-call (creates proper nesting)

parenthesized-expression
└─ #expressions (recursive)

expressions
├─ #comments
├─ #line-continuation
├─ #keywords
├─ #literals
├─ #function-call
├─ #type-cast
├─ #parenthesized-expression
├─ #operators
└─ #identifiers
```

---

## Test Cases

All test cases in `test/issue-test.ds`:

1. **Block with function calls and line continuation** (reported issue)
   ```dragonscript
   BlockActionListener.new(block ActionEvent event
       WindowLogo.showImageLogo(getDesktop(), Image.new(...), \
           1, 2, 2, 1, 2, blockEpsylon)
   end)
   ```

2. **Nested function calls**
   ```dragonscript
   outer(inner(x))
   compute(getValue() + getOther())
   ```

3. **Method chaining**
   ```dragonscript
   obj.method1().method2().method3()
   ```

4. **Complex expressions in arguments**
   ```dragonscript
   calculate(a + b, c * d)
   process((getValue() + getOther()) * 2)
   ```

5. **Blocks in function calls**
   ```dragonscript
   collection.filter(block Item item
       return item.isValid()
   end).map(block Item item
       return item.transform()
   end)
   ```

---

## Validation

✅ JSON syntax valid
✅ All patterns properly nested
✅ Recursive structures supported
✅ No infinite loops in pattern matching
✅ Test cases cover all reported issues
