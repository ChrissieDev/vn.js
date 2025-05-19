// vns\Parser.js
// Parser.js
import { TokenType } from './Token.js';
import {
    ASTType,
    // ASTNode, // Not directly used here but good to acknowledge
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
    BinaryExpressionNode,
} from './AST.js';


/**
 * Parser for the DSL. Converts a token stream into an Abstract Syntax Tree (AST).
 */
export class Parser {
    /**
     * @param {Token[]} tokens - The array of tokens from the lexer.
     */
    constructor(tokens) {
        this.tokens = tokens;
        this.currentTokenIndex = 0;
    }

    /**
     * Starts the parsing process and builds the AST.
     * @returns {ProgramNode} The root of the AST.
     * @throws {Error} If a syntax error is encountered.
     */
    parse() {
        const program = new ProgramNode([], this.getLocation());
        while (this.check(TokenType.NEWLINE)) {
             this.advance();
         }
        while (!this.isAtEnd()) {
            const statement = this.parseStatement();
             if (statement) {
                 program.body.push(statement);
             }
            while (this.check(TokenType.NEWLINE)) {
                 this.advance();
             }
        }

        if (!this.isAtEnd()) {
            throw this.error(this.peek(), "Unexpected tokens at the end of the file. Check for mismatched INDENT/DEDENT.");
        }

        return program;
    }

    /**
     * Parses a single statement based on the current token.
     * @returns {ASTNode} The parsed statement node.
     * @throws {Error} If the current token doesn't start a valid statement.
     */
    parseStatement() {
         const token = this.peek();

         switch (token.type) {
             case TokenType.ARROW:
                 return this.parseFunctionDeclaration();
             case TokenType.DOLLAR:
                 return this.parseVariableAssignmentOrParameterDeclaration();
             case TokenType.IF:
                 return this.parseIfStatement();
             case TokenType.IDENTIFIER:
             case TokenType.UNDERSCORE:
                 return this.parseIdentifierOrDialogueOrCall();
             case TokenType.NEWLINE:
                  this.advance();
                  return null;
             case TokenType.INDENT:
             case TokenType.DEDENT:
                 throw this.error(token, `Unexpected token ${token.type} at statement level.`);
             case TokenType.EOF:
                 return null;
             default:
                 throw this.error(token, `Unexpected token type ${token.type} ('${token.value}') at start of statement.`);
         }
    }

    /**
     * Parses a variable assignment statement ($name = value) or a parameter declaration line ($name).
     * @returns {VariableAssignmentNode}
     * @throws {Error} If the syntax is incorrect.
     */
     parseVariableAssignmentOrParameterDeclaration() {
         const location = this.getLocation();
         this.consume(TokenType.DOLLAR, "Expected '$' for variable or parameter declaration.");
         const name = this.parseIdentifier();

         if (this.check(TokenType.NEWLINE) || this.check(TokenType.EOF) || this.peek().type === TokenType.DEDENT) {
             return new VariableAssignmentNode(name, null, location);
         } else {
             this.consume(TokenType.EQUALS, "Expected '=' after variable name for assignment.");
             const value = this.parseExpression();
             return new VariableAssignmentNode(name, value, location);
         }
     }

    /**
     * Parses an indented block of statements.
     * @returns {BlockNode} The block node.
     * @throws {Error} If the block syntax is incorrect (missing INDENT/DEDENT).
     */
    parseBlock() {
        const location = this.getLocation();
        this.consume(TokenType.INDENT, "Expected indented block.");

        const statements = [];
         while (this.check(TokenType.NEWLINE)) {
             this.advance();
         }

        while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
            const statement = this.parseStatement();
            if (statement) {
                 statements.push(statement);
             }
             while (this.check(TokenType.NEWLINE)) {
                 this.advance();
             }
        }

