# .vns example

A short, simple example of how the .vns file format works.
This is a work in progress and is being changed while I try and figure out if this is a good idea or not.

### """Specification"""
```
;; this is a comment. use two semicolons (;;) to start a comment.
;; there is a pre-processing step in the lexer that removes comments from the input string.
;; comments on their own lines with nothing else on the line are removed entirely,
;; and trailing comments are removed from the end of the line.

;; functions
;;
;; '-->' functions are defined by adding a '-->' before an identifier. i chose '-->' because it looks like an arrow,
;; and when you add a space after it, you have the same amount of spaces as an indentation level,
;; causing the function name to align with the function body
;; the function body must be indented one level deeper than the function name
;; the moment something on the previous indentation level appears that is not a comment,
;; it means that the function body is over
;;
;; functions should probably be an abstraction of some base 'Scoped' or 'Context' class
;; and the context class or whatever should have a `condition` that is an expression to evaluate when it's time to run the function at runtime
;; this is useful because multiple things create their own scopes, such as if/else statements, loops, etc.
--> main
    kacey
    "This is character dialogue."
    "The name that comes before the dialogue lines must refer to an actor that exists in the project"
    "Otherwise, the speaker will be invisible. Watch out for typos!"
    "Dialogue pauses execution until the interpreter's `resume` method is called."
    
    _
    "This is a line of dialogue without a speaker. Typically used for narration.. Always preceded by an underscore."

    kacey
    """
    This is a multi-line string. Sometimes you want to write lines of
    dialogue that span longer than the horizontal width of your text editor.
    It will not preserve line breaks unless you add an empty line or a \<br> tag.
    """

    p"""
    Adding the `p` flag before the string literal 
    causes line breaks to be preserved!
    """

    kacey
    "By the way, ${foo} is how you interpolate variables into strings. The value is looked up at runtime when this line is executed."

    $foo = "Hello" ;; string
    $bar = 42 ;; number
    $baz = true ;; boolean
    $qux = [1, 2, 3] ;; array
    $quux = { "key": "value" } ;; object
    $corge = null ;; null
    $grault = undefined ;; undefined
    $garply ;; also undefined

    ;; conditionals

    if (expression):
        kacey
        "This is a conditional block. The next line will be executed if the expression evaluates to true."
    else:
        kacey
        "This is an else block. The previous line was not executed, so this one will be."

--> test
    $foo
    $bar

    print foo
    print bar

    ;; return statement
    <-- 69 

;; valid function call
main

;; valid too (with arguments)
test "Hello" "World"

;; also valid (with named arguments)
test --foo 1 --bar 2
```