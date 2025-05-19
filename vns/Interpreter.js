// vns\Interpreter.js
// Interpreter.js
import { ASTType } from './AST.js';
import { Scope } from './Scope.js';
import { SimpleEventEmitter } from './SimpleEventEmitter.js';
import { VariableAssignmentNode } from './AST.js'; // Needed for checking ASTType.VARIABLE_ASSIGNMENT
import { FunctionDeclarationNode } from './AST.js'; // Needed for checking ASTType.FUNCTION_DECLARATION
import { IdentifierNode } from './AST.js'; // Needed for checking ASTType.IDENTIFIER
import { LiteralNode } from './AST.js'; // Needed for checking ASTType.LITERAL
import { ArrayLiteralNode } from './AST.js'; // Needed for checking ASTType.ARRAY_LITERAL
import { ObjectLiteralNode } from './AST.js'; // Needed for checking ASTType.OBJECT_LITERAL
import { InterpolatedStringNode } from './AST.js'; // Needed for checking ASTType.INTERPOLATED_STRING
import { BinaryExpressionNode } from './AST.js'; // Needed for checking ASTType.BINARY_EXPRESSION
import { NamedArgumentNode } from './AST.js'; // Needed for checking ASTType.NAMED_ARGUMENT
import { DialogueStatementNode } from './AST.js'; // Needed for checking ASTType.DIALOGUE_STATEMENT
import { IfStatementNode } from './AST.js'; // Needed for checking ASTType.IF_STATEMENT
import { ElseBlockNode } from './AST.js'; // Needed for checking ASTType.ELSE_BLOCK
import { FunctionCallNode } from './AST.js'; // Needed for checking ASTType.FUNCTION_CALL
import { ProgramNode } from './AST.js'; // Needed for checking ASTType.PROGRAM


/**
 * Interpreter for the DSL. Executes the AST and emits events.
 */
export class Interpreter extends SimpleEventEmitter {
    /**
     * @param {AST.ProgramNode} ast - The Abstract Syntax Tree to interpret.
     */
    constructor(ast) {
        super();
        this.ast = ast;
        this.globalScope = new Scope();

        // State management for execution flow, including pause/resume and blocks
        // Stack of { block: AST.BlockNode, index: number, scopeStackDepth: number, isFunctionReturn?: boolean, functionName?: string } // MODIFIED: Stack item structure documented
        this.executionStack = [];
        // The current block node being executed (initially the root Program node)
        this.currentBlock = null;
        // The index of the current statement within currentBlock.statements
        this.currentStatementIndex = 0;

        this.isRunning = false;
        this.isPaused = false;

        // Scope stack: [globalScope, ...nestedScopes]
        this.scopeStack = [this.globalScope];

         // Register built-in functions
         this.addBuiltin('print', this.builtinPrint); // Example builtin
    }

    /**
     * Gets the current active scope (top of the scope stack).
     * @returns {Scope}
     */
    getCurrentScope() {
        return this.scopeStack[this.scopeStack.length - 1];
    }

    /**
     * Pushes a new scope onto the stack.
     * @param {Scope} scope - The scope to push.
     * @returns {Scope} The pushed scope.
     */
    pushScope(scope) {
        this.scopeStack.push(scope);
        return scope;
    }

    /**
     * Pops the current scope from the stack.
     * @returns {Scope} The popped scope.
     * @throws {Error} If attempting to pop the global scope unexpectedly.
     */
    popScope() {
        if (this.scopeStack.length <= 1) {
            // Should ideally never happen if push/pop logic is correct
            throw new Error("Runtime Error: Cannot pop global scope unexpectedly.");
        }
        return this.scopeStack.pop();
    }


    // --- Built-in Functions ---
    // These are native JS functions callable from the DSL.
    // They are stored as objects with `isBuiltin: true` and an `execute` method.
    // The `execute` method receives (interpreter, callNode, scope).

    builtinPrint = {
         isBuiltin: true, // Flag to identify built-ins
         execute: (interpreter, callNode, scope) => {
             // Evaluate all arguments passed to the print function
             const argsToPrint = callNode.args.map(argNode => interpreter.evaluateExpression(argNode, scope));
             // console.log(...argsToPrint); // Direct logging for debugging

             // Emit the 'print' event with the evaluated arguments
             interpreter.emit('print', argsToPrint);
         }
    };

