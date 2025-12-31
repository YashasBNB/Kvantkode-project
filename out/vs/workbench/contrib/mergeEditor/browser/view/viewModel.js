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
import { findLast } from '../../../../../base/common/arraysFind.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived, derivedObservableWithWritableCache, observableValue, transaction, } from '../../../../../base/common/observable.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { LineRange } from '../model/lineRange.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
let MergeEditorViewModel = class MergeEditorViewModel extends Disposable {
    constructor(model, inputCodeEditorView1, inputCodeEditorView2, resultCodeEditorView, baseCodeEditorView, showNonConflictingChanges, configurationService, notificationService) {
        super();
        this.model = model;
        this.inputCodeEditorView1 = inputCodeEditorView1;
        this.inputCodeEditorView2 = inputCodeEditorView2;
        this.resultCodeEditorView = resultCodeEditorView;
        this.baseCodeEditorView = baseCodeEditorView;
        this.showNonConflictingChanges = showNonConflictingChanges;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.manuallySetActiveModifiedBaseRange = observableValue(this, { range: undefined, counter: 0 });
        this.attachedHistory = this._register(new AttachedHistory(this.model.resultTextModel));
        this.shouldUseAppendInsteadOfAccept = observableConfigValue('mergeEditor.shouldUseAppendInsteadOfAccept', false, this.configurationService);
        this.counter = 0;
        this.lastFocusedEditor = derivedObservableWithWritableCache(this, (reader, lastValue) => {
            const editors = [
                this.inputCodeEditorView1,
                this.inputCodeEditorView2,
                this.resultCodeEditorView,
                this.baseCodeEditorView.read(reader),
            ];
            const view = editors.find((e) => e && e.isFocused.read(reader));
            return view
                ? { view, counter: this.counter++ }
                : lastValue || { view: undefined, counter: this.counter++ };
        });
        this.baseShowDiffAgainst = derived(this, (reader) => {
            const lastFocusedEditor = this.lastFocusedEditor.read(reader);
            if (lastFocusedEditor.view === this.inputCodeEditorView1) {
                return 1;
            }
            else if (lastFocusedEditor.view === this.inputCodeEditorView2) {
                return 2;
            }
            return undefined;
        });
        this.selectionInBase = derived(this, (reader) => {
            const sourceEditor = this.lastFocusedEditor.read(reader).view;
            if (!sourceEditor) {
                return undefined;
            }
            const selections = sourceEditor.selection.read(reader) || [];
            const rangesInBase = selections.map((selection) => {
                if (sourceEditor === this.inputCodeEditorView1) {
                    return this.model.translateInputRangeToBase(1, selection);
                }
                else if (sourceEditor === this.inputCodeEditorView2) {
                    return this.model.translateInputRangeToBase(2, selection);
                }
                else if (sourceEditor === this.resultCodeEditorView) {
                    return this.model.translateResultRangeToBase(selection);
                }
                else if (sourceEditor === this.baseCodeEditorView.read(reader)) {
                    return selection;
                }
                else {
                    return selection;
                }
            });
            return {
                rangesInBase,
                sourceEditor,
            };
        });
        this.activeModifiedBaseRange = derived(this, (reader) => {
            /** @description activeModifiedBaseRange */
            const focusedEditor = this.lastFocusedEditor.read(reader);
            const manualRange = this.manuallySetActiveModifiedBaseRange.read(reader);
            if (manualRange.counter > focusedEditor.counter) {
                return manualRange.range;
            }
            if (!focusedEditor.view) {
                return;
            }
            const cursorLineNumber = focusedEditor.view.cursorLineNumber.read(reader);
            if (!cursorLineNumber) {
                return undefined;
            }
            const modifiedBaseRanges = this.model.modifiedBaseRanges.read(reader);
            return modifiedBaseRanges.find((r) => {
                const range = this.getRangeOfModifiedBaseRange(focusedEditor.view, r, reader);
                return range.isEmpty
                    ? range.startLineNumber === cursorLineNumber
                    : range.contains(cursorLineNumber);
            });
        });
        this._register(resultCodeEditorView.editor.onDidChangeModelContent((e) => {
            if (this.model.isApplyingEditInResult || e.isRedoing || e.isUndoing) {
                return;
            }
            const baseRangeStates = [];
            for (const change of e.changes) {
                const rangeInBase = this.model.translateResultRangeToBase(Range.lift(change.range));
                const baseRanges = this.model.findModifiedBaseRangesInRange(new LineRange(rangeInBase.startLineNumber, rangeInBase.endLineNumber - rangeInBase.startLineNumber));
                if (baseRanges.length === 1) {
                    const isHandled = this.model.isHandled(baseRanges[0]).get();
                    if (!isHandled) {
                        baseRangeStates.push(baseRanges[0]);
                    }
                }
            }
            if (baseRangeStates.length === 0) {
                return;
            }
            const element = {
                model: this.model,
                redo() {
                    transaction((tx) => {
                        /** @description Mark conflicts touched by manual edits as handled */
                        for (const r of baseRangeStates) {
                            this.model.setHandled(r, true, tx);
                        }
                    });
                },
                undo() {
                    transaction((tx) => {
                        /** @description Mark conflicts touched by manual edits as handled */
                        for (const r of baseRangeStates) {
                            this.model.setHandled(r, false, tx);
                        }
                    });
                },
            };
            this.attachedHistory.pushAttachedHistoryElement(element);
            element.redo();
        }));
    }
    getRangeOfModifiedBaseRange(editor, modifiedBaseRange, reader) {
        if (editor === this.resultCodeEditorView) {
            return this.model.getLineRangeInResult(modifiedBaseRange.baseRange, reader);
        }
        else if (editor === this.baseCodeEditorView.get()) {
            return modifiedBaseRange.baseRange;
        }
        else {
            const input = editor === this.inputCodeEditorView1 ? 1 : 2;
            return modifiedBaseRange.getInputRange(input);
        }
    }
    setActiveModifiedBaseRange(range, tx) {
        this.manuallySetActiveModifiedBaseRange.set({ range, counter: this.counter++ }, tx);
    }
    setState(baseRange, state, tx, inputNumber) {
        this.manuallySetActiveModifiedBaseRange.set({ range: baseRange, counter: this.counter++ }, tx);
        this.model.setState(baseRange, state, inputNumber, tx);
        this.lastFocusedEditor.clearCache(tx);
    }
    goToConflict(getModifiedBaseRange) {
        let editor = this.lastFocusedEditor.get().view;
        if (!editor) {
            editor = this.resultCodeEditorView;
        }
        const curLineNumber = editor.editor.getPosition()?.lineNumber;
        if (curLineNumber === undefined) {
            return;
        }
        const modifiedBaseRange = getModifiedBaseRange(editor, curLineNumber);
        if (modifiedBaseRange) {
            const range = this.getRangeOfModifiedBaseRange(editor, modifiedBaseRange, undefined);
            editor.editor.focus();
            let startLineNumber = range.startLineNumber;
            let endLineNumberExclusive = range.endLineNumberExclusive;
            if (range.startLineNumber > editor.editor.getModel().getLineCount()) {
                transaction((tx) => {
                    this.setActiveModifiedBaseRange(modifiedBaseRange, tx);
                });
                startLineNumber = endLineNumberExclusive = editor.editor.getModel().getLineCount();
            }
            editor.editor.setPosition({
                lineNumber: startLineNumber,
                column: editor.editor.getModel().getLineFirstNonWhitespaceColumn(startLineNumber),
            });
            editor.editor.revealLinesNearTop(startLineNumber, endLineNumberExclusive, 0 /* ScrollType.Smooth */);
        }
    }
    goToNextModifiedBaseRange(predicate) {
        this.goToConflict((e, l) => this.model.modifiedBaseRanges
            .get()
            .find((r) => predicate(r) && this.getRangeOfModifiedBaseRange(e, r, undefined).startLineNumber > l) || this.model.modifiedBaseRanges.get().find((r) => predicate(r)));
    }
    goToPreviousModifiedBaseRange(predicate) {
        this.goToConflict((e, l) => findLast(this.model.modifiedBaseRanges.get(), (r) => predicate(r) &&
            this.getRangeOfModifiedBaseRange(e, r, undefined).endLineNumberExclusive < l) || findLast(this.model.modifiedBaseRanges.get(), (r) => predicate(r)));
    }
    toggleActiveConflict(inputNumber) {
        const activeModifiedBaseRange = this.activeModifiedBaseRange.get();
        if (!activeModifiedBaseRange) {
            this.notificationService.error(localize('noConflictMessage', 'There is currently no conflict focused that can be toggled.'));
            return;
        }
        transaction((tx) => {
            /** @description Toggle Active Conflict */
            this.setState(activeModifiedBaseRange, this.model.getState(activeModifiedBaseRange).get().toggle(inputNumber), tx, inputNumber);
        });
    }
    acceptAll(inputNumber) {
        transaction((tx) => {
            /** @description Toggle Active Conflict */
            for (const range of this.model.modifiedBaseRanges.get()) {
                this.setState(range, this.model.getState(range).get().withInputValue(inputNumber, true), tx, inputNumber);
            }
        });
    }
};
MergeEditorViewModel = __decorate([
    __param(6, IConfigurationService),
    __param(7, INotificationService)
], MergeEditorViewModel);
export { MergeEditorViewModel };
class AttachedHistory extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this.attachedHistory = [];
        this.previousAltId = this.model.getAlternativeVersionId();
        this._register(model.onDidChangeContent((e) => {
            const currentAltId = model.getAlternativeVersionId();
            if (e.isRedoing) {
                for (const item of this.attachedHistory) {
                    if (this.previousAltId < item.altId && item.altId <= currentAltId) {
                        item.element.redo();
                    }
                }
            }
            else if (e.isUndoing) {
                for (let i = this.attachedHistory.length - 1; i >= 0; i--) {
                    const item = this.attachedHistory[i];
                    if (currentAltId < item.altId && item.altId <= this.previousAltId) {
                        item.element.undo();
                    }
                }
            }
            else {
                // The user destroyed the redo stack by performing a non redo/undo operation.
                // Thus we also need to remove all history elements after the last version id.
                while (this.attachedHistory.length > 0 &&
                    this.attachedHistory[this.attachedHistory.length - 1].altId > this.previousAltId) {
                    this.attachedHistory.pop();
                }
            }
            this.previousAltId = currentAltId;
        }));
    }
    /**
     * Pushes an history item that is tied to the last text edit (or an extension of it).
     * When the last text edit is undone/redone, so is is this history item.
     */
    pushAttachedHistoryElement(element) {
        this.attachedHistory.push({ altId: this.model.getAlternativeVersionId(), element });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L3ZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixPQUFPLEVBQ1Asa0NBQWtDLEVBSWxDLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQU9qRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQU1yRyxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFRbkQsWUFDaUIsS0FBdUIsRUFDdkIsb0JBQXlDLEVBQ3pDLG9CQUF5QyxFQUN6QyxvQkFBMEMsRUFDMUMsa0JBQStELEVBQy9ELHlCQUErQyxFQUN4QyxvQkFBNEQsRUFDN0QsbUJBQTBEO1FBRWhGLEtBQUssRUFBRSxDQUFBO1FBVFMsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFDdkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFxQjtRQUN6Qyx5QkFBb0IsR0FBcEIsb0JBQW9C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