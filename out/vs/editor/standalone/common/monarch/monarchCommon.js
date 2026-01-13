/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*
 * This module exports common types and functionality shared between
 * the Monarch compiler that compiles JSON to ILexer, and the Monarch
 * Tokenizer (that highlights at runtime)
 */
/*
 * Type definitions to be used internally to Monarch.
 * Inside monarch we use fully typed definitions and compiled versions of the more abstract JSON descriptions.
 */
export var MonarchBracket;
(function (MonarchBracket) {
    MonarchBracket[MonarchBracket["None"] = 0] = "None";
    MonarchBracket[MonarchBracket["Open"] = 1] = "Open";
    MonarchBracket[MonarchBracket["Close"] = -1] = "Close";
})(MonarchBracket || (MonarchBracket = {}));
export function isFuzzyActionArr(what) {
    return Array.isArray(what);
}
export function isFuzzyAction(what) {
    return !isFuzzyActionArr(what);
}
export function isString(what) {
    return typeof what === 'string';
}
export function isIAction(what) {
    return !isString(what);
}
// Small helper functions
/**
 * Is a string null, undefined, or empty?
 */
export function empty(s) {
    return s ? false : true;
}
/**
 * Puts a string to lower case if 'ignoreCase' is set.
 */
export function fixCase(lexer, str) {
    return lexer.ignoreCase && str ? str.toLowerCase() : str;
}
/**
 * Ensures there are no bad characters in a CSS token class.
 */
export function sanitize(s) {
    return s.replace(/[&<>'"_]/g, '-'); // used on all output token CSS classes
}
// Logging
/**
 * Logs a message.
 */
export function log(lexer, msg) {
    console.log(`${lexer.languageId}: ${msg}`);
}
// Throwing errors
export function createError(lexer, msg) {
    return new Error(`${lexer.languageId}: ${msg}`);
}
// Helper functions for rule finding and substitution
/**
 * substituteMatches is used on lexer strings and can substitutes predefined patterns:
 * 		$$  => $
 * 		$#  => id
 * 		$n  => matched entry n
 * 		@attr => contents of lexer[attr]
 *
 * See documentation for more info
 */
export function substituteMatches(lexer, str, id, matches, state) {
    const re = /\$((\$)|(#)|(\d\d?)|[sS](\d\d?)|@(\w+))/g;
    let stateMatches = null;
    return str.replace(re, function (full, sub, dollar, hash, n, s, attr, ofs, total) {
        if (!empty(dollar)) {
            return '$'; // $$
        }
        if (!empty(hash)) {
            return fixCase(lexer, id); // default $#
        }
        if (!empty(n) && n < matches.length) {
            return fixCase(lexer, matches[n]); // $n
        }
        if (!empty(attr) && lexer && typeof lexer[attr] === 'string') {
            return lexer[attr]; //@attribute
        }
        if (stateMatches === null) {
            // split state on demand
            stateMatches = state.split('.');
            stateMatches.unshift(state);
        }
        if (!empty(s) && s < stateMatches.length) {
            return fixCase(lexer, stateMatches[s]); //$Sn
        }
        return '';
    });
}
/**
 * substituteMatchesRe is used on lexer regex rules and can substitutes predefined patterns:
 * 		$Sn => n'th part of state
 *
 */
export function substituteMatchesRe(lexer, str, state) {
    const re = /\$[sS](\d\d?)/g;
    let stateMatches = null;
    return str.replace(re, function (full, s) {
        if (stateMatches === null) {
            // split state on demand
            stateMatches = state.split('.');
            stateMatches.unshift(state);
        }
        if (!empty(s) && s < stateMatches.length) {
            return fixCase(lexer, stateMatches[s]); //$Sn
        }
        return '';
    });
}
/**
 * Find the tokenizer rules for a specific state (i.e. next action)
 */
export function findRules(lexer, inState) {
    let state = inState;
    while (state && state.length > 0) {
        const rules = lexer.tokenizer[state];
        if (rules) {
            return rules;
        }
        const idx = state.lastIndexOf('.');
        if (idx < 0) {
            state = null; // no further parent
        }
        else {
            state = state.substr(0, idx);
        }
    }
    return null;
}
/**
 * Is a certain state defined? In contrast to 'findRules' this works on a ILexerMin.
 * This is used during compilation where we may know the defined states
 * but not yet whether the corresponding rules are correct.
 */
export function stateExists(lexer, inState) {
    let state = inState;
    while (state && state.length > 0) {
        const exist = lexer.stateNames[state];
        if (exist) {
            return true;
        }
        const idx = state.lastIndexOf('.');
        if (idx < 0) {
            state = null; // no further parent
        }
        else {
            state = state.substr(0, idx);
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaENvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvY29tbW9uL21vbmFyY2gvbW9uYXJjaENvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7OztHQUlHO0FBRUg7OztHQUdHO0FBRUgsTUFBTSxDQUFOLElBQWtCLGNBSWpCO0FBSkQsV0FBa0IsY0FBYztJQUMvQixtREFBUSxDQUFBO0lBQ1IsbURBQVEsQ0FBQTtJQUNSLHNEQUFVLENBQUE7QUFDWCxDQUFDLEVBSmlCLGNBQWMsS0FBZCxjQUFjLFFBSS9CO0FBaUNELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFpQztJQUNqRSxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDM0IsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsSUFBaUM7SUFDOUQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO0FBQy9CLENBQUM7QUFFRCxNQUFNLFVBQVUsUUFBUSxDQUFDLElBQWlCO0lBQ3pDLE9BQU8sT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFBO0FBQ2hDLENBQUM7QUFFRCxNQUFNLFVBQVUsU0FBUyxDQUFDLElBQWlCO0lBQzFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDdkIsQ0FBQztBQWtDRCx5QkFBeUI7QUFFekI7O0dBRUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUFDLENBQVM7SUFDOUIsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0FBQ3hCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxPQUFPLENBQUMsS0FBZ0IsRUFBRSxHQUFXO0lB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