// vns\Lexer.js
// Lexer.js
import { TokenType, Token } from './Token.js';

/**
 * Lexer for the DSL. Converts source code string into a stream of tokens.
 */
export class Lexer {
    /**
     * @param {string} input - The source code string.
     */
    constructor(input) {
        this.input = input;
        this.lines = this.preprocess(input);
        this.tokens = [];
        this.currentLineIndex = 0;
        this.currentColumn = 0; // Column within the *original* line (before substring)
        this.indentStack = [0]; // Stack of expected indent levels based on column number of first non-whitespace char
        this.indentSize = 4; // Assumed 4 spaces per indent level

        // Track the current character index within the *current line string*
        this.currentCharIndexInLine = 0;
    }

    /**
     * Removes comments and trims whitespace from lines.
     * @param {string} input - The raw input string.
     * @returns {string[]} An array of processed lines.
     */
    preprocess(input) {
        const lines = input.split('\n');
        return lines.map(line => {
            // Remove comments (;; ...)
            const commentIndex = line.indexOf(';;');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex);
            }
            // Trim trailing whitespace after comment removal
            line = line.trimEnd();
            return line;
        }).filter(line => line.trim() !== ''); // Remove entirely empty or comment-only lines
    }

    /**
     * Tokenizes the input string.
     * @returns {Token[]} An array of tokens.
     * @throws {Error} If inconsistent indentation is found.
     */
    tokenize() {
        while (this.currentLineIndex < this.lines.length) {
            const currentLineString = this.lines[this.currentLineIndex]; // Use currentLineString locally for clarity
            this.currentColumn = 1; // Start of line is column 1
            this.currentCharIndexInLine = 0; // Start at the beginning of the new line string

            // Handle indentation *before* processing line content
            // Find the column index of the first non-whitespace character or end of string
            const indent = currentLineString.search(/\S|$/);
            const currentIndentLevel = this.indentStack[this.indentStack.length - 1];

            if (indent > currentIndentLevel) {
                // Increased indentation
                 // Check if the increase is a multiple of the indent size
                if ((indent - currentIndentLevel) % this.indentSize !== 0) {
                     throw new Error(`Line ${this.getLineNumber()}: Inconsistent indentation. Expected indentation level to be a multiple of ${this.indentSize} spaces greater than the previous level (${currentIndentLevel}), but got ${indent} spaces.`);
                }
                this.tokens.push(new Token(TokenType.INDENT, null, this.getLineNumber(), 1));
                this.indentStack.push(indent);
            } else if (indent < currentIndentLevel) {
                 // Decreased indentation (dedent)
                 while (indent < this.indentStack[this.indentStack.length - 1]) {
                    this.indentStack.pop();
                     // Validate if the new indentation level matches a previous one
                     if (indent > this.indentStack[this.indentStack.length - 1] && this.indentStack.length > 0) { 
                          throw new Error(`Line ${this.getLineNumber()}: Inconsistent indentation. Indentation ${indent} does not match any previous indentation level ${this.indentStack}.`);
                     }
                    // The DEDENT token conceptually ends a block, its location can be approximate
                    this.tokens.push(new Token(TokenType.DEDENT, null, this.getLineNumber(), indent + 1));
                }
                 // After popping, the new indentation must exactly match the new top of stack
                 if (indent !== this.indentStack[this.indentStack.length - 1]) {
                     throw new Error(`Line ${this.getLineNumber()}: Inconsistent indentation. Indentation ${indent} does not match any previous indentation level ${this.indentStack}.`);
                 }
            }
            // If indent === currentIndentLevel, no indent/dedent token is needed

            // Update column pointer to the start of the line content (after indent)
            this.currentColumn += indent;
            this.currentCharIndexInLine = indent;

            // Tokenize the rest of the line content
            // Pass lineNumber for error reporting, but internally use this.currentLineIndex for line data
            this.tokenizeLineContent(this.getLineNumber()); 

            // Add NEWLINE token at the end of the line (before moving to the next line)
            // Only add NEWLINE if the line wasn't empty after indent (i.e., content was processed or should have been)
            if (currentLineString.length > indent) { 
                this.tokens.push(new Token(TokenType.NEWLINE, null, this.getLineNumber(), currentLineString.length + 1));
            }


            // Move to the next line
            this.currentLineIndex++;
        }

        // After processing all lines, add DEDENT tokens for any remaining open indent levels
        while (this.indentStack.length > 1) {
            this.indentStack.pop();
            // Approximate location for these final DEDENTs
            const lastLineNumber = this.lines.length > 0 ? this.lines.length : 1;
            // Ensure lines array is not empty before accessing last element
            const lastColumn = this.lines.length > 0 && this.lines[this.lines.length - 1] ? this.lines[this.lines.length - 1].length + 1 : 1;
            this.tokens.push(new Token(TokenType.DEDENT, null, lastLineNumber, lastColumn));
        }

        // Add EOF token
        // Ensure currentLineIndex is valid for EOF location if all lines were empty
        const eofLineNumber = this.lines.length > 0 ? this.lines.length : 1;
        const eofCol = this.lines.length > 0 && this.lines[this.lines.length - 1] ? this.lines[this.lines.length - 1].length + 1 : 1;
        this.tokens.push(new Token(TokenType.EOF, null, eofLineNumber, eofCol)); 
        return this.tokens;
    }

    /**
     * Tokenizes the content of a single line after indentation has been handled.
     * Relies on this.currentLineIndex and this.currentCharIndexInLine.
     * @param {number} lineNumberForError - The current line number for error reporting.
     * @throws {Error} If an unexpected character is found.
     */
    tokenizeLineContent(lineNumberForError) { 
        while (this.currentLineIndex < this.lines.length && this.currentCharIndexInLine < this.lines[this.currentLineIndex].length) {
            const line = this.lines[this.currentLineIndex]; 
            const char = line[this.currentCharIndexInLine]; 

            if (/\s/.test(char)) {
                this.currentCharIndexInLine++;
                this.currentColumn++;
                continue;
            }

            if (line.substring(this.currentCharIndexInLine, this.currentCharIndexInLine + 3) === '==>') {
                 this.tokens.push(new Token(TokenType.ARROW, '==>', lineNumberForError, this.currentColumn));
                 this.currentCharIndexInLine += 3;
                 this.currentColumn += 3;
                 continue;
            }

            if (line.substring(this.currentCharIndexInLine, this.currentCharIndexInLine + 2) === '==') {
                 this.tokens.push(new Token(TokenType.EQUALS_EQUALS, '==', lineNumberForError, this.currentColumn));
                 this.currentCharIndexInLine += 2;
                 this.currentColumn += 2;
                 continue;
            }

            if (line.substring(this.currentCharIndexInLine, this.currentCharIndexInLine + 2) === '--') {
                this.tokens.push(new Token(TokenType.NAMED_ARG_PREFIX, '--', lineNumberForError, this.currentColumn));
                this.currentCharIndexInLine += 2;
                this.currentColumn += 2;
                continue;
            }

            if (char === '=') { this.tokens.push(new Token(TokenType.EQUALS, '=', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === '$') { this.tokens.push(new Token(TokenType.DOLLAR, '$', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === '_') { this.tokens.push(new Token(TokenType.UNDERSCORE, '_', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === '[') { this.tokens.push(new Token(TokenType.LBRACKET, '[', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === ']') { this.tokens.push(new Token(TokenType.RBRACKET, ']', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === '{') { this.tokens.push(new Token(TokenType.LBRACE, '{', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === '}') { this.tokens.push(new Token(TokenType.RBRACE, '}', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === ':') { this.tokens.push(new Token(TokenType.COLON, ':', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === ',') { this.tokens.push(new Token(TokenType.COMMA, ',', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === '(') { this.tokens.push(new Token(TokenType.LPAREN, '(', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }
            if (char === ')') { this.tokens.push(new Token(TokenType.RPAREN, ')', lineNumberForError, this.currentColumn)); this.currentCharIndexInLine++; this.currentColumn++; continue; }

            const isTripleQuote = line.substring(this.currentCharIndexInLine, this.currentCharIndexInLine + 3) === '"""';
            const isPreservedTripleQuote = line.substring(this.currentCharIndexInLine, this.currentCharIndexInLine + 4) === 'p"""';

            if (char === '"' || char === "'" || isPreservedTripleQuote || isTripleQuote) {
                 const stringStartColumn = this.currentColumn; 
                 const stringStartLineNumber = lineNumberForError; 

                 let isPreserved = false;
                 let quoteChar;
                 let isTriple = false;
                 let openingQuoteLength = 0;


                 if (isPreservedTripleQuote) {
                     isPreserved = true;
                     quoteChar = '"""';
                     isTriple = true;
                     openingQuoteLength = 4; 
                 } else if (isTripleQuote) {
                     quoteChar = '"""';
                     isTriple = true;
                     openingQuoteLength = 3;
                 } else if (char === '"' || char === "'") {
                     quoteChar = char; 
                     isTriple = false;
                     openingQuoteLength = 1;
                 } else {
                      throw new Error(`Line ${stringStartLineNumber}: Internal lexer error processing string.`);
                 }

                 this.currentCharIndexInLine += openingQuoteLength;
                 this.currentColumn += openingQuoteLength;


                 let stringContent = '';
                 let closed = false;
                 let lineScanIndex = this.currentLineIndex;
                 let charScanIndexInLine = this.currentCharIndexInLine;


                 while (lineScanIndex < this.lines.length) {
                     const currentScanLineContent = this.lines[lineScanIndex];
                     const searchStartIndexOnThisScanLine = (lineScanIndex === this.currentLineIndex) ? charScanIndexInLine : 0;
                     const closeIndexInScanLine = currentScanLineContent.indexOf(quoteChar, searchStartIndexOnThisScanLine);

                     if (closeIndexInScanLine !== -1) {
                         stringContent += currentScanLineContent.substring(searchStartIndexOnThisScanLine, closeIndexInScanLine);

                         this.currentLineIndex = lineScanIndex; 
                         this.currentCharIndexInLine = closeIndexInScanLine + quoteChar.length; 
                         const endingLineIndent = this.lines[this.currentLineIndex].search(/\S|$/);
                         this.currentColumn = endingLineIndent + this.currentCharIndexInLine +1; 


                         closed = true;
                         break; 
                     } else {
                         stringContent += currentScanLineContent.substring(searchStartIndexOnThisScanLine);
                         if (isTriple) {
                             stringContent += '\n'; 
                         } else {
                              throw new Error(`Line ${stringStartLineNumber}: Unclosed string starting at column ${stringStartColumn}.`);
                         }
                         lineScanIndex++; 
                         charScanIndexInLine = 0; 
                     }
                 }

                 if (!closed) {
                      throw new Error(`Line ${stringStartLineNumber}: Unclosed string starting at column ${stringStartColumn}.`);
                 }

                 const finalStringValue = (isTriple && !isPreserved) ? stringContent.replace(/\s+/g, ' ').trim() : stringContent;
                 const stringToken = new Token(TokenType.STRING, finalStringValue, stringStartLineNumber, stringStartColumn, { isPreserved: isPreserved });
                 this.tokens.push(stringToken);
                 continue;
            }

            const numMatch = line.substring(this.currentCharIndexInLine).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
            if (numMatch) {
                const numLexeme = numMatch[0];
                const numValue = parseFloat(numLexeme);
                this.tokens.push(new Token(TokenType.NUMBER, numValue, lineNumberForError, this.currentColumn));
                this.currentCharIndexInLine += numLexeme.length;
                this.currentColumn += numLexeme.length;
                continue;
            }

            const remainingLine = line.substring(this.currentCharIndexInLine);

            // MODIFIED: Boundary check for booleans and keywords
            if (remainingLine.startsWith('true') && (remainingLine.length === 4 || !/[a-zA-Z0-9_]/.test(remainingLine[4]))) {
                 this.tokens.push(new Token(TokenType.BOOLEAN, true, lineNumberForError, this.currentColumn));
                 this.currentCharIndexInLine += 4;
                 this.currentColumn += 4;
                 continue;
            }
            if (remainingLine.startsWith('false') && (remainingLine.length === 5 || !/[a-zA-Z0-9_]/.test(remainingLine[5]))) {
                 this.tokens.push(new Token(TokenType.BOOLEAN, false, lineNumberForError, this.currentColumn));
                 this.currentCharIndexInLine += 5;
                 this.currentColumn += 5;
                 continue;
            }

            if (remainingLine.startsWith('if') && (remainingLine.length === 2 || !/[a-zA-Z0-9_]/.test(remainingLine[2]))) {
                 this.tokens.push(new Token(TokenType.IF, 'if', lineNumberForError, this.currentColumn));
                 this.currentCharIndexInLine += 2;
                 this.currentColumn += 2;
                 continue;
             }
            if (remainingLine.startsWith('else') && (remainingLine.length === 4 || !/[a-zA-Z0-9_]/.test(remainingLine[4]))) {
                 this.tokens.push(new Token(TokenType.ELSE, 'else', lineNumberForError, this.currentColumn));
                 this.currentCharIndexInLine += 4;
                 this.currentColumn += 4;
                 continue;
            }

            if (/[a-zA-Z_]/.test(char)) {
                const idMatch = remainingLine.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
                if (idMatch) {
                    const identifierName = idMatch[0];
                    this.tokens.push(new Token(TokenType.IDENTIFIER, identifierName, lineNumberForError, this.currentColumn));
                    this.currentCharIndexInLine += identifierName.length;
                    this.currentColumn += identifierName.length;
                    continue;
                }
            }

            throw new Error(`Line ${lineNumberForError}: Unexpected character '${char}' at column ${this.currentColumn}.`);
        }
    }

    /**
     * Gets the current line number (1-based).
     * @returns {number}
     */
     getLineNumber() {
         return this.currentLineIndex + 1;
     }
}

export default Lexer;