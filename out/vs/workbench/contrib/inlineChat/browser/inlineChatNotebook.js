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
import { illegalState } from '../../../../base/common/errors.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { InlineChatController } from './inlineChatController.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { NotebookTextDiffEditor } from '../../notebook/browser/diff/notebookDiffEditor.js';
import { NotebookMultiTextDiffEditor } from '../../notebook/browser/diff/notebookMultiDiffEditor.js';
let InlineChatNotebookContribution = class InlineChatNotebookContribution {
    constructor(sessionService, editorService, notebookEditorService) {
        this._store = new DisposableStore();
        this._store.add(sessionService.registerSessionKeyComputer(Schemas.vscodeNotebookCell, {
            getComparisonKey: (editor, uri) => {
                const data = CellUri.parse(uri);
                if (!data) {
                    throw illegalState('Expected notebook cell uri');
                }
                let fallback;
                for (const notebookEditor of notebookEditorService.listNotebookEditors()) {
                    if (notebookEditor.hasModel() && isEqual(notebookEditor.textModel.uri, data.notebook)) {
                        const candidate = `<notebook>${notebookEditor.getId()}#${uri}`;
                        if (!fallback) {
                            fallback = candidate;
                        }
                        // find the code editor in the list of cell-code editors
                        if (notebookEditor.codeEditors.find((tuple) => tuple[1] === editor)) {
                            return candidate;
                        }
                        // 	// reveal cell and try to find code editor again
                        // 	const cell = notebookEditor.getCellByHandle(data.handle);
                        // 	if (cell) {
                        // 		notebookEditor.revealInViewAtTop(cell);
                        // 		if (notebookEditor.codeEditors.find((tuple) => tuple[1] === editor)) {
                        // 			return candidate;
                        // 		}
                        // 	}
                    }
                }
                if (fallback) {
                    return fallback;
                }
                const activeEditor = editorService.activeEditorPane;
                if (activeEditor &&
                    (activeEditor.getId() === NotebookTextDiffEditor.ID ||
                        activeEditor.getId() === NotebookMultiTextDiffEditor.ID)) {
                    return `<notebook>${editor.getId()}#${uri}`;
                }
                throw illegalState('Expected notebook editor');
            },
        }));
        this._store.add(sessionService.onWillStartSession((newSessionEditor) => {
            const candidate = CellUri.parse(newSessionEditor.getModel().uri);
            if (!candidate) {
                return;
            }
            for (const notebookEditor of notebookEditorService.listNotebookEditors()) {
                if (isEqual(notebookEditor.textModel?.uri, candidate.notebook)) {
                    let found = false;
                    const editors = [];
                    for (const [, codeEditor] of notebookEditor.codeEditors) {
                        editors.push(codeEditor);
                        found = codeEditor === newSessionEditor || found;
                    }
                    if (found) {
                        // found the this editor in the outer notebook editor -> make sure to
                        // cancel all sibling sessions
                        for (const editor of editors) {
                            if (editor !== newSessionEditor) {
                                InlineChatController.get(editor)?.acceptSession();
                            }
                        }
                        break;
                    }
                }
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
InlineChatNotebookContribution = __decorate([
    __param(0, IInlineChatSessionService),
    __param(1, IEditorService),
    __param(2, INotebookEditorService)
], InlineChatNotebookContribution);
export { InlineChatNotebookContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdE5vdGVib29rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXROb3RlYm9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUU3RixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUE4QjtJQUcxQyxZQUM0QixjQUF5QyxFQUNwRCxhQUE2QixFQUNyQixxQkFBNkM7UUFMckQsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFPOUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2QsY0FBYyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxrQkFBa0Is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