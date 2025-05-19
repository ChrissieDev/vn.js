// AST.js

/**
 * Defines the types of Abstract Syntax Tree nodes.
 */
export const ASTType = {
    PROGRAM: 'Program',
    FUNCTION_DECLARATION: 'FunctionDeclaration',
    PARAMETER_DECLARATION: 'ParameterDeclaration', // Represent $param lines inside function def body
    BLOCK: 'Block', // Represents an indented sequence of statements
    DIALOGUE_STATEMENT: 'DialogueStatement',
    VARIABLE_ASSIGNMENT: 'VariableAssignment', // For $var = value; also used for assignment-in-condition
    IF_STATEMENT: 'IfStatement',
    ELSE_BLOCK: 'ElseBlock', // Represents the block following the else keyword
    FUNCTION_CALL: 'FunctionCall',
    NAMED_ARGUMENT: 'NamedArgument',
    IDENTIFIER: 'Identifier', // Represents a variable or function name
    LITERAL: 'Literal', // For basic literal values (string, number, boolean, null/undefined)
    ARRAY_LITERAL: 'ArrayLiteral', // Represents [ value, ... ]
    OBJECT_LITERAL: 'ObjectLiteral', // Represents { key: value, ... }
    INTERPOLATED_STRING: 'InterpolatedString', // For strings with ${...}
    BINARY_EXPRESSION: 'BinaryExpression', // For operators like ==
};

/**
 * Base class for all AST nodes.
 */
export class ASTNode {
    /**
     * @param {string} type - The type of the AST node (from ASTType).
     * @param {object} [location={}] - The location in the source code { line, column }.
     */
    constructor(type, location = {}) {
        this.type = type;
        this.location = location;
    }
}

/**
 * The root node of the AST, representing the entire program.
 */
export class ProgramNode extends ASTNode {
    /**
     * @param {ASTNode[]} [body=[]] - An array of top-level statements.
     * @param {object} location - Source location.
     */
    constructor(body = [], location) {
        super(ASTType.PROGRAM, location);
        this.body = body;
    }
}

/**
 * Represents a function declaration (==> functionName).
 */
export class FunctionDeclarationNode extends ASTNode {
    /**
     * @param {IdentifierNode} name - The name of the function.
     * @param {ParameterDeclarationNode[]} [parameters=[]] - Array of declared parameters ($param lines in body).
     * @param {BlockNode} body - The function body.
     * @param {object} location - Source location.
     */
    constructor(name, parameters = [], body, location) {
        super(ASTType.FUNCTION_DECLARATION, location);
        this.name = name;
        this.parameters = parameters;
        this.body = body;
        // Store the scope where this function was defined for lexical scoping
        this.definitionScope = null; // This will be set by the interpreter
    }
}

/**
 * Represents a parameter declaration line inside a function body ($param).
 */
export class ParameterDeclarationNode extends ASTNode {
     /**
      * @param {IdentifierNode} name - The name of the parameter.
      * @param {object} location - Source location.
      */
     constructor(name, location) {
         super(ASTType.PARAMETER_DECLARATION, location);
         this.name = name;
     }
}

/**
 * Represents an indented block of statements.
 */
export class BlockNode extends ASTNode {
    /**
     * @param {ASTNode[]} [statements=[]] - An array of statements within the block.
     * @param {object} location - Source location.
     */
    constructor(statements = [], location) {
        super(ASTType.BLOCK, location);
        this.statements = statements;
    }
}

/**
 * Represents a dialogue statement (speaker "text").
 */
export class DialogueStatementNode extends ASTNode {
    /**
     * @param {IdentifierNode|null} speaker - The speaker identifier node, or null for underscore (_).
     * @param {LiteralNode|InterpolatedStringNode} text - The dialogue text node.
     * @param {boolean} preserveLinebreaks - Whether original linebreaks should be preserved.
     * @param {object} location - Source location.
     */
    constructor(speaker, text, preserveLinebreaks, location) {
        super(ASTType.DIALOGUE_STATEMENT, location);
        this.speaker = speaker;
        this.text = text;
        this.preserveLinebreaks = preserveLinebreaks;
    }
}

/**
 * Represents a variable assignment ($var = value). Also used for assignment expressions.
 */
export class VariableAssignmentNode extends ASTNode {
     /**
      * @param {IdentifierNode} name - The variable name.
      * @param {ASTNode|null} value - The expression node for the value, or null for parameter declaration ($name).
      * @param {object} location - Source location.
      */
     constructor(name, value, location) {
         super(ASTType.VARIABLE_ASSIGNMENT, location);
         this.name = name;
         this.value = value;
     }
}

/**
 * Represents an if statement (if (condition): ...).
 */
