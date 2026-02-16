/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SelectionClipboard_1;
import * as nls from '../../../../nls.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import { registerEditorContribution, EditorAction, registerEditorAction, } from '../../../../editor/browser/editorExtensions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { SelectionClipboardContributionID } from '../browser/selectionClipboard.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Event } from '../../../../base/common/event.js';
import { addDisposableListener, onDidRegisterWindow } from '../../../../base/browser/dom.js';
let SelectionClipboard = class SelectionClipboard extends Disposable {
    static { SelectionClipboard_1 = this; }
    static { this.SELECTION_LENGTH_LIMIT = 65536; }
    constructor(editor, clipboardService) {
        super();
        if (platform.isLinux) {
            let isEnabled = editor.getOption(112 /* EditorOption.selectionClipboard */);
            this._register(editor.onDidChangeConfiguration((e) => {
                if (e.hasChanged(112 /* EditorOption.selectionClipboard */)) {
                    isEnabled = editor.getOption(112 /* EditorOption.selectionClipboard */);
                }
            }));
            const setSelectionToClipboard = this._register(new RunOnceScheduler(() => {
                if (!editor.hasModel()) {
                    return;
                }
                const model = editor.getModel();
                let selections = editor.getSelections();
                selections = selections.slice(0);
                selections.sort(Range.compareRangesUsingStarts);
                let resultLength = 0;
                for (const sel of selections) {
                    if (sel.isEmpty()) {
                        // Only write if all cursors have selection
                        return;
                    }
                    resultLength += model.getValueLengthInRange(sel);
                }
                if (resultLength > SelectionClipboard_1.SELECTION_LENGTH_LIMIT) {
                    // This is a large selection!
                    // => do not write it to the selection clipboard
                    return;
                }
                const result = [];
                for (const sel of selections) {
                    result.push(model.getValueInRange(sel, 0 /* EndOfLinePreference.TextDefined */));
                }
                const textToCopy = result.join(model.getEOL());
                clipboardService.writeText(textToCopy, 'selection');
            }, 100));
            this._register(editor.onDidChangeCursorSelection((e) => {
                if (!isEnabled) {
                    return;
                }
                if (e.source === 'restoreState') {
                    // do not set selection to clipboard if this selection change
                    // was caused by restoring editors...
                    return;
                }
                setSelectionToClipboard.schedule();
            }));
        }
    }
    dispose() {
        super.dispose();
    }
};
SelectionClipboard = SelectionClipboard_1 = __decorate([
    __param(1, IClipboardService)
], SelectionClipboard);
export { SelectionClipboard };
let LinuxSelectionClipboardPastePreventer = class LinuxSelectionClipboardPastePreventer extends Disposable {
    static { this.ID = 'workbench.contrib.linuxSelectionClipboardPastePreventer'; }
    constructor(configurationService) {
        super();
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(addDisposableListener(window.document, 'mouseup', (e) => {
                if (e.button === 1) {
                    // middle button
                    const config = configurationService.getValue('editor');
                    if (!config.selectionClipboard) {
                        // selection clipboard is disabled
                        // try to stop the upcoming paste
                        e.preventDefault();
                    }
                }
            }));
        }, { window: mainWindow, disposables: this._store }));
    }
};
LinuxSelectionClipboardPastePreventer = __decorate([
    __param(0, IConfigurationService)
], LinuxSelectionClipboardPastePreventer);
class PasteSelectionClipboardAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.selectionClipboardPaste',
            label: nls.localize2('actions.pasteSelectionClipboard', 'Paste Selection Clipboard'),
            precondition: EditorContextKeys.writable,
        });
    }
    async run(accessor, editor, args) {
        const clipboardService = accessor.get(IClipboardService);
        // read selection clipboard
        const text = await clipboardService.readText('selection');
        editor.trigger('keyboard', "paste" /* Handler.Paste */, {
            text: text,
            pasteOnNewLine: false,
            multicursorText: null,
        });
    }
}
registerEditorContribution(SelectionClipboardContributionID, SelectionClipboard, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to listen to selection change events
if (platform.isLinux) {
    registerWorkbenchContribution2(LinuxSelectionClipboardPastePreventer.ID, LinuxSelectionClipboardPastePreventer, 2 /* WorkbenchPhase.BlockRestore */); // eager because it listens to mouse-up events globally
    registerEditorAction(PasteSelectionClipboardAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9uQ2xpcGJvYXJkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2VsZWN0cm9uLXNhbmRib3gvc2VsZWN0aW9uQ2xpcGJvYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBRS9ELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsWUFBWSxFQUVaLG9CQUFvQixHQUVwQixNQUFNLGdEQUFnRCxDQUFBO0FBTXZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUcvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRixPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMs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