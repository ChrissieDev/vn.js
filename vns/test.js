// vns\test.js
// main.js (or index.js) - Entry point for the DSL execution

import { Lexer } from './Lexer.js';
import { Parser } from './Parser.js';
import { Interpreter } from './Interpreter.js';
import { ASTType } from './AST.js'; // Useful for checking node types in event handlers or debugging

// Example DSL Source Code
const sourceCode = `
;; This is a sample script for the visual novel DSL.
;; Comments start with double semicolons.

;; Define the main entry point function
==> main
    ;; Dialogue from a character (kacey)
    kacey
    "Hello, welcome to the demo!"

    ;; Narration (underscore speaker)
    _
    "The scene begins."

    ;; Variable declaration and assignment
    $playerName = "Hero" ;; string
    $playerLevel = 1 ;; number
    $isQuestActive = true ;; boolean
    $inventory = ["Sword", "Shield", "Potion"] ;; array
    $stats = { "strength": 10, "defense": 5 } ;; object
    $newStatus = "unchecked" ;; string
    

    ;; Dialogue with string interpolation
    kacey
    "Greetings, \${playerName}! Your current level is \${playerLevel}."

    ;; Multi-line string (whitespace trimmed by default)
    _
    """
    This is a narration
    that spans multiple
    lines.
    """

    ;; Preserved multi-line string
    _
    p"""
    This narration preserves
        indentation and
    line breaks!
    Inventory: \${inventory}
    Stats: \${stats}
    """

    ;; Conditional logic
    if (isQuestActive == true): ;; Changed: Removed $ from isQuestActive
        kacey
        "Your quest is currently active."
        ;; Nested block example
        if (playerLevel == 1): ;; Changed: Removed $ from playerLevel. Indentation of '_' below corrected.
            _ ;; Corrected indentation (4 spaces deeper than parent 'if')
            "You are just starting out."
        else:
            _ ;; Corrected indentation (4 spaces deeper than parent 'else')
            "You are beyond the initial stage."
    else:
        kacey
        "You do not have an active quest."

    ;; Assignment used in a condition (C-like behavior)
    ;; The variable $newStatus is assigned "checked" and then the assigned value is checked for truthiness.
    ;; "checked" is a truthy string.
    if (newStatus = "checked"): ;; Changed: Removed $ from newStatus (assignment expression target)
        _
        "The status was assigned and the condition evaluated truthy. newStatus is now \${newStatus}."
    else:
        _
        "This line will not run."

    ;; Test array and object comparison (deep equals '==')
    $list1 = [1, 2, { "a": 3 }] ;; Changed: "a" to be quoted string key, matching parser expectation
    $list2 = [1, 2, { "a": 3 }] ;; Changed: "a" to be quoted string key
    $list3 = [1, 2, { "a": 4 }] ;; Changed: "a" to be quoted string key
    if (list1 == list2): ;; Changed: Removed $
        _
        "List1 and List2 are deeply equal."
    else:
        _
        "List1 and List2 are NOT deeply equal."

    if (list1 == list3): ;; Changed: Removed $
        _
        "List1 and List3 are deeply equal."
    else:
        _
        "List1 and List3 are NOT deeply equal."


;; Another function with parameters
==> greet
    $message ;; Parameter declaration
    $sender  ;; Parameter declaration

    ;; Use the built-in print function
    print message ;; Changed: Removed $
    print "Sent by: " sender ;; Changed: Removed $

;; Call the main function to start the narrative flow
main

;; Call the greet function with positional arguments
greet "Hello from script!" "The Script"

;; Call the greet function with named arguments
greet --sender "Narrator Bot" --message "Greetings via named args!"

;; Call greet with variables as arguments
$greetingMsg = "Variable greeting"
$senderName = "Variable Sender"
greet greetingMsg senderName ;; Changed: Removed $

;; Call greet with mixed positional and named
greet "This is the positional message argument" --sender "Override Sender Name"
`;


// --- Orchestration ---

async function runDSL(source) {
    try {
        console.log("\n--- Starting DSL Execution ---");

        // 1. Lexing
        console.log("Lexing...");
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        // console.log("Tokens:", tokens.map(t => `\${t.type} L\${t.line}C\${t.column} '\${String(t.value).slice(0,20)}'`)); // More detailed token log

        // 2. Parsing
        console.log("Parsing...");
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // console.log("AST:", JSON.stringify(ast, null, 2));

        // 3. Interpreting
        console.log("Interpreting...");
        const interpreter = new Interpreter(ast);

        // Register event listeners (replace these with your VN engine's logic)
        interpreter.on('dialogue', (speaker, text, preserve) => {
            console.log(`\n--- EVENT: dialogue (preserve=\${preserve}) ---`);
            const speakerName = speaker ? speaker.name : 'Narration'; // Changed: Access speaker.name if speaker is IdentifierNode
            console.log(`[\${speakerName}]: \${text}`);
            console.log("Interpreter paused for dialogue. Call .resume() to continue.");

            setTimeout(() => {
                 console.log("... Auto-resuming interpreter ...");
                 // interpreter.resume(); // Assuming Interpreter has a resume method
                 // For now, let's assume Interpreter doesn't have resume() yet.
                 // The current Interpreter.js doesn't show a resume() method.
                 // To make this runnable, the Interpreter needs to be pausable and resumable.
                 // If the interpreter isn't designed to pause/resume via events yet,
                 // we can remove the pause/resume for now or implement it.
                 // For now, let's simulate by just continuing.
                 if (typeof interpreter.resume === 'function') {
                    interpreter.resume();
                 } else {
                    console.warn("Interpreter.resume() not implemented. Dialogue will not auto-resume.");
                 }

            }, 100);
        });

        interpreter.on('print', (args) => {
             console.log(`\n--- EVENT: print ---`);
             console.log("PRINT:", ...args);
        });

        interpreter.on('variableAssignment', (name, value) => {
             console.log(`\n--- EVENT: variableAssignment ---`);
             console.log(`$${name} =`, value);
        });

        interpreter.on('functionCallStart', (name, args) => { // args are AST nodes
             console.log(`\n--- EVENT: functionCallStart ---`);
             console.log(`CALL START: ${name}`);
        });

        interpreter.on('functionCallEnd', (name) => {
            console.log(`\n--- EVENT: functionCallEnd ---`);
            console.log(`CALL END: ${name}`);
        });

        interpreter.on('pause', (reason) => {
             console.log(`\n--- EVENT: pause (${reason}) ---`);
        });
        interpreter.on('resume', () => { // Assuming interpreter might emit this
             console.log(`\n--- EVENT: resume ---`);
        });

        interpreter.on('error', (err) => {
            console.error("\n--- EVENT: error ---");
            console.error(err.message);
        });

        interpreter.on('end', () => {
             console.log("\n--- EVENT: end ---");
             console.log("Interpreter finished execution.");
        });

        interpreter.execute();

    } catch (e) {
        console.error("\n--- Compilation Error ---");
        console.error(e.message);
        if (e.stack) console.error(e.stack); // Log stack for better debugging
    }
}

runDSL(sourceCode);