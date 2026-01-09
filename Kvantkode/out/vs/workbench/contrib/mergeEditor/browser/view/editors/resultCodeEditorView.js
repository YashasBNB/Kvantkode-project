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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0Q29kZUVkaXRvclZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy9lZGl0b3JzL3Jlc3VsdENvZGVFZGl0b3JWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEdBRVAsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBR04saUJBQWlCLEdBQ2pCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3BELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxJQUFJLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sd0NBQXdDLEVBQ3hDLDBDQUEwQyxHQUMxQyxNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFakQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVqRixJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLGNBQWM7SUFDdkQsWUFDQyxTQUF3RCxFQUNqQyxvQkFBMkMsRUFDbkQsYUFBNkMsRUFDckMsb0JBQTJDO1FBRWxFLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUg1QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQTRHNUMsZ0JBQVcsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDdkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDN0MsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixPQUFPLEVBQUUsQ0FBQTtZQUNWLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFBO1lBQzdCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUE7WUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxLQUFLLEVBQXlCLENBQUE7WUFFakQsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLENBQzlDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQ3JDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUNsQyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUNuQixTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUMzQyxDQUFDLENBQUMsYUFBYSxDQUFDLHdCQUF3QjtnQkFDeEMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQ2xFLENBQUE7WUFFRCxNQUFNLHVCQUF1QixHQUFHLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFOUUsTUFBTSx5QkFBeUIsR0FBRyxTQUFTLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRWxGLEtBQUssTUFBTSxDQUFDLElBQUksa0NBQWtDLEVBQUUsQ0FBQztnQkFDcEQsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO2dCQUVoQyxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQ3ZCLE1BQU0sZUFBZSxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtvQkFDOUMsSUFBSSxZQUFZLEdBQStELENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQzNGLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ2pFLElBQUksU0FBUyxFQUFFLENBQUM7d0JBQ2YsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDaEMsQ0FBQztvQkFDRCxJQUFJLGlCQUFpQixLQUFLLHVCQUF1QixFQUFFLENBQUM7d0JBQ25ELGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7d0JBQy9CLFlBQVksR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO29CQUM1QixDQUFDO29CQUNELElBQUksaUJBQWlCLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQ3JDLGVBQWUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7b0JBQ3BDLENBQUM7b0JBQ0QsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFFOUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsSUFBSSxDQUFDLHlCQUF5QixJQUFJLFNBQVMsRUFBRSxDQUFDO3dCQUNqRixTQUFRO29CQUNULENBQUM7b0JBRUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtvQkFDN0UsTUFBTSxDQUFDLElBQUksQ0FBQzt3QkFDWCxLQUFLLEVBQUUsS0FBSyxDQUFDLHVCQUF1QixFQUFFO3dCQUN0QyxPQUFPLEVBQUU7NEJBQ1IsZUFBZSxFQUFFLElBQUk7NEJBQ3JCLGNBQWMsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQzs0QkFDekMsWUFBWTs0QkFDWixlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFOzRCQUNqRSxXQUFXLEVBQUUsYUFBYTs0QkFDMUIsT0FBTyxFQUFFO2dDQUNSLFFBQVEsZ0NBQXdCO2dDQUNoQyxLQUFLLEVBQUU7b0NBQ04sRUFBRSxFQUFFLFNBQVM7d0NBQ1osQ0FBQyxDQUFDLHdDQUF3Qzt3Q0FDMUMsQ0FBQyxDQUFDLDBDQUEwQztpQ0FDN0M7NkJBQ0Q7NEJBQ0QsYUFBYSxFQUFFLGlCQUFpQixDQUFDLGFBQWE7Z0NBQzdDLENBQUMsQ0FBQztvQ0FDQSxRQUFRLEVBQUUsaUJBQWlCLENBQUMsTUFBTTtvQ0FDbEMsS0FBSyxFQUFFO3dDQUNOLEVBQUUsRUFBRSxTQUFTOzRDQUNaLENBQUMsQ0FBQyx3Q0FBd0M7NENBQzFDLENBQUMsQ0FBQywwQ0FBMEM7cUNBQzdDO2lDQUNEO2dDQUNGLENBQUMsQ0FBQyxTQUFTO3lCQUNaO3FCQUNELENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUVELElBQUksQ0FBQyxpQkFBaUIsSUFBSSxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDM0QsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQzdCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTt3QkFDakQsSUFBSSxLQUFLLEVBQUUsQ0FBQzs0QkFDWCxNQUFNLENBQUMsSUFBSSxDQUFDO2dDQUNYLEtBQUs7Z0NBQ0wsT0FBTyxFQUFFO29DQUNSLFNBQVMsRUFBRSwwQkFBMEI7b0NBQ3JDLFdBQVcsRUFBRSxjQUFjO29DQUMzQixXQUFXLEVBQUUsSUFBSTtpQ0FDakI7NkJBQ0QsQ0FBQyxDQUFBO3dCQUNILENBQUM7d0JBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7NEJBQ3hCLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dDQUNwQyxNQUFNLENBQUMsSUFBSSxDQUFDO29DQUNYLEtBQUssRUFBRSxDQUFDLENBQUMsV0FBVztvQ0FDcEIsT0FBTyxFQUFFO3dDQUNSLFNBQVMsRUFBRSwrQkFBK0I7d0NBQzFDLFdBQVcsRUFBRSxjQUFjO3FDQUMzQjtpQ0FDRCxDQUFDLENBQUE7NEJBQ0gsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO1FBaE5ELElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUM1QyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUMxRCxNQUFNLG1CQUFtQixHQUFHLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQzVFLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEUsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUMvQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTlDLElBQUksQ0FBQyxTQUFTLENBQ2IsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbEMscUNBQXFDO1lBQ3JDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN6QyxLQUFLLENBQUMsR0FBRyxDQUNSLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUU7b0JBQzFELDBCQUEwQixFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtvQkFDakQsVUFBVSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFO3dCQUM1QixNQUFNLElBQUksa0JBQWtCLEVBQUUsQ0FBQTtvQkFDL0IsQ0FBQztpQkFDRCxDQUFDLENBQ0YsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsQiw4Q0FBOEM7WUFDOUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdEMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNULE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM5QyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyRixLQUFLLENBQ0osSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQzdCLEdBQUcsb0JBQW9CLENBQ3RCLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUNoRixDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUUzRixJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLG1EQUFtRDtZQUNuRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ1QsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFeEQsTUFBTSxJQUFJLEdBQ1QsS0FBSyxLQUFLLENBQUM7Z0JBQ1YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSx3QkFBd0IsRUFBRSxLQUFLLENBQUM7Z0JBQzdFLENBQUMsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFaEYsMkJBQTJCLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDbkMsMkJBQTJCLENBQUMsSUFBSSxDQUFDO2dCQUNoQyxLQUFLLEVBQUUsU0FBUztnQkFDaEIsT0FBTyxFQUFFLEtBQUssR0FBRyxDQUFDO2dCQUNsQixFQUFFLEVBQUUsY0FBYztnQkFDbEIsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsR0FBRztvQkFDRixFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxDQUFBO29CQUNqRCxFQUFFLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO2dCQUMvRCxDQUFDO2dCQUNELE9BQU8sRUFDTixLQUFLLEdBQUcsQ0FBQztvQkFDUixDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHFCQUFxQixDQUFDO29CQUNyRCxDQUFDLENBQUMsUUFBUSxDQUNSLG9CQUFvQixFQUNwQix3REFBd0QsQ0FDeEQ7YUFDSixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXpFLElBQUksQ0FBQyxTQUFTLENBQ2IsdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQ3RELFNBQVMsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQ3JELENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxTQUFTLEVBQ1QsTUFBTSxDQUFDLHVCQUF1QixFQUM5QixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FDekIsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQTRHRCxDQUFBO0FBMU5ZLG9CQUFvQjtJQUc5QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtHQUxYLG9CQUFvQixDQTBOaEMifQ==