    /**
     * Registers a native JavaScript function as a built-in callable from the DSL.
     * @param {string} name - The name to use in the DSL.
     * @param {object} builtinDefinition - An object like { isBuiltin: true, execute: function(interpreter, callNode, scope) }.
     */
     addBuiltin(name, builtinDefinition) {
          // Define built-ins in the global scope, associating them with the global scope itself
          this.globalScope.defineFunction(name, builtinDefinition, this.globalScope);
     }


    // --- Execution Control ---

    /**
     * Starts the interpretation process.
     */
    execute() {
        if (this.isRunning) {
             console.warn("Interpreter is already running.");
             return;
        }
        this.isRunning = true;
        this.isPaused = false;

        // Initialize execution state to the root Program node
        this.currentBlock = this.ast; // The root of the AST is treated as the initial block
        this.currentStatementIndex = 0;

        // Start the main execution loop
        this.run();
    }

     /**
      * The main interpretation loop. Continuously executes statements
      * from the current block until paused, finished, or an error occurs.
      */
    run() {
         if (!this.isRunning || this.isPaused) {
             return;
         }

         // Main execution loop
         mainLoop: while (this.currentBlock && this.isRunning && !this.isPaused) {
            let statementsList = this.currentBlock.type === ASTType.PROGRAM
                ? this.currentBlock.body
                : this.currentBlock.statements;

            if (!Array.isArray(statementsList)) {
                const blockTypeInfo = this.currentBlock ? this.currentBlock.type : 'null';
                const errorMsg = `Interpreter Error: Expected an array of statements for current block type '${blockTypeInfo}', but found ${typeof statementsList}.`;
                console.error(errorMsg, this.currentBlock);
                this.emit('error', new Error(errorMsg));
                this.isRunning = false;
                return; // Stop execution
            }

            if (this.currentStatementIndex < statementsList.length) {
                const statementToExecute = statementsList[this.currentStatementIndex];
                
                const blockBeforeExecution = this.currentBlock;
                const indexBeforeExecution = this.currentStatementIndex;

                try {
                    this.executeStatement(statementToExecute, this.getCurrentScope());
                } catch (error) {
                    const location = statementToExecute.location || { line: 'unknown', column: 'unknown' };
                    // Ensure error.message exists; some errors might not have it directly
                    const errorMessage = error.message || String(error);
                    console.error(`Runtime Error: ${errorMessage} at ${location.line}:${location.column}`);
                    this.emit('error', error);
                    this.isRunning = false; 
                    return; // Stop execution
                }

                // If statement caused a pause (e.g. dialogue)
                if (this.isPaused) {
                    // Set index to point to the *next* statement for when resume() is called
                    this.currentStatementIndex = indexBeforeExecution + 1; 
                    this.emit('pause', 'dialogue');
                    return; // Exit run() and wait for resume()
                }

                // If executeStatement did NOT change the block context (was not a block-entering call)
                // then we manually advance to the next statement in the current block.
                // If executeBlock or a function call that changes context *was* called, 
                // this.currentStatementIndex would be 0 for the new block,
                // and this.currentBlock would have changed.
                if (this.currentBlock === blockBeforeExecution && this.currentStatementIndex === indexBeforeExecution) {
                    this.currentStatementIndex++;
                }

            } else { // currentStatementIndex >= statementsList.length -- Current block is finished
                if (this.executionStack.length > 0) {
                    const poppedState = this.executionStack.pop(); // MODIFIED: Pop the frame

                    // MODIFIED: Restore context from poppedState
                    this.currentBlock = poppedState.block;
                    this.currentStatementIndex = poppedState.index + 1; // Resume AFTER the calling statement

                    // MODIFIED: Restore scope: Pop scopes until we reach the saved depth of the caller
                    while (this.scopeStack.length > poppedState.scopeStackDepth) {
                        this.popScope();
                    }

                    // MODIFIED: If this pop corresponds to a function returning, emit the event
                    if (poppedState.isFunctionReturn) {
                        this.emit('functionCallEnd', poppedState.functionName);
                    }
                    
                    continue mainLoop; 
                } else {
                    // No more statements in the current block and execution stack is empty.
                    // This means the program (or initial block) has finished.
                    this.isRunning = false;
                    this.emit('end');
                    return; // End of execution
                }
            }
        } // End of mainLoop

        if (!this.isRunning && !this.isPaused && this.executionStack.length === 0 && this.currentBlock &&
            this.currentStatementIndex >= (this.currentBlock.type === ASTType.PROGRAM ? this.currentBlock.body : this.currentBlock.statements).length) {
            if(this.isRunning){ 
                 this.isRunning = false;
                 this.emit('end');
            }
        }
     }

