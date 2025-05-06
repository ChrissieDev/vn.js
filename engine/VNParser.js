/**
 * Experimental parser for the .vns format
 */

export default class VNParser {
    constructor() {}

    run(string = '') {
        const preprocessedResult = this.#preprocess(string);
        const parsedCommandTree = this.#parse(preprocessedResult);
    }

    #preprocess(string = '') {

    }

    #parse(string = '') {

    }

    /**
     * A deeply nested tree of tokens, each node represents a context for what token came before, and what tokens may come after.
     * This gets messy quickly, but it it's the formal definition of the grammar.
     * After a leaf, the parser will point back to the root of the tree to reset the context.
     * 
     * r(...) - Match the regex and branch into the next object with the matched value. If it doesn't match, throw a parse error.
     * (...)s - Store the value of the regex match.
     * (¤) - Interpolate the value of the previous stored value into the regular expression to match.
     */
    syntaxTree = {
        // add actor to scene from preexisting project definition
        "r(actor)": {
            "r( )": {
                // actor name
                "r(\w+)s": {
                    "r(\n)": {
                    
                    },
                },
                // actor name\n
                "r(\w+$)": {

                }
            }
        },
        "r(if)": {
            "r( )": {
            
            }
        },
        "r(else)": {
            "r( )": {
            
            }
        },
    }
}