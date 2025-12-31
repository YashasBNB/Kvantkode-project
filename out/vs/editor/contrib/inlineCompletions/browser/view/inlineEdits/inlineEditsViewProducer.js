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
var InlineEditsViewAndDiffProducer_1;
import { createHotClass } from '../../../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { derived, } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor, } from '../../../../../browser/observableCodeEditor.js';
import { LineRange } from '../../../../../common/core/lineRange.js';
import { Range } from '../../../../../common/core/range.js';
import { SingleTextEdit, TextEdit } from '../../../../../common/core/textEdit.js';
import { TextModelText } from '../../../../../common/model/textModelText.js';
import { InlineEditWithChanges } from './inlineEditWithChanges.js';
import { GhostTextIndicator, InlineEditHost, InlineEditModel } from './inlineEditsModel.js';
import { InlineEditsView } from './inlineEditsView.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
let InlineEditsViewAndDiffProducer = class InlineEditsViewAndDiffProducer extends Disposable {
    static { InlineEditsViewAndDiffProducer_1 = this; }
    // TODO: This class is no longer a diff producer. Rename it or get rid of it
    static { this.hot = createHotClass(InlineEditsViewAndDiffProducer_1); }
    constructor(_editor, _edit, _model, _focusIsInMenu, instantiationService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._model = _model;
        this._focusIsInMenu = _focusIsInMenu;
        this._inlineEdit = derived(this, (reader) => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const inlineEdit = this._edit.read(reader);
            if (!inlineEdit) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            if (!textModel) {
                return undefined;
            }
            const editOffset = model.inlineEditState.get()?.inlineCompletion.updatedEdit.read(reader);
            if (!editOffset) {
                return undefined;
            }
            const offsetEdits = model.inPartialAcceptFlow.read(reader)
                ? [editOffset.edits[0]]
                : editOffset.edits;
            const edits = offsetEdits.map((e) => {
                const innerEditRange = Range.fromPositions(textModel.getPositionAt(e.replaceRange.start), textModel.getPositionAt(e.replaceRange.endExclusive));
                return new SingleTextEdit(innerEditRange, e.newText);
            });
            const diffEdits = new TextEdit(edits);
            const text = new TextModelText(textModel);
            return new InlineEditWithChanges(text, diffEdits, model.primaryPosition.get(), inlineEdit.commands, inlineEdit.inlineCompletion);
        });
        this._inlineEditModel = derived(this, (reader) => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const edit = this._inlineEdit.read(reader);
            if (!edit) {
                return undefined;
            }
            const tabAction = derived(this, (reader) => {
                if (this._editorObs.isFocused.read(reader)) {
                    if (model.tabShouldJumpToInlineEdit.read(reader)) {
                        return InlineEditTabAction.Jump;
                    }
                    if (model.tabShouldAcceptInlineEdit.read(reader)) {
                        return InlineEditTabAction.Accept;
                    }
                }
                return InlineEditTabAction.Inactive;
            });
            return new InlineEditModel(model, edit, tabAction);
        });
        this._inlineEditHost = derived(this, (reader) => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            return new InlineEditHost(model);
        });
        this._ghostTextIndicator = derived(this, (reader) => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const state = model.inlineCompletionState.read(reader);
            if (!state) {
                return undefined;
            }
            const inlineCompletion = state.inlineCompletion;
            if (!inlineCompletion) {
                return undefined;
            }
            if (!inlineCompletion.sourceInlineCompletion.showInlineEditMenu) {
                return undefined;
            }
            const lineRange = LineRange.ofLength(state.primaryGhostText.lineNumber, 1);
            return new GhostTextIndicator(this._editor, model, lineRange, inlineCompletion);
        });
        this._editorObs = observableCodeEditor(this._editor);
        this._register(instantiationService.createInstance(InlineEditsView, this._editor, this._inlineEditHost, this._inlineEditModel, this._ghostTextIndicator, this._focusIsInMenu));
    }
};
InlineEditsViewAndDiffProducer = InlineEditsViewAndDiffProducer_1 = __decorate([
    __param(4, IInstantiationService)
], InlineEditsViewAndDiffProducer);
export { InlineEditsViewAndDiffProducer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3UHJvZHVjZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3UHJvZHVjZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUNOLE9BQU8sR0FHUCxNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRXhHLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTVELElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQStCLFNBQVEs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