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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNvZGVFZGl0b3JWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2VkaXRvcnMvYmFzZUNvZGVFZGl0b3JWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDNUUsT0FBTyxFQUVOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsT0FBTyxHQUNQLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUdOLGlCQUFpQixHQUNqQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDM0QsT0FBTyxFQUNOLHdDQUF3QyxFQUN4QywwQ0FBMEMsR0FDMUMsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRWpELE9BQU8sRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFakYsSUFBTSxrQkFBa0Is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