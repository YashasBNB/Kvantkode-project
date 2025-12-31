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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaENvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2NvbW1vbi9tb25hcmNoL21vbmFyY2hDb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7R0FJRztBQUVIOzs7R0FHRztBQUVILE1BQU0sQ0FBTixJQUFrQixjQUlqQjtBQUpELFdBQWtCLGNBQWM7SUFDL0IsbURBQVEsQ0FBQTtJQUNSLG1EQUFRLENBQUE7SUFDUixzREFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUppQixjQUFjLEtBQWQsY0FBYyxRQUkvQjtBQWlDRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBaUM7SUFDakUsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQzNCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLElBQWlDO0lBQzlELE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUMvQixDQUFDO0FBRUQsTUFBTSxVQUFVLFFBQVEsQ0FBQyxJQUFpQjtJQUN6QyxPQUFPLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQTtBQUNoQyxDQUFDO0FBRUQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxJQUFpQjtJQUMxQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3ZCLENBQUM7QUFrQ0QseUJBQXlCO0FBRXpCOztHQUVHO0FBQ0gsTUFBTSxVQUFVLEtBQUssQ0FBQyxDQUFTO0lBQzlCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtBQUN4QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsT0FBTyxDQUFDLEtBQWdCLEVBQUUsR0FBVztJQUNwRCxPQUFPLEtBQUssQ0FBQyxVQUFV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