export class IfStatementNode extends ASTNode {
    /**
     * @param {ASTNode} condition - The condition expression.
     * @param {BlockNode} consequent - The block to execute if the condition is true.
     * @param {ElseBlockNode|null} alternate - The else block, if present.
     * @param {object} location - Source location.
     */
    constructor(condition, consequent, alternate = null, location) {
        super(ASTType.IF_STATEMENT, location);
        this.condition = condition;
        this.consequent = consequent;
        this.alternate = alternate;
    }
}

/**
 * Represents the block associated with an else keyword.
 */
export class ElseBlockNode extends ASTNode {
    /**
     * @param {BlockNode} consequent - The block to execute if the preceding if condition was false.
     * @param {object} location - Source location.
     */
    constructor(consequent, location) {
         super(ASTType.ELSE_BLOCK, location);
         this.consequent = consequent;
     }
}


/**
 * Represents a function call (functionName arg1 arg2 --named val).
 */
export class FunctionCallNode extends ASTNode {
    /**
     * @param {IdentifierNode} name - The name of the function to call.
     * @param {ASTNode[]} [args=[]] - Array of argument nodes (ExpressionNode or NamedArgumentNode).
     * @param {object} location - Source location.
     */
    constructor(name, args = [], location) {
        super(ASTType.FUNCTION_CALL, location);
        this.name = name;
        this.args = args;
    }
}

/**
 * Represents a named argument in a function call (--name value).
 */
export class NamedArgumentNode extends ASTNode {
    /**
     * @param {IdentifierNode} name - The name of the argument.
     * @param {ASTNode} value - The expression node for the argument's value.
     * @param {object} location - Source location.
     */
    constructor(name, value, location) {
        super(ASTType.NAMED_ARGUMENT, location);
        this.name = name;
        this.value = value;
    }
}

/**
 * Represents an identifier (variable or function name).
 */
export class IdentifierNode extends ASTNode {
    /**
     * @param {string} name - The string value of the identifier.
     * @param {object} location - Source location.
     */
    constructor(name, location) {
        super(ASTType.IDENTIFIER, location);
        this.name = name;
    }
}

/**
 * Represents a literal value (string chunk in interpolated string, number, boolean).
 */
export class LiteralNode extends ASTNode {
    /**
     * @param {*} value - The raw value (string, number, boolean, null, etc.).
     * @param {object} location - Source location.
     */
    constructor(value, location) {
        super(ASTType.LITERAL, location);
        this.value = value;
    }
}

/**
 * Represents an array literal ([...]).
 */
export class ArrayLiteralNode extends ASTNode {
    /**
     * @param {ASTNode[]} [elements=[]] - Array of expression nodes for the elements.
     * @param {object} location - Source location.
     */
    constructor(elements = [], location) {
        super(ASTType.ARRAY_LITERAL, location);
        this.elements = elements;
    }
}

/**
 * Represents an object literal ({...}).
 */
export class ObjectLiteralNode extends ASTNode {
    /**
     * @param {object} [properties={}] - Object mapping string keys to expression nodes.
     * @param {object} location - Source location.
     */
    constructor(properties = {}, location) {
        super(ASTType.OBJECT_LITERAL, location);
        this.properties = properties; // { stringKey: ExpressionNode }
    }
}

/**
 * Represents a string that contains interpolation (${...}).
 */
export class InterpolatedStringNode extends ASTNode {
    /**
     * @param {ASTNode[]} [parts=[]] - Array of LiteralNode (string chunks) or IdentifierNode (${var}) parts.
     * @param {object} location - Source location.
     */
    constructor(parts = [], location) {
        super(ASTType.INTERPOLATED_STRING, location);
        this.parts = parts; // Array of LiteralNode (string) or IdentifierNode (variable)
    }
}

/**
 * Represents a binary expression (left operator right).
 */
export class BinaryExpressionNode extends ASTNode {
     /**
      * @param {ASTNode} left - The left-hand side expression.
      * @param {string} operator - The operator (e.g., '==').
      * @param {ASTNode} right - The right-hand side expression.
      * @param {object} location - Source location.
      */
     constructor(left, operator, right, location) {
         super(ASTType.BINARY_EXPRESSION, location);
         this.left = left;
         this.operator = operator;
         this.right = right;
     }
}

export default {
    ASTType,
    ProgramNode,
    FunctionDeclarationNode,
    ParameterDeclarationNode,
    BlockNode,
    DialogueStatementNode,
    VariableAssignmentNode,
    IfStatementNode,
    ElseBlockNode,
    FunctionCallNode,
    NamedArgumentNode,
    IdentifierNode,
    LiteralNode,
    ArrayLiteralNode,
    ObjectLiteralNode,
    InterpolatedStringNode,
    BinaryExpressionNode
};