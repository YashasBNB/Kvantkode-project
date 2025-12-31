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
import { addDisposableListener, EventType, h, reset } from '../../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Toggle } from '../../../../../../base/browser/ui/toggle/toggle.js';
import { Action, Separator } from '../../../../../../base/common/actions.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import { autorun, autorunOpts, derived, derivedOpts, observableValue, transaction, } from '../../../../../../base/common/observable.js';
import { noBreakWhitespace } from '../../../../../../base/common/strings.js';
import { isDefined } from '../../../../../../base/common/types.js';
import { OverviewRulerLane, } from '../../../../../../editor/common/model.js';
import { localize } from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { defaultToggleStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { applyObservableDecorations, setFields } from '../../utils.js';
import { handledConflictMinimapOverViewRulerColor, unhandledConflictMinimapOverViewRulerColor, } from '../colors.js';
import { EditorGutter } from '../editorGutter.js';
import { CodeEditorView, createSelectionsAutorun, TitleMenu } from './codeEditorView.js';
let InputCodeEditorView = class InputCodeEditorView extends CodeEditorView {
    constructor(inputNumber, viewModel, instantiationService, contextMenuService, configurationService) {
        super(instantiationService, viewModel, configurationService);
        this.inputNumber = inputNumber;
        this.otherInputNumber = this.inputNumber === 1 ? 2 : 1;
        this.modifiedBaseRangeGutterItemInfos = derivedOpts({ debugName: `input${this.inputNumber}.modifiedBaseRangeGutterItemInfos` }, (reader) => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const inputNumber = this.inputNumber;
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            return model.modifiedBaseRanges
                .read(reader)
                .filter((r) => r.getInputDiffs(this.inputNumber).length > 0 &&
                (showNonConflictingChanges || r.isConflicting || !model.isHandled(r).read(reader)))
                .map((baseRange, idx) => new ModifiedBaseRangeGutterItemModel(idx.toString(), baseRange, inputNumber, viewModel));
        });
        this.decorations = derivedOpts({ debugName: `input${this.inputNumber}.decorations` }, (reader) => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const textModel = (this.inputNumber === 1 ? model.input1 : model.input2).textModel;
            const activeModifiedBaseRange = viewModel.activeModifiedBaseRange.read(reader);
            const result = new Array();
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            const showDeletionMarkers = this.showDeletionMarkers.read(reader);
            const diffWithThis = viewModel.baseCodeEditorView.read(reader) !== undefined &&
                viewModel.baseShowDiffAgainst.read(reader) === this.inputNumber;
            const useSimplifiedDecorations = !diffWithThis && this.useSimplifiedDecorations.read(reader);
            for (const modifiedBaseRange of model.modifiedBaseRanges.read(reader)) {
                const range = modifiedBaseRange.getInputRange(this.inputNumber);
                if (!range) {
                    continue;
                }
                const blockClassNames = ['merge-editor-block'];
                let blockPadding = [0, 0, 0, 0];
                const isHandled = model.isInputHandled(modifiedBaseRange, this.inputNumber).read(reader);
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
                const inputClassName = this.inputNumber === 1 ? 'input i1' : 'input i2';
                blockClassNames.push(inputClassName);
                if (!modifiedBaseRange.isConflicting && !showNonConflictingChanges && isHandled) {
                    continue;
                }
                if (useSimplifiedDecorations && !isHandled) {
                    blockClassNames.push('use-simplified-decorations');
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
                if (!useSimplifiedDecorations &&
                    (modifiedBaseRange.isConflicting || !model.isHandled(modifiedBaseRange).read(reader))) {
                    const inputDiffs = modifiedBaseRange.getInputDiffs(this.inputNumber);
                    for (const diff of inputDiffs) {
                        const range = diff.outputRange.toInclusiveRange();
                        if (range) {
                            result.push({
                                range,
                                options: {
                                    className: `merge-editor-diff ${inputClassName}`,
                                    description: 'Merge Editor',
                                    isWholeLine: true,
                                },
                            });
                        }
                        if (diff.rangeMappings) {
                            for (const d of diff.rangeMappings) {
                                if (showDeletionMarkers || !d.outputRange.isEmpty()) {
                                    result.push({
                                        range: d.outputRange,
                                        options: {
                                            className: d.outputRange.isEmpty()
                                                ? `merge-editor-diff-empty-word ${inputClassName}`
                                                : `merge-editor-diff-word ${inputClassName}`,
                                            description: 'Merge Editor',
                                            showIfCollapsed: true,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            }
            return result;
        });
        this.htmlElements.root.classList.add(`input`);
        this._register(new EditorGutter(this.editor, this.htmlElements.gutterDiv, {
            getIntersectingGutterItems: (range, reader) => {
                if (this.checkboxesVisible.read(reader)) {
                    return this.modifiedBaseRangeGutterItemInfos.read(reader);
                }
                else {
                    return [];
                }
            },
            createView: (item, target) => new MergeConflictGutterItemView(item, target, contextMenuService),
        }));
        this._register(createSelectionsAutorun(this, (baseRange, viewModel) => viewModel.model.translateBaseRangeToInput(this.inputNumber, baseRange)));
        this._register(instantiationService.createInstance(TitleMenu, inputNumber === 1 ? MenuId.MergeInput1Toolbar : MenuId.MergeInput2Toolbar, this.htmlElements.toolbar));
        this._register(autorunOpts({ debugName: `input${this.inputNumber}: update labels & text model` }, (reader) => {
            const vm = this.viewModel.read(reader);
            if (!vm) {
                return;
            }
            this.editor.setModel(this.inputNumber === 1 ? vm.model.input1.textModel : vm.model.input2.textModel);
            const title = this.inputNumber === 1
                ? vm.model.input1.title || localize('input1', 'Input 1')
                : vm.model.input2.title || localize('input2', 'Input 2');
            const description = this.inputNumber === 1 ? vm.model.input1.description : vm.model.input2.description;
            const detail = this.inputNumber === 1 ? vm.model.input1.detail : vm.model.input2.detail;
            reset(this.htmlElements.title, ...renderLabelWithIcons(title));
            reset(this.htmlElements.description, ...(description ? renderLabelWithIcons(description) : []));
            reset(this.htmlElements.detail, ...(detail ? renderLabelWithIcons(detail) : []));
        }));
        this._register(applyObservableDecorations(this.editor, this.decorations));
    }
};
InputCodeEditorView = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService)
], InputCodeEditorView);
export { InputCodeEditorView };
export class ModifiedBaseRangeGutterItemModel {
    constructor(id, baseRange, inputNumber, viewModel) {
        this.id = id;
        this.baseRange = baseRange;
        this.inputNumber = inputNumber;
        this.viewModel = viewModel;
        this.model = this.viewModel.model;
        this.range = this.baseRange.getInputRange(this.inputNumber);
        this.enabled = this.model.isUpToDate;
        this.toggleState = derived(this, (reader) => {
            const input = this.model.getState(this.baseRange).read(reader).getInput(this.inputNumber);
            return input === 2 /* InputState.second */ && !this.baseRange.isOrderRelevant ? 1 /* InputState.first */ : input;
        });
        this.state = derived(this, (reader) => {
            const active = this.viewModel.activeModifiedBaseRange.read(reader);
            if (!this.model.hasBaseRange(this.baseRange)) {
                return { handled: false, focused: false }; // Invalid state, should only be observed temporarily
            }
            return {
                handled: this.model.isHandled(this.baseRange).read(reader),
                focused: this.baseRange === active,
            };
        });
    }
    setState(value, tx) {
        this.viewModel.setState(this.baseRange, this.model.getState(this.baseRange).get().withInputValue(this.inputNumber, value), tx, this.inputNumber);
    }
    toggleBothSides() {
        transaction((tx) => {
            /** @description Context Menu: toggle both sides */
            const state = this.model.getState(this.baseRange).get();
            this.model.setState(this.baseRange, state.toggle(this.inputNumber).toggle(this.inputNumber === 1 ? 2 : 1), true, tx);
        });
    }
    getContextMenuActions() {
        const state = this.model.getState(this.baseRange).get();
        const handled = this.model.isHandled(this.baseRange).get();
        const update = (newState) => {
            transaction((tx) => {
                /** @description Context Menu: Update Base Range State */
                return this.viewModel.setState(this.baseRange, newState, tx, this.inputNumber);
            });
        };
        function action(id, label, targetState, checked) {
            const action = new Action(id, label, undefined, true, () => {
                update(targetState);
            });
            action.checked = checked;
            return action;
        }
        const both = state.includesInput1 && state.includesInput2;
        return [
            this.baseRange.input1Diffs.length > 0
                ? action('mergeEditor.acceptInput1', localize('mergeEditor.accept', 'Accept {0}', this.model.input1.title), state.toggle(1), state.includesInput1)
                : undefined,
            this.baseRange.input2Diffs.length > 0
                ? action('mergeEditor.acceptInput2', localize('mergeEditor.accept', 'Accept {0}', this.model.input2.title), state.toggle(2), state.includesInput2)
                : undefined,
            this.baseRange.isConflicting
                ? setFields(action('mergeEditor.acceptBoth', localize('mergeEditor.acceptBoth', 'Accept Both'), state.withInputValue(1, !both).withInputValue(2, !both), both), { enabled: this.baseRange.canBeCombined })
                : undefined,
            new Separator(),
            this.baseRange.isConflicting
                ? setFields(action('mergeEditor.swap', localize('mergeEditor.swap', 'Swap'), state.swap(), false), { enabled: !state.kind && (!both || this.baseRange.isOrderRelevant) })
                : undefined,
            setFields(new Action('mergeEditor.markAsHandled', localize('mergeEditor.markAsHandled', 'Mark as Handled'), undefined, true, () => {
                transaction((tx) => {
                    /** @description Context Menu: Mark as handled */
                    this.model.setHandled(this.baseRange, !handled, tx);
                });
            }), { checked: handled }),
        ].filter(isDefined);
    }
}
export class MergeConflictGutterItemView extends Disposable {
    constructor(item, target, contextMenuService) {
        super();
        this.isMultiLine = observableValue(this, false);
        this.item = observableValue(this, item);
        const checkBox = new Toggle({
            isChecked: false,
            title: '',
            icon: Codicon.check,
            ...defaultToggleStyles,
        });
        checkBox.domNode.classList.add('accept-conflict-group');
        this._register(addDisposableListener(checkBox.domNode, EventType.MOUSE_DOWN, (e) => {
            const item = this.item.get();
            if (!item) {
                return;
            }
            if (e.button === /* Right */ 2) {
                e.stopPropagation();
                e.preventDefault();
                contextMenuService.showContextMenu({
                    getAnchor: () => checkBox.domNode,
                    getActions: () => item.getContextMenuActions(),
                });
            }
            else if (e.button === /* Middle */ 1) {
                e.stopPropagation();
                e.preventDefault();
                item.toggleBothSides();
            }
        }));
        this._register(autorun((reader) => {
            /** @description Update Checkbox */
            const item = this.item.read(reader);
            const value = item.toggleState.read(reader);
            const iconMap = {
                [0 /* InputState.excluded */]: {
                    icon: undefined,
                    checked: false,
                    title: localize('accept.excluded', 'Accept'),
                },
                [3 /* InputState.unrecognized */]: {
                    icon: Codicon.circleFilled,
                    checked: false,
                    title: localize('accept.conflicting', 'Accept (result is dirty)'),
                },
                [1 /* InputState.first */]: {
                    icon: Codicon.check,
                    checked: true,
                    title: localize('accept.first', 'Undo accept'),
                },
                [2 /* InputState.second */]: {
                    icon: Codicon.checkAll,
                    checked: true,
                    title: localize('accept.second', 'Undo accept (currently second)'),
                },
            };
            const state = iconMap[value];
            checkBox.setIcon(state.icon);
            checkBox.checked = state.checked;
            checkBox.setTitle(state.title);
            if (!item.enabled.read(reader)) {
                checkBox.disable();
            }
            else {
                checkBox.enable();
            }
        }));
        this._register(autorun((reader) => {
            /** @description Update Checkbox CSS ClassNames */
            const state = this.item.read(reader).state.read(reader);
            const classNames = [
                'merge-accept-gutter-marker',
                state.handled && 'handled',
                state.focused && 'focused',
                this.isMultiLine.read(reader) ? 'multi-line' : 'single-line',
            ];
            target.className = classNames.filter((c) => typeof c === 'string').join(' ');
        }));
        this._register(checkBox.onChange(() => {
            transaction((tx) => {
                /** @description Handle Checkbox Change */
                this.item.get().setState(checkBox.checked, tx);
            });
        }));
        target.appendChild(h('div.background', [noBreakWhitespace]).root);
        target.appendChild((this.checkboxDiv = h('div.checkbox', [
            h('div.checkbox-background', [checkBox.domNode]),
        ]).root));
    }
    layout(top, height, viewTop, viewHeight) {
        const checkboxHeight = this.checkboxDiv.clientHeight;
        const middleHeight = height / 2 - checkboxHeight / 2;
        const margin = checkboxHeight;
        let effectiveCheckboxTop = top + middleHeight;
        const preferredViewPortRange = [margin, viewTop + viewHeight - margin - checkboxHeight];
        const preferredParentRange = [top + margin, top + height - checkboxHeight - margin];
        if (preferredParentRange[0] < preferredParentRange[1]) {
            effectiveCheckboxTop = clamp(effectiveCheckboxTop, preferredViewPortRange[0], preferredViewPortRange[1]);
            effectiveCheckboxTop = clamp(effectiveCheckboxTop, preferredParentRange[0], preferredParentRange[1]);
        }
        this.checkboxDiv.style.top = `${effectiveCheckboxTop - top}px`;
        transaction((tx) => {
            /** @description MergeConflictGutterItemView: Update Is Multi Line */
            this.isMultiLine.set(height > 30, tx);
        });
    }
    update(baseRange) {
        transaction((tx) => {
            /** @description MergeConflictGutterItemView: Updating new base range */
            this.item.set(baseRange, tx);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRDb2RlRWRpdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy9lZGl0b3JzL2lucHV0Q29kZUVkaXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxFQUNOLE9BQU8sRUFDUCxXQUFXLEVBQ1gsT0FBTyxFQUNQLFdBQVcsRUFJWCxlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFHTixpQkFBaUIsR0FDakIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNEQUFzRCxDQUFB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