        this.consume(TokenType.DEDENT, "Expected end of block (dedent).");
        return new BlockNode(statements, location);
    }


    /**
     * Parses a function declaration (==> name ... body).
     * @returns {FunctionDeclarationNode} The function declaration node.
     * @throws {Error} If the syntax is incorrect.
     */
    parseFunctionDeclaration() {
        const location = this.getLocation();
        this.consume(TokenType.ARROW, "Expected '==>' to start function declaration.");
        const name = this.parseIdentifier();

        this.consume(TokenType.NEWLINE, "Expected newline after function name.");
        const initialBodyBlock = this.parseBlock();

        const parameters = [];
        const bodyStatements = [];
        let readingParameters = true;

        for (const statement of initialBodyBlock.statements) {
            if (statement.type === ASTType.VARIABLE_ASSIGNMENT && statement.value === null) { // MODIFIED: Correct ASTType check
                if (readingParameters) {
                    if (statement.name.type !== ASTType.IDENTIFIER) {
                        throw this.error(statement.name, `Expected identifier for parameter declaration, found ${statement.name.type}`);
                    }
                    parameters.push(new ParameterDeclarationNode(statement.name, statement.location));
                } else {
                    throw this.error(statement, "Parameter declarations ($name) must appear at the beginning of a function body.");
                }
            } else {
                readingParameters = false;
                bodyStatements.push(statement);
            }
        }

        const functionBody = new BlockNode(bodyStatements, initialBodyBlock.location);
        return new FunctionDeclarationNode(name, parameters, functionBody, location);
    }

    /**
     * Parses an if statement (if (condition): ...).
     * @returns {IfStatementNode} The if statement node.
     * @throws {Error} If the syntax is incorrect.
     */
    parseIfStatement() {
        const location = this.getLocation();
        this.consume(TokenType.IF, "Expected 'if'.");
        this.consume(TokenType.LPAREN, "Expected '(' after 'if'.");
        const condition = this.parseExpression();
        this.consume(TokenType.RPAREN, "Expected ')' after if condition.");
        this.consume(TokenType.COLON, "Expected ':' after if condition.");
        this.consume(TokenType.NEWLINE, "Expected newline after if condition.");

        const consequent = this.parseBlock();
        let alternate = null;

         let lookaheadIndex = this.currentTokenIndex;
         let potentialElseToken = this.tokens[lookaheadIndex];
         while(potentialElseToken && potentialElseToken.type === TokenType.NEWLINE) {
              lookaheadIndex++;
              potentialElseToken = this.tokens[lookaheadIndex];
         }

        if (potentialElseToken && potentialElseToken.type === TokenType.ELSE) {
             this.consume(TokenType.ELSE, "Expected 'else'.");
             const elseLocation = this.tokens[this.currentTokenIndex-1].location;

             this.consume(TokenType.COLON, "Expected ':' after 'else'.");
             this.consume(TokenType.NEWLINE, "Expected newline after 'else'.");
             const elseConsequent = this.parseBlock();
             alternate = new ElseBlockNode(elseConsequent, elseLocation);
        }
        return new IfStatementNode(condition, consequent, alternate, location);
    }

    /**
     * Parses a statement starting with an Identifier or Underscore.
     * Differentiates between Dialogue Statements and Function Calls.
     * @returns {DialogueStatementNode | FunctionCallNode}
     * @throws {Error} If the syntax is incorrect.
     */
    parseIdentifierOrDialogueOrCall() { // MODIFIED METHOD
        const idToken = this.advance(); // Consumed IDENTIFIER or UNDERSCORE

        // Case 1: Underscore speaker (must be dialogue)
        if (idToken.type === TokenType.UNDERSCORE) {
            let dialogueStringToken = null;
            if (this.check(TokenType.STRING)) {
                dialogueStringToken = this.advance();
            } else if (this.check(TokenType.NEWLINE) &&
                       this.currentTokenIndex + 1 < this.tokens.length &&
                       this.tokens[this.currentTokenIndex + 1].type === TokenType.STRING) {
                this.advance(); // Consume NEWLINE
                dialogueStringToken = this.advance(); // Consume STRING
            }

            if (dialogueStringToken) {
                const textNode = this.parseStringLiteral(dialogueStringToken);
                const preserve = dialogueStringToken.meta.isPreserved || false;
                return new DialogueStatementNode(null, textNode, preserve, idToken.location);
            } else {
                throw this.error(idToken, "Expected string after '_' for narration.");
            }
        }

        // Case 2: Identifier speaker (could be dialogue or function call)
        // idToken.type === TokenType.IDENTIFIER

        // Check for dialogue pattern: IDENTIFIER NEWLINE STRING
        if (this.check(TokenType.NEWLINE) &&
            this.currentTokenIndex + 1 < this.tokens.length &&
            this.tokens[this.currentTokenIndex + 1].type === TokenType.STRING) {

            // Before consuming, ensure the string isn't followed by more args on its line.
            // This is a rare edge case (e.g., identifier NEWLINE "string" arg2),
            // but good to be aware. For now, assume `identifier NEWLINE string` is dialogue
            // if the string is the last significant part of its line.
            // A robust check would peek after the STRING token.
            // For simplicity, we'll assume this pattern is dialogue.
            
            this.advance(); // Consume NEWLINE
            const dialogueStringToken = this.advance(); // Consume STRING

            const speakerNode = new IdentifierNode(idToken.value, idToken.location);
            const textNode = this.parseStringLiteral(dialogueStringToken);
            const preserve = dialogueStringToken.meta.isPreserved || false;
            return new DialogueStatementNode(speakerNode, textNode, preserve, idToken.location);
        }

        // Check for dialogue pattern: IDENTIFIER STRING (followed by newline/end-of-statement)
        if (this.check(TokenType.STRING)) {
            const stringTokenCandidate = this.tokens[this.currentTokenIndex]; // Peek, don't consume yet

            // Look ahead to see if this string is the *only* thing after the identifier on this line
            // (i.e., followed by NEWLINE, EOF, DEDENT, INDENT, COLON)
            let isLikelyDialogue = false;
            if (this.currentTokenIndex + 1 < this.tokens.length) {
                const tokenAfterString = this.tokens[this.currentTokenIndex + 1];
                if ([TokenType.NEWLINE, TokenType.EOF, TokenType.DEDENT, TokenType.INDENT, TokenType.COLON].includes(tokenAfterString.type)) {
                    isLikelyDialogue = true;
                }
            } else { // String is the very last token in the input
                isLikelyDialogue = true;
            }

            if (isLikelyDialogue) {
                this.advance(); // Consume the STRING token (stringTokenCandidate)
                const speakerNode = new IdentifierNode(idToken.value, idToken.location);
                const textNode = this.parseStringLiteral(stringTokenCandidate);
                const preserve = stringTokenCandidate.meta.isPreserved || false;
                return new DialogueStatementNode(speakerNode, textNode, preserve, idToken.location);
            }
            // If not isLikelyDialogue, it means `IDENTIFIER STRING arg2 ...`, so it's a function call.
            // Fall through to function call parsing. The STRING will be parsed as the first argument.
        }

        // If none of the dialogue patterns matched definitively, assume it's a function call.
        // The current token is the first argument, or NEWLINE if it's a call like `funcName NEWLINE`.
        const funcNameNode = new IdentifierNode(idToken.value, idToken.location);
        const args = [];
        while (!this.check(TokenType.NEWLINE) && !this.isAtEnd() &&
               !this.check(TokenType.DEDENT) && !this.check(TokenType.INDENT) &&
               !this.check(TokenType.COLON)) { // Stop before colon for if/else
            const argLocation = this.getLocation();
            if (this.check(TokenType.NAMED_ARG_PREFIX)) {
                this.consume(TokenType.NAMED_ARG_PREFIX, "Expected '--' for named argument.");
                const argName = this.parseIdentifier();
                const argValue = this.parseExpression();
                args.push(new NamedArgumentNode(argName, argValue, argLocation));
            } else {
                const argValue = this.parseExpression();
                args.push(argValue);
            }
        }
        return new FunctionCallNode(funcNameNode, args, idToken.location);
    }

    /**
     * Parses an expression. Handles operator precedence.
     * @returns {ASTNode}
     */
    parseExpression() {
        return this.parseAssignmentExpression();
    }

    /**
     * Parses assignment expressions ($var = val or var = val in expression context).
     * @returns {ASTNode}
     */
    parseAssignmentExpression() {
        const location = this.getLocation();
        let expr = this.parseEqualityExpression();

        if (this.check(TokenType.EQUALS)) {
            this.advance(); 
            const value = this.parseAssignmentExpression();

            if (expr.type !== ASTType.IDENTIFIER) {
                 throw this.error(expr, "Invalid assignment target. Left side of assignment expression must be a plain identifier.");
            }
            return new VariableAssignmentNode(expr, value, location);
        }
        return expr;
    }

    /**
     * Parses equality expressions (expr == expr).
     * @returns {ASTNode}
     */
     parseEqualityExpression() {
         let expr = this.parsePrimaryExpression();
         while (this.check(TokenType.EQUALS_EQUALS)) {
             const operatorToken = this.advance();
             const right = this.parsePrimaryExpression();
             expr = new BinaryExpressionNode(expr, operatorToken.value, right, expr.location);
         }
         return expr;
     }

    /**
     * Parses primary expressions (literals, identifiers, (), [], {}).
     * @returns {ASTNode}
     */
     parsePrimaryExpression() {
         const token = this.peek();
         const location = this.getLocation();

         switch (token.type) {
             case TokenType.STRING:
                 return this.parseStringLiteral(this.advance());
             case TokenType.NUMBER:
             case TokenType.BOOLEAN:
                 this.advance();
                 return new LiteralNode(token.value, location);
             case TokenType.IDENTIFIER:
                 return this.parseIdentifier();
             case TokenType.LBRACKET:
                  return this.parseArrayLiteral();
             case TokenType.LBRACE:
                  return this.parseObjectLiteral();
             case TokenType.LPAREN:
                  this.consume(TokenType.LPAREN, "Expected '(' for grouping.");
                  const expr = this.parseExpression();
                  this.consume(TokenType.RPAREN, "Expected ')' after grouped expression.");
                  return expr;
             case TokenType.DOLLAR:
                  throw this.error(token, "Unexpected '$' in expression. Variables are referenced by name only (e.g., 'varName', not '$varName').");
            default:
                 throw this.error(token, `Unexpected token type ${token.type} ('${token.value}') while parsing primary expression.`);
         }
     }

    /**
     * Parses an Identifier token.
     * @returns {IdentifierNode}
     */
    parseIdentifier() {
        const token = this.consume(TokenType.IDENTIFIER, "Expected identifier.");
        return new IdentifierNode(token.value, token.location);
    }

    /**
     * Parses a STRING token, handling ${...} interpolation.
     * @param {Token} stringToken - The STRING token from the lexer.
     * @returns {LiteralNode|InterpolatedStringNode}
     */
     parseStringLiteral(stringToken) {
         const value = stringToken.value;
         const location = stringToken.location;
         const parts = [];
         let lastIndex = 0;
         const interpolationRegex = /\$\{(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*)\}/g;

         let match;
         while ((match = interpolationRegex.exec(value)) !== null) {
             if (match.index > lastIndex) {
                 parts.push(new LiteralNode(value.substring(lastIndex, match.index), location));
             }
             const varName = match[1].trim();
             parts.push(new IdentifierNode(varName, location));
             lastIndex = interpolationRegex.lastIndex;
         }

         if (lastIndex < value.length) {
             parts.push(new LiteralNode(value.substring(lastIndex), location));
         }

         if (parts.length === 0) {
            return new LiteralNode("", location);
         }
         if (parts.length === 1 && parts[0].type === ASTType.LITERAL) {
             return parts[0];
         } else {
             return new InterpolatedStringNode(parts, location);
         }
     }

    /**
     * Parses an array literal ([ element, ... ]).
     * @returns {ArrayLiteralNode}
     */
    parseArrayLiteral() {
        const location = this.getLocation();
        this.consume(TokenType.LBRACKET, "Expected '[' to start array literal.");
        const elements = [];
        while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
            elements.push(this.parseExpression());
            if (this.check(TokenType.COMMA)) {
                this.consume(TokenType.COMMA, "Expected ',' between array elements.");
                 if(this.check(TokenType.RBRACKET)) break;
            } else if (!this.check(TokenType.RBRACKET)) {
                throw this.error(this.peek(), "Expected ',' or ']' after array element.");
            }
        }
        this.consume(TokenType.RBRACKET, "Expected ']' to end array literal.");
        return new ArrayLiteralNode(elements, location);
    }

    /**
     * Parses an object literal ({ key: value, ... }).
     * @returns {ObjectLiteralNode}
     */
    parseObjectLiteral() {
        const location = this.getLocation();
        this.consume(TokenType.LBRACE, "Expected '{' to start object literal.");
        const properties = {};
        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            const keyToken = this.peek();
            let key;
            if (keyToken.type === TokenType.STRING) {
                 key = this.consume(TokenType.STRING, "Expected string key.").value;
            } else if (keyToken.type === TokenType.IDENTIFIER) {
                 key = this.consume(TokenType.IDENTIFIER, "Expected identifier or string key.").value;
            } else {
                 throw this.error(keyToken, "Object key must be a string or identifier.");
            }
            this.consume(TokenType.COLON, "Expected ':' after object key.");
            properties[key] = this.parseExpression();
            if (this.check(TokenType.COMMA)) {
                this.consume(TokenType.COMMA, "Expected ',' between object properties.");
                 if(this.check(TokenType.RBRACE)) break;
            } else if (!this.check(TokenType.RBRACE)) {
                throw this.error(this.peek(), "Expected ',' or '}' after object property.");
            }
        }
        this.consume(TokenType.RBRACE, "Expected '}' to end object literal.");
        return new ObjectLiteralNode(properties, location);
    }

    // --- Helper Methods ---
    peek() {
        if (this.currentTokenIndex >= this.tokens.length) {
             return this.tokens[this.tokens.length - 1];
        }
        return this.tokens[this.currentTokenIndex];
    }

    advance() {
        if (this.currentTokenIndex < this.tokens.length) {
            this.currentTokenIndex++;
        }
        return this.tokens[this.currentTokenIndex - 1];
    }

    check(type) {
        if (this.isAtEnd() && type !== TokenType.EOF) return false;
        return this.peek().type === type;
    }

    consume(type, message) {
        const token = this.peek();
        if (token.type === type) {
            return this.advance();
        }
        throw this.error(token, message);
    }

    isAtEnd() {
        return this.currentTokenIndex >= this.tokens.length || this.peek().type === TokenType.EOF;
    }

    getLocation() {
        const token = this.peek();
        if (!token) {
            if (this.tokens.length > 0) {
                const lastToken = this.tokens[this.tokens.length -1];
                return { line: lastToken.line, column: lastToken.column + (lastToken.value ? String(lastToken.value).length : 1)};
            }
            return { line: 1, column: 1};
        }
        return { line: token.line, column: token.column };
    }

    error(token, message) {
         const line = token ? token.line : (this.tokens.length > 0 ? this.tokens[this.tokens.length-1].line : 'unknown');
         const column = token ? token.column : (this.tokens.length > 0 ? this.tokens[this.tokens.length-1].column : 'unknown');
        return new Error(`Syntax Error: ${message} (at ${line}:${column}, token: ${token ? token.type : 'N/A'})`);
    }
}

export default Parser;