    /**
     * Resumes interpretation after it has been paused.
     */
    resume() {
        if (!this.isRunning) {
        }
        if (!this.isPaused) {
            console.warn("Interpreter.resume() called, but interpreter is not paused.");
            return;
        }
        this.isPaused = false;
        if (!this.isRunning) { 
            console.warn("Interpreter.resume() called when isRunning was false but isPaused was true. Attempting to restart execution flow.");
            this.isRunning = true; 
        }
        this.emit('resume');
        this.run(); 
    }


    /**
     * Executes a block of statements (used for if/else blocks primarily).
     * Manages pushing execution state onto the stack.
     * Function calls now manually manage stack for their bodies for precise event emission.
     * @param {AST.BlockNode} blockNode - The block node to execute.
     * @param {Scope} scopeToUse - The scope context in which to execute this block (usually current scope for if/else).
     */
    executeBlock(blockNode, scopeToUse) { // MODIFIED: Simplified for non-function blocks
         const stateBeforeBlock = {
              block: this.currentBlock,
              index: this.currentStatementIndex, 
              scopeStackDepth: this.scopeStack.length // Current scope depth, no new scope created by this block itself
         };
         this.executionStack.push(stateBeforeBlock);

         this.currentBlock = blockNode;
         this.currentStatementIndex = 0; 
     }

    /**
     * Executes a single statement.
     * @param {AST.ASTNode} statementNode - The statement node to execute.
     * @param {Scope} scope - The scope context in which to execute the statement.
     */
    executeStatement(statementNode, scope) {
        switch (statementNode.type) {
            case ASTType.VARIABLE_ASSIGNMENT:
                if (statementNode.value === null) {
                    scope.define(statementNode.name.name, undefined);
                    this.emit('variableAssignment', statementNode.name.name, undefined);
                } else {
                    const value = this.evaluateExpression(statementNode.value, scope);
                    scope.define(statementNode.name.name, value);
                    this.emit('variableAssignment', statementNode.name.name, value);
                }
                break;

            case ASTType.FUNCTION_DECLARATION:
                scope.defineFunction(statementNode.name.name, statementNode, scope);
                this.emit('functionDefinition', statementNode.name.name);
                break;

            case ASTType.DIALOGUE_STATEMENT:
                const speakerIdentifierNode = statementNode.speaker; 
                const textValue = this.evaluateExpression(statementNode.text, scope);

                this.emit('dialogue', speakerIdentifierNode, textValue, statementNode.preserveLinebreaks);
                this.isPaused = true; 
                break;

            case ASTType.IF_STATEMENT:
                const conditionResult = this.evaluateExpression(statementNode.condition, scope);
                if (this.isTruthy(conditionResult)) {
                    this.executeBlock(statementNode.consequent, scope); // MODIFIED: Uses simpler executeBlock
                } else if (statementNode.alternate) {
                    this.executeBlock(statementNode.alternate.consequent, scope); // MODIFIED: Uses simpler executeBlock
                }
                break;

            case ASTType.FUNCTION_CALL:
                this.executeFunctionCall(statementNode, scope);
                break;

            case ASTType.PARAMETER_DECLARATION:
                 console.warn(`Runtime Warning: Encountered ParameterDeclarationNode as a standalone statement for '${statementNode.name.name}' at line ${statementNode.location.line}. This is usually part of a function definition.`);
                 break;

            default:
                const loc = statementNode.location || { line: 'unknown', column: 'unknown' };
                throw new Error(`Runtime Error: Unknown or unhandled statement type '${statementNode.type}' at line ${loc.line}:${loc.column}.`);
        }
    }


