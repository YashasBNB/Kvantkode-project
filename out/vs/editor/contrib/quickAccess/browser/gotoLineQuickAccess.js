/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { getCodeEditor } from '../../../browser/editorBrowser.js';
import { AbstractEditorNavigationQuickAccessProvider, } from './editorNavigationQuickAccess.js';
import { localize } from '../../../../nls.js';
export class AbstractGotoLineQuickAccessProvider extends AbstractEditorNavigationQuickAccessProvider {
    static { this.PREFIX = ':'; }
    constructor() {
        super({ canAcceptInBackground: true });
    }
    provideWithoutTextEditor(picker) {
        const label = localize('cannotRunGotoLine', 'Open a text editor first to go to a line.');
        picker.items = [{ label }];
        picker.ariaLabel = label;
        return Disposable.None;
    }
    provideWithTextEditor(context, picker, token) {
        const editor = context.editor;
        const disposables = new DisposableStore();
        // Goto line once picked
        disposables.add(picker.onDidAccept((event) => {
            const [item] = picker.selectedItems;
            if (item) {
                if (!this.isValidLineNumber(editor, item.lineNumber)) {
                    return;
                }
                this.gotoLocation(context, {
                    range: this.toRange(item.lineNumber, item.column),
                    keyMods: picker.keyMods,
                    preserveFocus: event.inBackground,
                });
                if (!event.inBackground) {
                    picker.hide();
                }
            }
        }));
        // React to picker changes
        const updatePickerAndEditor = () => {
            const position = this.parsePosition(editor, picker.value.trim().substr(AbstractGotoLineQuickAccessProvider.PREFIX.length));
            const label = this.getPickLabel(editor, position.lineNumber, position.column);
            // Picker
            picker.items = [
                {
                    lineNumber: position.lineNumber,
                    column: position.column,
                    label,
                },
            ];
            // ARIA Label
            picker.ariaLabel = label;
            // Clear decorations for invalid range
            if (!this.isValidLineNumber(editor, position.lineNumber)) {
                this.clearDecorations(editor);
                return;
            }
            // Reveal
            const range = this.toRange(position.lineNumber, position.column);
            editor.revealRangeInCenter(range, 0 /* ScrollType.Smooth */);
            // Decorate
            this.addDecorations(editor, range);
        };
        updatePickerAndEditor();
        disposables.add(picker.onDidChangeValue(() => updatePickerAndEditor()));
        // Adjust line number visibility as needed
        const codeEditor = getCodeEditor(editor);
        if (codeEditor) {
            const options = codeEditor.getOptions();
            const lineNumbers = options.get(69 /* EditorOption.lineNumbers */);
            if (lineNumbers.renderType === 2 /* RenderLineNumbersType.Relative */) {
                codeEditor.updateOptions({ lineNumbers: 'on' });
                disposables.add(toDisposable(() => codeEditor.updateOptions({ lineNumbers: 'relative' })));
            }
        }
        return disposables;
    }
    toRange(lineNumber = 1, column = 1) {
        return {
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column,
        };
    }
    parsePosition(editor, value) {
        // Support line-col formats of `line,col`, `line:col`, `line#col`
        const numbers = value
            .split(/,|:|#/)
            .map((part) => parseInt(part, 10))
            .filter((part) => !isNaN(part));
        const endLine = this.lineCount(editor) + 1;
        return {
            lineNumber: numbers[0] > 0 ? numbers[0] : endLine + numbers[0],
            column: numbers[1],
        };
    }
    getPickLabel(editor, lineNumber, column) {
        // Location valid: indicate this as picker label
        if (this.isValidLineNumber(editor, lineNumber)) {
            if (this.isValidColumn(editor, lineNumber, column)) {
                return localize('gotoLineColumnLabel', 'Go to line {0} and character {1}.', lineNumber, column);
            }
            return localize('gotoLineLabel', 'Go to line {0}.', lineNumber);
        }
        // Location invalid: show generic label
        const position = editor.getPosition() || { lineNumber: 1, column: 1 };
        const lineCount = this.lineCount(editor);
        if (lineCount > 1) {
            return localize('gotoLineLabelEmptyWithLimit', 'Current Line: {0}, Character: {1}. Type a line number between 1 and {2} to navigate to.', position.lineNumber, position.column, lineCount);
        }
        return localize('gotoLineLabelEmpty', 'Current Line: {0}, Character: {1}. Type a line number to navigate to.', position.lineNumber, position.column);
    }
    isValidLineNumber(editor, lineNumber) {
        if (!lineNumber || typeof lineNumber !== 'number') {
            return false;
        }
        return lineNumber > 0 && lineNumber <= this.lineCount(editor);
    }
    isValidColumn(editor, lineNumber, column) {
        if (!column || typeof column !== 'number') {
            return false;
        }
        const model = this.getModel(editor);
        if (!model) {
            return false;
        }
        const positionCandidate = { lineNumber, column };
        return model.validatePosition(positionCandidate).equals(positionCandidate);
    }
    lineCount(editor) {
        return this.getModel(editor)?.getLineCount() ?? 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0xpbmVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3F1aWNrQWNjZXNzL2Jyb3dzZXIvZ290b0xpbmVRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFLakUsT0FBTyxFQUNOLDJDQUEyQyxHQUUzQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUs3QyxNQUFNLE9BQWdCLG1DQUFvQyxTQUFRLDJDQUEyQzthQUNyRyxXQUFNLEdBQUcsR0FBRyxDQUFBO0lBRW5CO1FBQ0MsS0FBSyxDQUFDLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRVMsd0JBQXdCLENBQ2pDLE1BQW1FO1FBRW5FLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFBO1FBRXhGLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDMUIsTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUE7UUFFeEIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFUyxxQkFBcUIsQ0FDOUIsT0FBc0MsRUFDdEMsTUFBbUUsRUFDbkUsS0FBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUM3QixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXpDLHdC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