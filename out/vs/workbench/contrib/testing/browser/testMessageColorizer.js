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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE1lc3NhZ2VDb2xvcml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdE1lc3NhZ2VDb2xvcml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFdEYsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsa0JBQWtCLEVBQ2xCLHFCQUFxQixHQUNyQixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sa0NBQWtDLENBQUE7QUFFekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUvRCxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQTtBQUV2QyxJQUFXLE9BUVY7QUFSRCxXQUFXLE9BQU87SUFDakIsbUNBQXdCLENBQUE7SUFDeEIsK0NBQXdDLENBQUE7SUFDeEMsK0NBQXdDLENBQUE7SUFDeEMsa0NBQTJCLENBQUE7SUFDM0IsbUNBQTRCLENBQUE7SUFDNUIsb0NBQTZCLENBQUE7SUFDN0IsdUNBQWdDLENBQUE7QUFDakMsQ0FBQyxFQVJVLE9BQU8sS0FBUCxPQUFPLFFBUWpCO0FBRUQsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxFQUE0QixFQUFFLEVBQUUsQ0FDdkUsT0FBTyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLENBQUE7QUFFakY7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLENBQzFDLE9BQWUsRUFDZixNQUF3QixFQUNWLEVBQUU7SUFDaEIsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFBO0lBRTFCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1FBQzNDLElBQUksS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5QixJQUFJLEdBQUcsR0FBYSxFQUFFLENBQUE7UUFDdEIsS0FBSyxNQUFNLElBQUksSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2hELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNqQixNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNqRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2hCLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNiLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUNmLENBQUM7cUJBQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7b0JBQ3JCLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLHdDQUFpQixJQUFJLENBQUMsMENBQW1CLENBQUMsQ0FBQTtnQkFDcEUsQ0FBQztxQkFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztvQkFDckIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsMENBQW1CLENBQUMsQ0FBQTtnQkFDOUMsQ0FBQztxQkFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztvQkFDckIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsNkNBQXNCLENBQUMsQ0FBQTtnQkFDakQsQ0FBQztxQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUN6RCxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxrREFBMEIsQ0FBQyxDQUFBO29CQUNoRSxHQUFHLENBQUMsSUFBSSxDQUFDLG1EQUEyQixTQUFTLENBQUMsQ0FBQTtnQkFDL0MsQ0FBQztxQkFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMzRCxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxrREFBMEIsQ0FBQyxDQUFBO29CQUNoRSxHQUFHLENBQUMsSUFBSSxDQUFDLG1EQUEyQixTQUFTLENBQUMsQ0FBQTtnQkFDL0MsQ0FBQztxQkFBTSxDQUFDO29CQUNQLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUNBQWlCLFNBQVMsQ0FBQyxDQUFBO2dCQUNyQyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUE7Z0JBQzNCLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7Z0JBRXRCLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNoRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQztvQkFDdkUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO3dCQUMxQixJQUFJLEVBQUUsQ0FBQTt3QkFDTixHQUFHLEdBQUcsQ0FBQyxDQUFBO29CQUNSLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxHQUFHLEVBQUUsQ0FBQTtvQkFDTixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUNuQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDaEIsS0FBSyxDQUFDLElBQUksQ0FDVCxjQUFjLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFO3dCQUM3RCxlQUFlLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7d0JBQzlCLFdBQVcsRUFBRSx3QkFBd0I7cUJBQ3JDLENBQUMsQ0FDRixDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtBQUMzRCxDQUFDLENBQUEifQ==