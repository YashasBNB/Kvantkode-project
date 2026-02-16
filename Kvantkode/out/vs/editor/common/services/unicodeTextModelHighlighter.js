/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
import { Searcher } from '../model/textModelSearch.js';
import * as strings from '../../../base/common/strings.js';
import { assertNever } from '../../../base/common/assert.js';
import { DEFAULT_WORD_REGEXP, getWordAtText } from '../core/wordHelper.js';
export class UnicodeTextModelHighlighter {
    static computeUnicodeHighlights(model, options, range) {
        const startLine = range ? range.startLineNumber : 1;
        const endLine = range ? range.endLineNumber : model.getLineCount();
        const codePointHighlighter = new CodePointHighlighter(options);
        const candidates = codePointHighlighter.getCandidateCodePoints();
        let regex;
        if (candidates === 'allNonBasicAscii') {
            regex = new RegExp('[^\\t\\n\\r\\x20-\\x7E]', 'g');
        }
        else {
            regex = new RegExp(`${buildRegExpCharClassExpr(Array.from(candidates))}`, 'g');
        }
        const searcher = new Searcher(null, regex);
        const ranges = [];
        let hasMore = false;
        let m;
        let ambiguousCharacterCount = 0;
        let invisibleCharacterCount = 0;
        let nonBasicAsciiCharacterCount = 0;
        forLoop: for (let lineNumber = startLine, lineCount = endLine; lineNumber <= lineCount; lineNumber++) {
            const lineContent = model.getLineContent(lineNumber);
            const lineLength = lineContent.length;
            // Reset regex to search from the beginning
            searcher.reset(0);
            do {
                m = searcher.next(lineContent);
                if (m) {
                    let startIndex = m.index;
                    let endIndex = m.index + m[0].length;
                    // Extend range to entire code point
                    if (startIndex > 0) {
                        const charCodeBefore = lineContent.charCodeAt(startIndex - 1);
                        if (strings.isHighSurrogate(charCodeBefore)) {
                            startIndex--;
                        }
                    }
                    if (endIndex + 1 < lineLength) {
                        const charCodeBefore = lineContent.charCodeAt(endIndex - 1);
                        if (strings.isHighSurrogate(charCodeBefore)) {
                            endIndex++;
                        }
                    }
                    const str = lineContent.substring(startIndex, endIndex);
                    let word = getWordAtText(startIndex + 1, DEFAULT_WORD_REGEXP, lineContent, 0);
                    if (word && word.endColumn <= startIndex + 1) {
                        // The word does not include the problematic character, ignore the word
                        word = null;
                    }
                    const highlightReason = codePointHighlighter.shouldHighlightNonBasicASCII(str, word ? word.word : null);
                    if (highlightReason !== 0 /* SimpleHighlightReason.None */) {
                        if (highlightReason === 3 /* SimpleHighlightReason.Ambiguous */) {
                            ambiguousCharacterCount++;
                        }
                        else if (highlightReason === 2 /* SimpleHighlightReason.Invisible */) {
                            invisibleCharacterCount++;
                        }
                        else if (highlightReason === 1 /* SimpleHighlightReason.NonBasicASCII */) {
                            nonBasicAsciiCharacterCount++;
                        }
                        else {
                            assertNever(highlightReason);
                        }
                        const MAX_RESULT_LENGTH = 1000;
                        if (ranges.length >= MAX_RESULT_LENGTH) {
                            hasMore = true;
                            break forLoop;
                        }
                        ranges.push(new Range(lineNumber, startIndex + 1, lineNumber, endIndex + 1));
                    }
                }
            } while (m);
        }
        return {
            ranges,
            hasMore,
            ambiguousCharacterCount,
            invisibleCharacterCount,
            nonBasicAsciiCharacterCount,
        };
    }
    static computeUnicodeHighlightReason(char, options) {
        const codePointHighlighter = new CodePointHighlighter(options);
        const reason = codePointHighlighter.shouldHighlightNonBasicASCII(char, null);
        switch (reason) {
            case 0 /* SimpleHighlightReason.None */:
                return null;
            case 2 /* SimpleHighlightReason.Invisible */:
                return { kind: 1 /* UnicodeHighlighterReasonKind.Invisible */ };
            case 3 /* SimpleHighlightReason.Ambiguous */: {
                const codePoint = char.codePointAt(0);
                const primaryConfusable = codePointHighlighter.ambiguousCharacters.getPrimaryConfusable(codePoint);
                const notAmbiguousInLocales = strings.AmbiguousCharacters.getLocales().filter((l) => !strings.AmbiguousCharacters.getInstance(new Set([...options.allowedLocales, l])).isAmbiguous(codePoint));
                return {
                    kind: 0 /* UnicodeHighlighterReasonKind.Ambiguous */,
                    confusableWith: String.fromCodePoint(primaryConfusable),
                    notAmbiguousInLocales,
                };
            }
            case 1 /* SimpleHighlightReason.NonBasicASCII */:
                return { kind: 2 /* UnicodeHighlighterReasonKind.NonBasicAscii */ };
        }
    }
}
function buildRegExpCharClassExpr(codePoints, flags) {
    const src = `[${strings.escapeRegExpCharacters(codePoints.map((i) => String.fromCodePoint(i)).join(''))}]`;
    return src;
}
export var UnicodeHighlighterReasonKind;
(function (UnicodeHighlighterReasonKind) {
    UnicodeHighlighterReasonKind[UnicodeHighlighterReasonKind["Ambiguous"] = 0] = "Ambiguous";
    UnicodeHighlighterReasonKind[UnicodeHighlighterReasonKind["Invisible"] = 1] = "Invisible";
    UnicodeHighlighterReasonKind[UnicodeHighlighterReasonKind["NonBasicAscii"] = 2] = "NonBasicAscii";
})(UnicodeHighlighterReasonKind || (UnicodeHighlighterReasonKind = {}));
class CodePointHighlighter {
    constructor(options) {
        this.options = options;
        this.allowedCodePoints = new Set(options.allowedCodePoints);
        this.ambiguousCharacters = strings.AmbiguousCharacters.getInstance(new Set(options.allowedLocales));
    }
    getCandidateCodePoints() {
        if (this.options.nonBasicASCII) {
            return 'allNonBasicAscii';
        }
        const set = new Set();
        if (this.options.invisibleCharacters) {
            for (const cp of strings.InvisibleCharacters.codePoints) {
                if (!isAllowedInvisibleCharacter(String.fromCodePoint(cp))) {
                    set.add(cp);
                }
            }
        }
        if (this.options.ambiguousCharacters) {
            for (const cp of this.ambiguousCharacters.getConfusableCodePoints()) {
                set.add(cp);
            }
        }
        for (const cp of this.allowedCodePoints) {
            set.delete(cp);
        }
        return set;
    }
    shouldHighlightNonBasicASCII(character, wordContext) {
        const codePoint = character.codePointAt(0);
        if (this.allowedCodePoints.has(codePoint)) {
            return 0 /* SimpleHighlightReason.None */;
        }
        if (this.options.nonBasicASCII) {
            return 1 /* SimpleHighlightReason.NonBasicASCII */;
        }
        let hasBasicASCIICharacters = false;
        let hasNonConfusableNonBasicAsciiCharacter = false;
        if (wordContext) {
            for (const char of wordContext) {
                const codePoint = char.codePointAt(0);
                const isBasicASCII = strings.isBasicASCII(char);
                hasBasicASCIICharacters = hasBasicASCIICharacters || isBasicASCII;
                if (!isBasicASCII &&
                    !this.ambiguousCharacters.isAmbiguous(codePoint) &&
                    !strings.InvisibleCharacters.isInvisibleCharacter(codePoint)) {
                    hasNonConfusableNonBasicAsciiCharacter = true;
                }
            }
        }
        if (
        /* Don't allow mixing weird looking characters with ASCII */ !hasBasicASCIICharacters &&
            /* Is there an obviously weird looking character? */ hasNonConfusableNonBasicAsciiCharacter) {
            return 0 /* SimpleHighlightReason.None */;
        }
        if (this.options.invisibleCharacters) {
            // TODO check for emojis
            if (!isAllowedInvisibleCharacter(character) &&
                strings.InvisibleCharacters.isInvisibleCharacter(codePoint)) {
                return 2 /* SimpleHighlightReason.Invisible */;
            }
        }
        if (this.options.ambiguousCharacters) {
            if (this.ambiguousCharacters.isAmbiguous(codePoint)) {
                return 3 /* SimpleHighlightReason.Ambiguous */;
            }
        }
        return 0 /* SimpleHighlightReason.None */;
    }
}
function isAllowedInvisibleCharacter(character) {
    return character === ' ' || character === '\n' || character === '\t';
}
var SimpleHighlightReason;
(function (SimpleHighlightReason) {
    SimpleHighlightReason[SimpleHighlightReason["None"] = 0] = "None";
    SimpleHighlightReason[SimpleHighlightReason["NonBasicASCII"] = 1] = "NonBasicASCII";
    SimpleHighlightReason[SimpleHighlightReason["Invisible"] = 2] = "Invisible";
    SimpleHighlightReason[SimpleHighlightReason["Ambiguous"] = 3] = "Ambiguous";
})(SimpleHighlightReason || (SimpleHighlightReason = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3VuaWNvZGVUZXh0TW9kZWxIaWdobGlnaHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDaEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3RELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFFMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxhQUFhLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUUxRSxNQUFNLE9BQU8sMkJBQTJCO0lBQ2hDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FDckMsS0FBc0MsRUFDdEMsT0FBa0MsRUFDbEMsS0FBYztRQUVkLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRWxFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUU5RCxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQ2hFLElBQUksS0FBYSxDQUFBO1FBQ2pCLElBQUksVUFBVSxLQUFLLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsS0FBSyxH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