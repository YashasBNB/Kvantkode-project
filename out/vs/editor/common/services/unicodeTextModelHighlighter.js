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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy91bmljb2RlVGV4dE1vZGVsSGlnaGxpZ2h0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFMUUsTUFBTSxPQUFPLDJCQUEyQjtJQUNoQyxNQUFNLENBQUMsd0JBQXdCLENBQ3JDLEtBQXNDLEVBQ3RDLE9BQWtDLEVBQ2xDLEtBQWM7UUFFZCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUVsRSxNQUFNLG9CQUFvQixHQUFHLElBQUksb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFOUQsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUNoRSxJQUFJLEtBQWEsQ0FBQTtRQUNqQixJQUFJLFVBQVUsS0FBSyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3ZDLEtBQUssR0FBRyxJQUFJLE1BQU0sQ0FBQyx5QkFB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