// Scope.js

/**
 * Represents a scope for variables and functions.
 */
export class Scope {
    /**
     * @param {Scope} [parent=null] - The parent scope.
     */
    constructor(parent = null) {
        this.parent = parent;
        this.variables = new Map(); // Map<string, any>
        // Map<string, { node: AST.FunctionDeclarationNode, definitionScope: Scope } | { isBuiltin: true, execute: function }>
        this.functions = new Map();
    }

    /**
     * Defines a variable in the current scope.
     * If the variable already exists in the current scope, its value is updated.
     * @param {string} name - The variable name.
     * @param {any} value - The variable value.
     */
    define(name, value) {
        this.variables.set(name, value);
    }

    /**
     * Gets the value of a variable, searching up the scope chain.
     * @param {string} name - The variable name.
     * @returns {any} The variable's value.
     * @throws {Error} If the variable is not found in any scope.
     */
    get(name) {
        if (this.variables.has(name)) {
            return this.variables.get(name);
        }
        if (this.parent) {
            return this.parent.get(name);
        }
        throw new Error(`Undefined variable '${name}'.`);
    }

     /**
      * Assigns a value to an *existing* variable, searching up the scope chain.
      * @param {string} name - The variable name.
      * @param {any} value - The value to assign.
      * @throws {Error} If the variable is not found in any scope for assignment.
      */
     assign(name, value) {
         if (this.variables.has(name)) {
             this.variables.set(name, value); // Assign in current scope if it exists here
             return;
         }
         if (this.parent) {
             this.parent.assign(name, value); // Search parent scopes for assignment
             return;
         }
         // If not found anywhere, it's an error (assignment to non-existent variable)
         throw new Error(`Assignment to undefined variable '${name}'.`);
     }


    /**
     * Defines a function in the current scope.
     * @param {string} name - The function name.
     * @param {object} definition - The function definition (AST node or built-in object).
     * @param {Scope} definitionScope - The scope where the function was defined (for lexical closures). Pass the *current* scope when defining.
     */
    defineFunction(name, definition, definitionScope) {
         // Store both the definition and the scope it was defined in
         this.functions.set(name, { definition, definitionScope });
    }

    /**
     * Gets a function definition, searching up the scope chain.
     * @param {string} name - The function name.
     * @returns {{ definition: object, definitionScope: Scope } | null} The function definition object, or null if not found.
     */
    getFunction(name) {
         if (this.functions.has(name)) {
             return this.functions.get(name);
         }
         if (this.parent) {
             return this.parent.getFunction(name);
         }
         return null; // Function not found
    }
}