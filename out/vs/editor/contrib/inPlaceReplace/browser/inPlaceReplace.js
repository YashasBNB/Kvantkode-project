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
var InPlaceReplaceController_1;
import { createCancelablePromise, timeout, } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { EditorState } from '../../editorState/browser/editorState.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import * as nls from '../../../../nls.js';
import { InPlaceReplaceCommand } from './inPlaceReplaceCommand.js';
import './inPlaceReplace.css';
let InPlaceReplaceController = class InPlaceReplaceController {
    static { InPlaceReplaceController_1 = this; }
    static { this.ID = 'editor.contrib.inPlaceReplaceController'; }
    static get(editor) {
        return editor.getContribution(InPlaceReplaceController_1.ID);
    }
    static { this.DECORATION = ModelDecorationOptions.register({
        description: 'in-place-replace',
        className: 'valueSetReplacement',
    }); }
    constructor(editor, editorWorkerService) {
        this.editor = editor;
        this.editorWorkerService = editorWorkerService;
        this.decorations = this.editor.createDecorationsCollection();
    }
    dispose() { }
    run(source, up) {
        // cancel any pending request
        this.currentRequest?.cancel();
        const editorSelection = this.editor.getSelection();
        const model = this.editor.getModel();
        if (!model || !editorSelection) {
            return undefined;
        }
        let selection = editorSelection;
        if (selection.startLineNumber !== selection.endLineNumber) {
            // Can't accept multiline selection
            return undefined;
        }
        const state = new EditorState(this.editor, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */);
        const modelURI = model.uri;
        if (!this.editorWorkerService.canNavigateValueSet(modelURI)) {
            return Promise.resolve(undefined);
        }
        this.currentRequest = createCancelablePromise((token) => this.editorWorkerService.navigateValueSet(modelURI, selection, up));
        return this.currentRequest
            .then((result) => {
            if (!result || !result.range || !result.value) {
                // No proper result
                return;
            }
            if (!state.validate(this.editor)) {
                // state has changed
                return;
            }
            // Selection
            const editRange = Range.lift(result.range);
            let highlightRange = result.range;
            const diff = result.value.length - (selection.endColumn - selection.startColumn);
            // highlight
            highlightRange = {
                startLineNumber: highlightRange.startLineNumber,
                startColumn: highlightRange.startColumn,
                endLineNumber: highlightRange.endLineNumber,
                endColumn: highlightRange.startColumn + result.value.length,
            };
            if (diff > 1) {
                selection = new Selection(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn + diff - 1);
            }
            // Insert new text
            const command = new InPlaceReplaceCommand(editRange, selection, result.value);
            this.editor.pushUndoStop();
            this.editor.executeCommand(source, command);
            this.editor.pushUndoStop();
            // add decoration
            this.decorations.set([
                {
                    range: highlightRange,
                    options: InPlaceReplaceController_1.DECORATION,
                },
            ]);
            // remove decoration after delay
            this.decorationRemover?.cancel();
            this.decorationRemover = timeout(350);
            this.decorationRemover.then(() => this.decorations.clear()).catch(onUnexpectedError);
        })
            .catch(onUnexpectedError);
    }
};
InPlaceReplaceController = InPlaceReplaceController_1 = __decorate([
    __param(1, IEditorWorkerService)
], InPlaceReplaceController);
class InPlaceReplaceUp extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inPlaceReplace.up',
            label: nls.localize2('InPlaceReplaceAction.previous.label', 'Replace with Previous Value'),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 87 /* KeyCode.Comma */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        const controller = InPlaceReplaceController.get(editor);
        if (!controller) {
            return Promise.resolve(undefined);
        }
        return controller.run(this.id, false);
    }
}
class InPlaceReplaceDown extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inPlaceReplace.down',
            label: nls.localize2('InPlaceReplaceAction.next.label', 'Replace with Next Value'),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        const controller = InPlaceReplaceController.get(editor);
        if (!controller) {
            return Promise.resolve(undefined);
        }
        return controller.run(this.id, true);
    }
}
registerEditorContribution(InPlaceReplaceController.ID, InPlaceReplaceController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(InPlaceReplaceUp);
registerEditorAction(InPlaceReplaceDown);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5QbGFjZVJlcGxhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pblBsYWNlUmVwbGFjZS9icm93c2VyL2luUGxhY2VSZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLE9BQU8sR0FDUCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJFLE9BQU8sRUFBdUIsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFM0YsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBRTFCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sc0JBQXNCLENBQUE7QUFFN0IsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7O2FBQ04sT0FBRSxHQUFHLHlDQUF5QyxBQUE1QyxDQUE0QztJQUVyRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQzdCLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBMkIsMEJB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