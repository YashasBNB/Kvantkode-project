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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9uQ2xpcGJvYXJkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9lbGVjdHJvbi1zYW5kYm94L3NlbGVjdGlvbkNsaXBib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLFlBQVksRUFFWixvQkFBb0IsR0FFcEIsTUFBTSxnREFBZ0QsQ0FBQTtBQU12RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkYsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFckYsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVOzthQUN6QiwyQkFBc0IsR0FBRyxLQUFLLEFBQVIsQ0FBUTtJQUV0RCxZQUFZLE1BQW1CLEVBQXFCLGdCQUFtQztRQUN0RixLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLElBQUksU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLDJDQUFpQyxDQUFBO1lBRWpFLElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBNEIsRUFBRSxFQUFFO2dCQUNoRSxJQUFJLENBQUMsQ0FBQyxVQUFVLDJDQUFpQyxFQUFFLENBQUM7b0JBQ25ELFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUywyQ0FBaUMsQ0FBQTtnQkFDOUQsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzdDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO2dCQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7b0JBQ3hCLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQy9CLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQTtnQkFDdkMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7Z0JBRS9DLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQTtnQkFDcEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQzt3QkFDbkIsMkNBQTJDO3dCQUMzQyxPQUFNO29CQUNQLENBQUM7b0JBQ0QsWUFBWSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDakQsQ0FBQztnQkFFRCxJQUFJLFlBQVksR0FBRyxvQkFBa0IsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO29CQUM5RCw2QkFBNkI7b0JBQzdCLGdEQUFnRDtvQkFDaEQsT0FBTTtnQkFDUCxDQUFDO2dCQUVELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtnQkFDM0IsS0FBSyxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsMENBQWtDLENBQUMsQ0FBQTtnQkFDekUsQ0FBQztnQkFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO2dCQUM5QyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ3BELENBQUMsRUFBRSxHQUFHLENBQUMsQ0FDUCxDQUFBO1lBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUErQixFQUFFLEVBQUU7Z0JBQ3JFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDaEIsT0FBTTtnQkFDUCxDQUFDO2dCQUNELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxjQUFjLEVBQUUsQ0FBQztvQkFDakMsNkRBQTZEO29CQUM3RCxxQ0FBcUM7b0JBQ3JDLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNuQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDOztBQXRFVyxrQkFBa0I7SUFHSSxXQUFBLGlCQUFpQixDQUFBO0dBSHZDLGtCQUFrQixDQXVFOUI7O0FBRUQsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBc0MsU0FBUSxVQUFVO2FBQzdDLE9BQUUsR0FBRyx5REFBeUQsQUFBNUQsQ0FBNEQ7SUFFOUUsWUFBbUMsb0JBQTJDO1FBQzdFLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsZUFBZSxDQUNwQixtQkFBbUIsRUFDbkIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFO1lBQzNCLFdBQVcsQ0FBQyxHQUFHLENBQ2QscUJBQXFCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDdkQsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNwQixnQkFBZ0I7b0JBQ2hCLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FDM0MsUUFBUSxDQUNSLENBQUE7b0JBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO3dCQUNoQyxrQ0FBa0M7d0JBQ2xDLGlDQUFpQzt3QkFDakMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO29CQUNuQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQyxFQUNELEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUNoRCxDQUNELENBQUE7SUFDRixDQUFDOztBQTdCSSxxQ0FBcUM7SUFHN0IsV0FBQSxxQkFBcUIsQ0FBQTtHQUg3QixxQ0FBcUMsQ0E4QjFDO0FBRUQsTUFBTSw2QkFBOEIsU0FBUSxZQUFZO0lBQ3ZEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVDQUF1QztZQUMzQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsRUFBRSwyQkFBMkIsQ0FBQztZQUNwRixZQUFZLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtTQUN4QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CLEVBQUUsSUFBUztRQUMxRSxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUV4RCwyQkFBMkI7UUFDM0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFekQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLCtCQUFpQjtZQUN6QyxJQUFJLEVBQUUsSUFBSTtZQUNWLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLGVBQWUsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELDBCQUEwQixDQUN6QixnQ0FBZ0MsRUFDaEMsa0JBQWtCLGdEQUVsQixDQUFBLENBQUMsOERBQThEO0FBQ2hFLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3RCLDhCQUE4QixDQUM3QixxQ0FBcUMsQ0FBQyxFQUFFLEVBQ3hDLHFDQUFxQyxzQ0FFckMsQ0FBQSxDQUFDLHVEQUF1RDtJQUN6RCxvQkFBb0IsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO0FBQ3BELENBQUMifQ==