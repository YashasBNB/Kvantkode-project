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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdE5vdGVib29rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdE5vdGVib29rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRTdGLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQThCO0lBRzFDLFlBQzRCLGNBQXlDLEVBQ3BELGFBQTZCLEVBQ3JCLHFCQUE2QztRQUxyRCxXQUFNLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQU85QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxjQUFjLENBQUMsMEJBQTBC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