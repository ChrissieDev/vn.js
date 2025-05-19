// Token.js

/**
 * Defines the types of tokens the lexer can produce.
 */
export const TokenType = {
    INDENT: 'INDENT',
    DEDENT: 'DEDENT',
    NEWLINE: 'NEWLINE',
    IDENTIFIER: 'IDENTIFIER',
    STRING: 'STRING', // Includes single, double, and triple quotes
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    LBRACKET: '[', // Left Bracket for Arrays
    RBRACKET: ']', // Right Bracket
    LBRACE: '{', // Left Brace for Objects
    RBRACE: '}', // Right Brace
    COLON: ':', // For object properties and if/else blocks
    COMMA: ',', // For array elements and object properties
    EQUALS: '=', // For assignment
    EQUALS_EQUALS: '==', // For comparison
    DOLLAR: '$', // Variable prefix
    ARROW: '==>', // Function declaration prefix
    UNDERSCORE: '_', // Narration speaker
    IF: 'if', // If keyword
    ELSE: 'else', // Else keyword
    LPAREN: '(', // Left Parenthesis (e.g., for if conditions)
    RPAREN: ')', // Right Parenthesis
    FLAG_P: 'p', // Flag for preserved linebreaks (handled within STRING token)
    NAMED_ARG_PREFIX: '--', // Prefix for named function arguments
    EOF: 'EOF', // End of file
};

/**
 * Represents a single token from the source code.
 */
export class Token {
    /**
     * @param {string} type - The type of the token (from TokenType).
     * @param {*} value - The raw value of the token (e.g., string content, number value, identifier name).
     * @param {number} line - The line number where the token starts (1-based).
     * @param {number} column - The column number where the token starts (1-based).
     * @param {object} [meta={}] - Additional metadata (e.g., { isPreserved: boolean } for strings).
     */
    constructor(type, value, line, column, meta = {}) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
        this.meta = meta;
    }

    /**
     * Returns a string representation of the token for debugging.
     * @returns {string}
     */
    toString() {
        // Use slice(0, 50) for long string values to keep output manageable
        const displayValue = typeof this.value === 'string' && this.value.length > 50
            ? JSON.stringify(this.value.slice(0, 47) + '...')
            : JSON.stringify(this.value);
        return `Token(${this.type}, ${displayValue}, ${this.line}, ${this.column})`;
    }
}

export default {
    TokenType,
    Token,
}