    /**
     * Executes a function call.
     * @param {AST.FunctionCallNode} callNode - The function call node.
     * @param {Scope} callingScope - The scope in which the function is being called.
     * @throws {Error} If the function is not found or arguments are incorrect.
     */
    executeFunctionCall(callNode, callingScope) {
         const funcName = callNode.name.name;
         const funcDefinitionInfo = callingScope.getFunction(funcName);

         if (!funcDefinitionInfo) {
             throw new Error(`Runtime Error: Call to undefined function '${funcName}'.`);
         }

         this.emit('functionCallStart', funcName, callNode.args);

         if (funcDefinitionInfo.definition.isBuiltin && typeof funcDefinitionInfo.definition.execute === 'function') {
              try {
                  funcDefinitionInfo.definition.execute(this, callNode, callingScope);
              } catch (e) {
                   throw new Error(`Runtime Error in built-in function '${funcName}': ${e.message}`);
              }
              // MODIFIED: Built-in functions also need to emit their end event if they are not asynchronous.
              // Assuming built-ins are synchronous for now. If they can pause, this needs more thought.
              this.emit('functionCallEnd', funcName); 

         }
         else if (funcDefinitionInfo.definition.type === ASTType.FUNCTION_DECLARATION) {
              const funcDefinitionNode = funcDefinitionInfo.definition;
              const definitionScope = funcDefinitionInfo.definitionScope; // Lexical scope of function definition

             // MODIFIED: Save caller's scope stack depth BEFORE pushing function's new scope
             const callerScopeStackDepth = this.scopeStack.length;

             const functionExecutionScope = this.pushScope(new Scope(definitionScope)); // New scope for function execution

             // Parameter binding
             const declaredParams = funcDefinitionNode.parameters.map(p => p.name.name);
             const passedArgs = callNode.args;
             const boundParams = new Set();
             let positionalArgIndex = 0;

             for (const argNode of passedArgs) {
                  if (argNode.type === ASTType.NAMED_ARGUMENT) continue;
                  if (positionalArgIndex >= declaredParams.length) {
                       throw new Error(`Runtime Error: Too many positional arguments (${passedArgs.filter(a => a.type !== ASTType.NAMED_ARGUMENT).length}) passed to function '${funcName}' at line ${callNode.location.line}. Function declares ${declaredParams.length} parameters.`);
                  }
                  const paramName = declaredParams[positionalArgIndex];
                  const argValue = this.evaluateExpression(argNode, callingScope); // Evaluate args in callingScope
                  functionExecutionScope.define(paramName, argValue);
                  boundParams.add(paramName);
                  positionalArgIndex++;
             }
             for (const argNode of passedArgs) {
                  if (argNode.type !== ASTType.NAMED_ARGUMENT) continue;
                  const paramName = argNode.name.name;
                  if (!declaredParams.includes(paramName)) {
                       throw new Error(`Runtime Error: Function '${funcName}' does not have a parameter named '${paramName}' at line ${callNode.location.line}.`);
                  }
                  if (boundParams.has(paramName)) {
                       throw new Error(`Runtime Error: Parameter '${paramName}' passed multiple times to function '${funcName}' at line ${callNode.location.line}.`);
                  }
                  const argValue = this.evaluateExpression(argNode.value, callingScope); // Evaluate args in callingScope
                  functionExecutionScope.define(paramName, argValue);
                  boundParams.add(paramName);
             }
             // End parameter binding

             // MODIFIED: Prepare stack frame for function body execution
             const stateToPush = {
                 block: this.currentBlock,         // Caller's block
                 index: this.currentStatementIndex,  // Index of the call site in caller's block
                 scopeStackDepth: callerScopeStackDepth, // Scope depth to restore to after function returns
                 isFunctionReturn: true,          // Flag indicating this frame pop means a function is returning
                 functionName: funcName             // Name of the function that is returning
             };
             this.executionStack.push(stateToPush);

             this.currentBlock = funcDefinitionNode.body; // Set current block to the function's body
             this.currentStatementIndex = 0;               // Start execution at the beginning of this new block
             
             // MODIFIED: DO NOT emit functionCallEnd here. It's handled by run() when the block finishes.

         } else {
              throw new Error(`Runtime Error: Identifier '${funcName}' is not a callable function.`);
         }
         // MODIFIED: Removed general functionCallEnd emission from here for user-defined functions.
         // Built-ins emit it themselves if they are synchronous.
     }


    // --- Expression Evaluation ---

