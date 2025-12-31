/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
export function createMatchers(selector, matchesName, results) {
    const tokenizer = newTokenizer(selector);
    let token = tokenizer.next();
    while (token !== null) {
        let priority = 0;
        if (token.length === 2 && token.charAt(1) === ':') {
            switch (token.charAt(0)) {
                case 'R':
                    priority = 1;
                    break;
                case 'L':
                    priority = -1;
                    break;
                default:
                    console.log(`Unknown priority ${token} in scope selector`);
            }
            token = tokenizer.next();
        }
        const matcher = parseConjunction();
        if (matcher) {
            results.push({ matcher, priority });
        }
        if (token !== ',') {
            break;
        }
        token = tokenizer.next();
    }
    function parseOperand() {
        if (token === '-') {
            token = tokenizer.next();
            const expressionToNegate = parseOperand();
            if (!expressionToNegate) {
                return null;
            }
            return (matcherInput) => {
                const score = expressionToNegate(matcherInput);
                return score < 0 ? 0 : -1;
            };
        }
        if (token === '(') {
            token = tokenizer.next();
            const expressionInParents = parseInnerExpression();
            if (token === ')') {
                token = tokenizer.next();
            }
            return expressionInParents;
        }
        if (isIdentifier(token)) {
            const identifiers = [];
            do {
                identifiers.push(token);
                token = tokenizer.next();
            } while (isIdentifier(token));
            return (matcherInput) => matchesName(identifiers, matcherInput);
        }
        return null;
    }
    function parseConjunction() {
        let matcher = parseOperand();
        if (!matcher) {
            return null;
        }
        const matchers = [];
        while (matcher) {
            matchers.push(matcher);
            matcher = parseOperand();
        }
        return (matcherInput) => {
            // and
            let min = matchers[0](matcherInput);
            for (let i = 1; min >= 0 && i < matchers.length; i++) {
                min = Math.min(min, matchers[i](matcherInput));
            }
            return min;
        };
    }
    function parseInnerExpression() {
        let matcher = parseConjunction();
        if (!matcher) {
            return null;
        }
        const matchers = [];
        while (matcher) {
            matchers.push(matcher);
            if (token === '|' || token === ',') {
                do {
                    token = tokenizer.next();
                } while (token === '|' || token === ','); // ignore subsequent commas
            }
            else {
                break;
            }
            matcher = parseConjunction();
        }
        return (matcherInput) => {
            // or
            let max = matchers[0](matcherInput);
            for (let i = 1; i < matchers.length; i++) {
                max = Math.max(max, matchers[i](matcherInput));
            }
            return max;
        };
    }
}
function isIdentifier(token) {
    return !!token && !!token.match(/[\w\.:]+/);
}
function newTokenizer(input) {
    const regex = /([LR]:|[\w\.:][\w\.:\-]*|[\,\|\-\(\)])/g;
    let match = regex.exec(input);
    return {
        next: () => {
            if (!match) {
                return null;
            }
            const res = match[0];
            match = regex.exec(input);
            return res;
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVTY29wZU1hdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi90ZXh0TWF0ZVNjb3BlTWF0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxZQUFZLENBQUE7QUFXWixNQUFNLFVBQVUsY0FBYyxDQUM3QixRQUFnQixFQUNoQixXQUF5RCxFQUN6RCxPQUFpQztJQUVqQyxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEMsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzVCLE9BQU8sS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3ZCLElBQUksUUFBUSxHQUFlLENBQUMsQ0FBQTtRQUM1QixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDbkQsUUFBUSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLEtBQUssR0FBRztvQkFDUCxRQUFRLEdBQUcsQ0FBQyxDQUFBO29CQUNaLE1BQUs7Z0JBQ04sS0FBSyxHQUFHO29CQUNQLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDYixNQUFLO2dCQUNOO29CQUNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEtBQUssb0JBQW9CLENBQUMsQ0FBQTtZQUM1RCxDQUFDO1lBQ0QsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN6QixDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxD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