/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../base/common/iterator.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
export const USUAL_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';
/**
 * Create a word definition regular expression based on default word separators.
 * Optionally provide allowed separators that should be included in words.
 *
 * The default would look like this:
 * /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
 */
function createWordRegExp(allowInWords = '') {
    let source = '(-?\\d*\\.\\d\\w*)|([^';
    for (const sep of USUAL_WORD_SEPARATORS) {
        if (allowInWords.indexOf(sep) >= 0) {
            continue;
        }
        source += '\\' + sep;
    }
    source += '\\s]+)';
    return new RegExp(source, 'g');
}
// catches numbers (including floating numbers) in the first group, and alphanum in the second
export const DEFAULT_WORD_REGEXP = createWordRegExp();
export function ensureValidWordDefinition(wordDefinition) {
    let result = DEFAULT_WORD_REGEXP;
    if (wordDefinition && wordDefinition instanceof RegExp) {
        if (!wordDefinition.global) {
            let flags = 'g';
            if (wordDefinition.ignoreCase) {
                flags += 'i';
            }
            if (wordDefinition.multiline) {
                flags += 'm';
            }
            if (wordDefinition.unicode) {
                flags += 'u';
            }
            result = new RegExp(wordDefinition.source, flags);
        }
        else {
            result = wordDefinition;
        }
    }
    result.lastIndex = 0;
    return result;
}
const _defaultConfig = new LinkedList();
_defaultConfig.unshift({
    maxLen: 1000,
    windowSize: 15,
    timeBudget: 150,
});
export function setDefaultGetWordAtTextConfig(value) {
    const rm = _defaultConfig.unshift(value);
    return toDisposable(rm);
}
export function getWordAtText(column, wordDefinition, text, textOffset, config) {
    // Ensure the regex has the 'g' flag, otherwise this will loop forever
    wordDefinition = ensureValidWordDefinition(wordDefinition);
    if (!config) {
        config = Iterable.first(_defaultConfig);
    }
    if (text.length > config.maxLen) {
        // don't throw strings that long at the regexp
        // but use a sub-string in which a word must occur
        let start = column - config.maxLen / 2;
        if (start < 0) {
            start = 0;
        }
        else {
            textOffset += start;
        }
        text = text.substring(start, column + config.maxLen / 2);
        return getWordAtText(column, wordDefinition, text, textOffset, config);
    }
    const t1 = Date.now();
    const pos = column - 1 - textOffset;
    let prevRegexIndex = -1;
    let match = null;
    for (let i = 1;; i++) {
        // check time budget
        if (Date.now() - t1 >= config.timeBudget) {
            break;
        }
        // reset the index at which the regexp should start matching, also know where it
        // should stop so that subsequent search don't repeat previous searches
        const regexIndex = pos - config.windowSize * i;
        wordDefinition.lastIndex = Math.max(0, regexIndex);
        const thisMatch = _findRegexMatchEnclosingPosition(wordDefinition, text, pos, prevRegexIndex);
        if (!thisMatch && match) {
            // stop: we have something
            break;
        }
        match = thisMatch;
        // stop: searched at start
        if (regexIndex <= 0) {
            break;
        }
        prevRegexIndex = regexIndex;
    }
    if (match) {
        const result = {
            word: match[0],
            startColumn: textOffset + 1 + match.index,
            endColumn: textOffset + 1 + match.index + match[0].length,
        };
        wordDefinition.lastIndex = 0;
        return result;
    }
    return null;
}
function _findRegexMatchEnclosingPosition(wordDefinition, text, pos, stopPos) {
    let match;
    while ((match = wordDefinition.exec(text))) {
        const matchIndex = match.index || 0;
        if (matchIndex <= pos && wordDefinition.lastIndex >= pos) {
            return match;
        }
        else if (stopPos > 0 && matchIndex > stopPos) {
            return null;
        }
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZEhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS93b3JkSGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRS9ELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLG1DQUFtQyxDQUFBO0FBb0J4RTs7Ozs7O0dBTUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLGVBQXVCLEVBQUU7SUFDbEQsSUFBSSxNQUFNLEdBQUcsd0JBQXdCLENBQUE7SUFDckMsS0FBSyxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1FBQ3pDLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxTQUFRO1FBQ1QsQ0FBQztRQUNELE1BQU0sSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFBO0lBQ3JCLENBQUM7SUFDRCxNQUFNLElBQUksUUFBUSxDQUFBO0lBQ2xCLE9BQU8sSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQy9CLENBQUM7QUFFRCw4RkFBOEY7QUFDOUYsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQTtBQUVyRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsY0FBOEI7SUFDdkUsSUFBSSxNQUFNLEdBQVcsbUJBQW1CLENBQUE7SUFFeEMsSUFBSSxjQUFjLElBQUksY0FBYyxZQUFZLE1BQU0sRUFBRSxDQUFDO1FBQ3hELElBQUksQ0FBQyxjQUFjLENBQUMs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