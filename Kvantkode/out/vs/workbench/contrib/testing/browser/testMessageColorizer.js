/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { renderStringAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { GraphemeIterator, forAnsiStringParts, removeAnsiEscapeCodes, } from '../../../../base/common/strings.js';
import './media/testMessageColorizer.css';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
const colorAttrRe = /^\x1b\[([0-9]+)m$/;
var Classes;
(function (Classes) {
    Classes["Prefix"] = "tstm-ansidec-";
    Classes["ForegroundPrefix"] = "tstm-ansidec-fg";
    Classes["BackgroundPrefix"] = "tstm-ansidec-bg";
    Classes["Bold"] = "tstm-ansidec-1";
    Classes["Faint"] = "tstm-ansidec-2";
    Classes["Italic"] = "tstm-ansidec-3";
    Classes["Underline"] = "tstm-ansidec-4";
})(Classes || (Classes = {}));
export const renderTestMessageAsText = (tm) => typeof tm === 'string' ? removeAnsiEscapeCodes(tm) : renderStringAsPlaintext(tm);
/**
 * Applies decorations based on ANSI styles from the test message in the editor.
 * ANSI sequences are stripped from the text displayed in editor, and this
 * re-applies their colorization.
 *
 * This uses decorations rather than language features because the string
 * rendered in the editor lacks the ANSI codes needed to actually apply the
 * colorization.
 *
 * Note: does not support TrueColor.
 */
export const colorizeTestMessageInEditor = (message, editor) => {
    const decos = [];
    editor.changeDecorations((changeAccessor) => {
        let start = new Position(1, 1);
        let cls = [];
        for (const part of forAnsiStringParts(message)) {
            if (part.isCode) {
                const colorAttr = colorAttrRe.exec(part.str)?.[1];
                if (!colorAttr) {
                    continue;
                }
                const n = Number(colorAttr);
                if (n === 0) {
                    cls.length = 0;
                }
                else if (n === 22) {
                    cls = cls.filter((c) => c !== "tstm-ansidec-1" /* Classes.Bold */ && c !== "tstm-ansidec-3" /* Classes.Italic */);
                }
                else if (n === 23) {
                    cls = cls.filter((c) => c !== "tstm-ansidec-3" /* Classes.Italic */);
                }
                else if (n === 24) {
                    cls = cls.filter((c) => c !== "tstm-ansidec-4" /* Classes.Underline */);
                }
                else if ((n >= 30 && n <= 39) || (n >= 90 && n <= 99)) {
                    cls = cls.filter((c) => !c.startsWith("tstm-ansidec-fg" /* Classes.ForegroundPrefix */));
                    cls.push("tstm-ansidec-fg" /* Classes.ForegroundPrefix */ + colorAttr);
                }
                else if ((n >= 40 && n <= 49) || (n >= 100 && n <= 109)) {
                    cls = cls.filter((c) => !c.startsWith("tstm-ansidec-bg" /* Classes.BackgroundPrefix */));
                    cls.push("tstm-ansidec-bg" /* Classes.BackgroundPrefix */ + colorAttr);
                }
                else {
                    cls.push("tstm-ansidec-" /* Classes.Prefix */ + colorAttr);
                }
            }
            else {
                let line = start.lineNumber;
                let col = start.column;
                const graphemes = new GraphemeIterator(part.str);
                for (let i = 0; !graphemes.eol(); i += graphemes.nextGraphemeLength()) {
                    if (part.str[i] === '\n') {
                        line++;
                        col = 1;
                    }
                    else {
                        col++;
                    }
                }
                const end = new Position(line, col);
                if (cls.length) {
                    decos.push(changeAccessor.addDecoration(Range.fromPositions(start, end), {
                        inlineClassName: cls.join(' '),
                        description: 'test-message-colorized',
                    }));
                }
                start = end;
            }
        }
    });
    return toDisposable(() => editor.removeDecorations(decos));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE1lc3NhZ2VDb2xvcml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0TWVzc2FnZUNvbG9yaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV0RixPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEYsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixrQkFBa0IsRUFDbEIscUJBQXFCLEdBQ3JCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRS9ELE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFBO0FBRXZDLElBQVcsT0FRVjtBQVJELFdBQVcsT0FBTztJQUNqQixtQ0FBd0IsQ0FBQTtJQUN4QiwrQ0FBd0MsQ0FBQTtJQUN4QywrQ0FBd0MsQ0FBQTtJQUN4QyxrQ0FBMkIsQ0FBQTtJQUMzQixtQ0FBNEIsQ0FBQTtJQUM1QixvQ0FBNkIsQ0FBQTtJQUM3Qix1Q0FBZ0MsQ0FBQTtBQUNqQyxDQUFDLEVBUlUsT0FBTyxLQUFQLE9BQU8sUUFRakI7QUFFRCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLEVBQTRCLEVBQUUsRUFBRSxDQUN2RSxPQUFPLEVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtBQUVqRjs7Ozs7Ozs7OztHQVVHO0FB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