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
import { h, reset } from '../../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { autorun, autorunWithStore, derived, } from '../../../../../../base/common/observable.js';
import { OverviewRulerLane, } from '../../../../../../editor/common/model.js';
import { localize } from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { applyObservableDecorations } from '../../utils.js';
import { handledConflictMinimapOverViewRulerColor, unhandledConflictMinimapOverViewRulerColor, } from '../colors.js';
import { EditorGutter } from '../editorGutter.js';
import { CodeEditorView, TitleMenu, createSelectionsAutorun } from './codeEditorView.js';
let BaseCodeEditorView = class BaseCodeEditorView extends CodeEditorView {
    constructor(viewModel, instantiationService, configurationService) {
        super(instantiationService, viewModel, configurationService);
        this.decorations = derived(this, (reader) => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const textModel = model.base;
            const activeModifiedBaseRange = viewModel.activeModifiedBaseRange.read(reader);
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            const showDeletionMarkers = this.showDeletionMarkers.read(reader);
            const result = [];
            for (const modifiedBaseRange of model.modifiedBaseRanges.read(reader)) {
                const range = modifiedBaseRange.baseRange;
                if (!range) {
                    continue;
                }
                const isHandled = model.isHandled(modifiedBaseRange).read(reader);
                if (!modifiedBaseRange.isConflicting && isHandled && !showNonConflictingChanges) {
                    continue;
                }
                const blockClassNames = ['merge-editor-block'];
                let blockPadding = [0, 0, 0, 0];
                if (isHandled) {
                    blockClassNames.push('handled');
                }
                if (modifiedBaseRange === activeModifiedBaseRange) {
                    blockClassNames.push('focused');
                    blockPadding = [0, 2, 0, 2];
                }
                blockClassNames.push('base');
                const inputToDiffAgainst = viewModel.baseShowDiffAgainst.read(reader);
                if (inputToDiffAgainst) {
                    for (const diff of modifiedBaseRange.getInputDiffs(inputToDiffAgainst)) {
                        const range = diff.inputRange.toInclusiveRange();
                        if (range) {
                            result.push({
                                range,
                                options: {
                                    className: `merge-editor-diff base`,
                                    description: 'Merge Editor',
                                    isWholeLine: true,
                                },
                            });
                        }
                        for (const diff2 of diff.rangeMappings) {
                            if (showDeletionMarkers || !diff2.inputRange.isEmpty()) {
                                result.push({
                                    range: diff2.inputRange,
                                    options: {
                                        className: diff2.inputRange.isEmpty()
                                            ? `merge-editor-diff-empty-word base`
                                            : `merge-editor-diff-word base`,
                                        description: 'Merge Editor',
                                        showIfCollapsed: true,
                                    },
                                });
                            }
                        }
                    }
                }
                result.push({
                    range: range.toInclusiveRangeOrEmpty(),
                    options: {
                        showIfCollapsed: true,
                        blockClassName: blockClassNames.join(' '),
                        blockPadding,
                        blockIsAfterEnd: range.startLineNumber > textModel.getLineCount(),
                        description: 'Merge Editor',
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
            return result;
        });
        this._register(createSelectionsAutorun(this, (baseRange, viewModel) => baseRange));
        this._register(instantiationService.createInstance(TitleMenu, MenuId.MergeBaseToolbar, this.htmlElements.title));
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
            this.editor.setModel(vm.model.base);
            reset(this.htmlElements.title, ...renderLabelWithIcons(localize('base', 'Base')));
            const baseShowDiffAgainst = vm.baseShowDiffAgainst.read(reader);
            let node = undefined;
            if (baseShowDiffAgainst) {
                const label = localize('compareWith', 'Comparing with {0}', baseShowDiffAgainst === 1 ? vm.model.input1.title : vm.model.input2.title);
                const tooltip = localize('compareWithTooltip', 'Differences are highlighted with a background color.');
                node = h('span', { title: tooltip }, [label]).root;
            }
            reset(this.htmlElements.description, ...(node ? [node] : []));
        }));
        this._register(applyObservableDecorations(this.editor, this.decorations));
    }
};
BaseCodeEditorView = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], BaseCodeEditorView);
export { BaseCodeEditorView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNvZGVFZGl0b3JWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvZWRpdG9ycy9iYXNlQ29kZUVkaXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RSxPQUFPLEVBRU4sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEdBQ1AsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBR04saUJBQWlCLEdBQ2pCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sd0NBQXdDLEVBQ3hDLDBDQUEwQyxHQUMxQyxNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVqRixJQUFNLGtC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