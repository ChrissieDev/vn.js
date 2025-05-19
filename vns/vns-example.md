let's create a domain-specific language lexer, parser and interpreter which emits events when certain procedures are executed

i want it to be an intendation-based language like python, and it's for my javascript web visual novel engine.

example code:
```
;; this is a comment. use two semicolons (;;) to start a comment.
;; there is a pre-processing step in the lexer that removes comments from the input string.
;; comments on their own lines with nothing else on the line are removed entirely,
;; and trailing comments are removed from the end of the line.

;; functions
;;
;; '==>' functions are defined by adding a '==>' before an identifier. i chose '==>' because it looks like an arrow,
;; and when you add a space after it, you have the same amount of spaces as an indentation level,
;; causing the function name to align with the function body
;; the function body must be indented one level deeper than the function name
;; the moment something on the previous indentation level appears that is not a comment,
;; it means that the function body is over
;;
;; functions should probably be an abstraction of some base 'Scoped' or 'Context' class
;; and the context class or whatever should have a `condition` that is an expression to evaluate when it's time to run the function at runtime
;; this is useful because multiple things create their own scopes, such as if/else statements, loops, etc.
==> main
    kacey
    "This is character dialogue using a pre-defined actor's unique identifier (able to be added externally via the interpreter's api at runtime)"
    "You can use the same speaker multiple times in a row without invoking their id again."
    "Identifiers are first looked up in the internal scene's actor list, and if not found, an unidentified variable error is thrown."
    "Dialogue pauses execution until the interpreter's `resume` method is called."
    
    _
    "This is a line of dialogue without a speaker. Typically used for narration.. Always preceded by an underscore."

    kacey
    """
    This is a multi-line string.
    Sometimes, dialogue can be long and span multiple lines.
    Line breaks are not preserved unless the flag 'p' is added before the triple quotes.
    """

    p"""
    Like this!
    Here, line breaks are preserved by the parser.
    """

    kacey
    "By the way, ${foo} is how you interpolate variables into strings. The value is looked up at runtime when this line is executed."

    ;; variable declaration and assignment.
    ;; declarations are preceded by a dollar sign to signify a variable,
    ;; and anything before the next space is the variable name.
    ;; assignment is done with a single equals sign, and the value is read until the next non-string space.
    ;; any valid js identifier is a valid identifier here.
    ;; the dollar sign is only used to declare a variable, not to reference it.
    $foo = "Hello" ;; string
    $bar = 42 ;; number
    $baz = true ;; boolean
    $qux = [1, 2, 3] ;; array
    $quux = { "key": "value" } ;; object
    $corge = null ;; null
    $grault = undefined ;; undefined
    $garply ;; also undefined as unassigned variables are undefined by default, just like js

    ;; conditionals
    if (expression):
        kacey
        "This is a conditional block. The next line will be executed if the expression evaluates to true."
    else:
        kacey
        "This is an else block. The previous line was not executed, so this one will be."

;; function with arguments. arguments appear on their own lines, indented one level deeper than the function's parent block
==> test
    $foo
    $bar
    
    ;; function call with arguments separated by spaces, like shell commands
    print foo
    print bar

;; valid function call
main

;; valid too (with arguments)
test "Hello" "World"

;; also valid (with named arguments)
test --foo 1 --bar 2
```