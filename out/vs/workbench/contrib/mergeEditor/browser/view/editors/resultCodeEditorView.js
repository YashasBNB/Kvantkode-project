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
import { reset } from '../../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../../base/browser/ui/actionbar/actionbar.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { CompareResult } from '../../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, } from '../../../../../../base/common/observable.js';
import { OverviewRulerLane, } from '../../../../../../editor/common/model.js';
import { localize } from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { LineRange } from '../../model/lineRange.js';
import { applyObservableDecorations, join } from '../../utils.js';
import { handledConflictMinimapOverViewRulerColor, unhandledConflictMinimapOverViewRulerColor, } from '../colors.js';
import { EditorGutter } from '../editorGutter.js';
import { ctxIsMergeResultEditor } from '../../../common/mergeEditor.js';
import { CodeEditorView, createSelectionsAutorun, TitleMenu } from './codeEditorView.js';
let ResultCodeEditorView = class ResultCodeEditorView extends CodeEditorView {
    constructor(viewModel, instantiationService, _labelService, configurationService) {
        super(instantiationService, viewModel, configurationService);
        this._labelService = _labelService;
        this.decorations = derived(this, (reader) => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const textModel = model.resultTextModel;
            const result = new Array();
            const baseRangeWithStoreAndTouchingDiffs = join(model.modifiedBaseRanges.read(reader), model.baseResultDiffs.read(reader), (baseRange, diff) => baseRange.baseRange.touches(diff.inputRange)
                ? CompareResult.neitherLessOrGreaterThan
                : LineRange.compareByStart(baseRange.baseRange, diff.inputRange));
            const activeModifiedBaseRange = viewModel.activeModifiedBaseRange.read(reader);
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            for (const m of baseRangeWithStoreAndTouchingDiffs) {
                const modifiedBaseRange = m.left;
                if (modifiedBaseRange) {
                    const blockClassNames = ['merge-editor-block'];
                    let blockPadding = [0, 0, 0, 0];
                    const isHandled = model.isHandled(modifiedBaseRange).read(reader);
                    if (isHandled) {
                        blockClassNames.push('handled');
                    }
                    if (modifiedBaseRange === activeModifiedBaseRange) {
                        blockClassNames.push('focused');
                        blockPadding = [0, 2, 0, 2];
                    }
                    if (modifiedBaseRange.isConflicting) {
                        blockClassNames.push('conflicting');
                    }
                    blockClassNames.push('result');
                    if (!modifiedBaseRange.isConflicting && !showNonConflictingChanges && isHandled) {
                        continue;
                    }
                    const range = model.getLineRangeInResult(modifiedBaseRange.baseRange, reader);
                    result.push({
                        range: range.toInclusiveRangeOrEmpty(),
                        options: {
                            showIfCollapsed: true,
                            blockClassName: blockClassNames.join(' '),
                            blockPadding,
                            blockIsAfterEnd: range.startLineNumber > textModel.getLineCount(),
                            description: 'Result Diff',
                            minimap: {
                                position: 2 /* MinimapPosition.Gutter */,
                                color: {
                                    id: isHandled
                                        ? handledConflictMinimapOverViewRulerColor
                                        : unhandledConflictMinimapOverViewRulerColor,
                                },
                            },
                            overviewRuler: modifiedBaseRange.isConflicting
                                ? {
                                    position: OverviewRulerLane.Center,
                                    color: {
                                        id: isHandled
                                            ? handledConflictMinimapOverViewRulerColor
                                            : unhandledConflictMinimapOverViewRulerColor,
                                    },
                                }
                                : undefined,
                        },
                    });
                }
                if (!modifiedBaseRange || modifiedBaseRange.isConflicting) {
                    for (const diff of m.rights) {
                        const range = diff.outputRange.toInclusiveRange();
                        if (range) {
                            result.push({
                                range,
                                options: {
                                    className: `merge-editor-diff result`,
                                    description: 'Merge Editor',
                                    isWholeLine: true,
                                },
                            });
                        }
                        if (diff.rangeMappings) {
                            for (const d of diff.rangeMappings) {
                                result.push({
                                    range: d.outputRange,
                                    options: {
                                        className: `merge-editor-diff-word result`,
                                        description: 'Merge Editor',
                                    },
                                });
                            }
                        }
                    }
                }
            }
            return result;
        });
        this.editor.invokeWithinContext((accessor) => {
            const contextKeyService = accessor.get(IContextKeyService);
            const isMergeResultEditor = ctxIsMergeResultEditor.bindTo(contextKeyService);
            isMergeResultEditor.set(true);
            this._register(toDisposable(() => isMergeResultEditor.reset()));
        });
        this.htmlElements.gutterDiv.style.width = '5px';
        this.htmlElements.root.classList.add(`result`);
        this._register(autorunWithStore((reader, store) => {
            /** @description update checkboxes */
            if (this.checkboxesVisible.read(reader)) {
                store.add(new EditorGutter(this.editor, this.htmlElements.gutterDiv, {
                    getIntersectingGutterItems: (range, reader) => [],
                    createView: (item, target) => {
                        throw new BugIndicatingError();
                    },
                }));
            }
        }));
        this._register(autorun((reader) => {
            /** @description update labels & text model */
            const vm = this.viewModel.read(reader);
            if (!vm) {
                return;
            }
            this.editor.setModel(vm.model.resultTextModel);
            reset(this.htmlElements.title, ...renderLabelWithIcons(localize('result', 'Result')));
            reset(this.htmlElements.description, ...renderLabelWithIcons(this._labelService.getUriLabel(vm.model.resultTextModel.uri, { relative: true })));
        }));
        const remainingConflictsActionBar = this._register(new ActionBar(this.htmlElements.detail));
        this._register(autorun((reader) => {
            /** @description update remainingConflicts label */
            const vm = this.viewModel.read(reader);
            if (!vm) {
                return;
            }
            const model = vm.model;
            if (!model) {
                return;
            }
            const count = model.unhandledConflictsCount.read(reader);
            const text = count === 1
                ? localize('mergeEditor.remainingConflicts', '{0} Conflict Remaining', count)
                : localize('mergeEditor.remainingConflict', '{0} Conflicts Remaining ', count);
            remainingConflictsActionBar.clear();
            remainingConflictsActionBar.push({
                class: undefined,
                enabled: count > 0,
                id: 'nextConflict',
                label: text,
                run() {
                    vm.model.telemetry.reportConflictCounterClicked();
                    vm.goToNextModifiedBaseRange((m) => !model.isHandled(m).get());
                },
                tooltip: count > 0
                    ? localize('goToNextConflict', 'Go to next conflict')
                    : localize('allConflictHandled', 'All conflicts handled, the merge can be completed now.'),
            });
        }));
        this._register(applyObservableDecorations(this.editor, this.decorations));
        this._register(createSelectionsAutorun(this, (baseRange, viewModel) => viewModel.model.translateBaseRangeToResult(baseRange)));
        this._register(instantiationService.createInstance(TitleMenu, MenuId.MergeInputResultToolbar, this.htmlElements.toolbar));
    }
};
ResultCodeEditorView = __decorate([
    __param(1, IInstantiationService),
    __param(2, ILabelService),
    __param(3, IConfigurationService)
], ResultCodeEditorView);
export { ResultCodeEditorView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0Q29kZUVkaXRvclZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvZWRpdG9ycy9yZXN1bHRDb2RlRWRpdG9yVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUNOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsT0FBTyxHQUVQLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUdOLGlCQUFpQixHQUNqQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxT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