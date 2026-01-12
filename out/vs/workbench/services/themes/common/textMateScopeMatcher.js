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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVTY29wZU1hdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL3RleHRNYXRlU2NvcGVNYXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLFlBQVksQ0FBQTtBQVdaLE1BQU0sVUFBVSxjQUFjLENBQzdCLFFBQWdCLEVBQ2hCLFdBQXlELEVBQ3pELE9BQWlDO0lBRWpDLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN4QyxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDNUIsT0FBTyxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDdkIsSUFBSSxRQUFRLEdBQWUsQ0FBQyxDQUFBO1FBQzVCLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNuRCxRQUFRLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsS0FBSyxHQUFHO29CQUNQLFFBQVEsR0FBRyxDQUFDLENBQUE7b0JBQ1osTUFBSztnQkFDTixLQUFLLEdBQUc7b0JBQ1AsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFBO29CQUNiLE1BQUs7Z0JBQ047b0JBQ0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsS0FBSyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzVELENBQUM7WUFDRCxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3pCLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ2xDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixP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