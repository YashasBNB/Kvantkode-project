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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZEhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3dvcmRIZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFL0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsbUNBQW1DLENBQUE7QUFvQnhFOzs7Ozs7R0FNRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsZUFBdUIsRUFBRTtJQUNsRCxJQUFJLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQTtJQUNyQyxLQUFLLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixFQUFFLENBQUM7UUFDekMsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3BDLFNBQVE7UUFDVCxDQUFDO1FBQ0QsTUFBTSxJQUFJLElBQUksR0FBRyxHQUFHLENBQUE7SUFDckIsQ0FBQztJQUNELE1BQU0sSUFBSSxRQUFRLENBQUE7SUFDbEIsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDL0IsQ0FBQztBQUVELDhGQUE4RjtBQUM5RixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO0FBRXJELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxjQUE4QjtJQUN2RSxJQUFJLE1BQU0sR0FBVyxtQkFBbUIsQ0FBQTtJQUV4QyxJQUFJLGNBQWMsSUFBSSxjQUFjLFlBQVksTUFBTSxFQUFFLENBQUM7UUFD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