     /**
      * Evaluates an expression node and returns its value.
      * @param {AST.ASTNode} node - The expression node to evaluate.
      * @param {Scope} scope - The scope context in which to evaluate the expression.
      * @returns {any} The result of the expression evaluation.
      * @throws {Error} If the expression type is unknown or invalid syntax within the expression.
      */
     evaluateExpression(node, scope) {
         switch (node.type) {
             case ASTType.LITERAL:
                 return node.value;

             case ASTType.IDENTIFIER:
                 return scope.get(node.name);

             case ASTType.ARRAY_LITERAL:
                 return node.elements.map(elementNode => this.evaluateExpression(elementNode, scope));

             case ASTType.OBJECT_LITERAL:
                 const evaluatedObject = {};
                 for (const key in node.properties) {
                     evaluatedObject[key] = this.evaluateExpression(node.properties[key], scope);
                 }
                 return evaluatedObject;

             case ASTType.INTERPOLATED_STRING:
                  let resultString = '';
                  for (const partNode of node.parts) {
                      if (partNode.type === ASTType.LITERAL) {
                          resultString += partNode.value;
                      } else if (partNode.type === ASTType.IDENTIFIER) {
                          try {
                              const value = scope.get(partNode.name);
                              let stringValue;
                              if (value === undefined || value === null) {
                                  stringValue = '';
                              } else if (typeof value === 'object') {
                                  try {
                                       stringValue = JSON.stringify(value);
                                  } catch (e) {
                                       console.warn(`Runtime Warning: Could not stringify complex object for interpolation: ${e.message}`);
                                       stringValue = '[object Object]';
                                  }
                              } else {
                                  stringValue = String(value);
                              }
                              resultString += stringValue;

                          } catch (e) {
                              console.warn(`Runtime Warning: Variable '${partNode.name}' not found during string interpolation at line ${node.location.line}. Inserting empty string.`);
                              resultString += '';
                          }
                      } else {
                           throw new Error(`Runtime Error: Unexpected node type (${partNode.type}) found in interpolated string parts.`);
                      }
                  }
                  return resultString;

            case ASTType.BINARY_EXPRESSION:
                 const left = this.evaluateExpression(node.left, scope);
                 const right = this.evaluateExpression(node.right, scope);

                 switch (node.operator) {
                     case '==':
                         return this.deepEquals(left, right);
                     default:
                         throw new Error(`Runtime Error: Unknown binary operator '${node.operator}' at line ${node.location.line}`);
                 }

            case ASTType.VARIABLE_ASSIGNMENT: 
                 const assignedValue = this.evaluateExpression(node.value, scope);
                 if (node.name.type !== ASTType.IDENTIFIER) {
                      throw new Error(`Runtime Error: Invalid assignment target in expression at line ${node.location.line}. Left side must be a variable identifier.`);
                 }
                 scope.assign(node.name.name, assignedValue);
                 this.emit('variableAssignment', node.name.name, assignedValue);
                 return assignedValue; 
            default:
                 throw new Error(`Runtime Error: Unknown expression type '${node.type}' at line ${node.location.line}`);
         }
     }

     /**
      * Helper function to determine the "truthiness" of a value, similar to JavaScript's behavior in if conditions.
      * @param {any} value - The value to check.
      * @returns {boolean} True if the value is truthy, false otherwise.
      */
     isTruthy(value) {
         return Boolean(value);
     }

     /**
      * Helper function for performing a deep equality comparison between two values.
      * Used for the '==' operator.
      * @param {any} a - The first value.
      * @param {any} b - The second value.
      * @returns {boolean} True if the values are deeply equal, false otherwise.
      */
     deepEquals(a, b) {
          if (a === b) return true;

          if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
              return false;
          }

          const isArrayA = Array.isArray(a);
          const isArrayB = Array.isArray(b);
          if (isArrayA !== isArrayB) return false;

          if (isArrayA) {
              if (a.length !== b.length) return false;
              for (let i = 0; i < a.length; i++) {
                  if (!this.deepEquals(a[i], b[i])) return false;
              }
              return true;
          }

          const keysA = Object.keys(a);
          const keysB = Object.keys(b);
          if (keysA.length !== keysB.length) return false;

          for (const key of keysA) {
              if (!Object.prototype.hasOwnProperty.call(b, key) || !this.deepEquals(a[key], b[key])) {
                  return false;
              }
          }
          return true;
     }
}

export default Interpreter;