/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, h, isInShadowDOM, reset } from '../../../../../base/browser/dom.js';
import { createStyleSheet } from '../../../../../base/browser/domStylesheets.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { hash } from '../../../../../base/common/hash.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derived, transaction, } from '../../../../../base/common/observable.js';
import { EDITOR_FONT_DEFAULTS, } from '../../../../../editor/common/config/editorOptions.js';
import { localize } from '../../../../../nls.js';
import { ModifiedBaseRangeState, ModifiedBaseRangeStateKind, } from '../model/modifiedBaseRange.js';
import { FixedZoneWidget } from './fixedZoneWidget.js';
export class ConflictActionsFactory extends Disposable {
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */) ||
                e.hasChanged(19 /* EditorOption.codeLensFontSize */) ||
                e.hasChanged(18 /* EditorOption.codeLensFontFamily */)) {
                this._updateLensStyle();
            }
        }));
        this._styleClassName = '_conflictActionsFactory_' + hash(this._editor.getId()).toString(16);
        this._styleElement = createStyleSheet(isInShadowDOM(this._editor.getContainerDomNode())
            ? this._editor.getContainerDomNode()
            : undefined, undefined, this._store);
        this._updateLensStyle();
    }
    _updateLensStyle() {
        const { codeLensHeight, fontSize } = this._getLayoutInfo();
        const fontFamily = this._editor.getOption(18 /* EditorOption.codeLensFontFamily */);
        const editorFontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        const fontFamilyVar = `--codelens-font-family${this._styleClassName}`;
        const fontFeaturesVar = `--codelens-font-features${this._styleClassName}`;
        let newStyle = `
		.${this._styleClassName} { line-height: ${codeLensHeight}px; font-size: ${fontSize}px; padding-right: ${Math.round(fontSize * 0.5)}px; font-feature-settings: var(${fontFeaturesVar}) }
		.monaco-workbench .${this._styleClassName} span.codicon { line-height: ${codeLensHeight}px; font-size: ${fontSize}px; }
		`;
        if (fontFamily) {
            newStyle += `${this._styleClassName} { font-family: var(${fontFamilyVar}), ${EDITOR_FONT_DEFAULTS.fontFamily}}`;
        }
        this._styleElement.textContent = newStyle;
        this._editor.getContainerDomNode().style?.setProperty(fontFamilyVar, fontFamily ?? 'inherit');
        this._editor
            .getContainerDomNode()
            .style?.setProperty(fontFeaturesVar, editorFontInfo.fontFeatureSettings);
    }
    _getLayoutInfo() {
        const lineHeightFactor = Math.max(1.3, this._editor.getOption(68 /* EditorOption.lineHeight */) /
            this._editor.getOption(54 /* EditorOption.fontSize */));
        let fontSize = this._editor.getOption(19 /* EditorOption.codeLensFontSize */);
        if (!fontSize || fontSize < 5) {
            fontSize = (this._editor.getOption(54 /* EditorOption.fontSize */) * 0.9) | 0;
        }
        return {
            fontSize,
            codeLensHeight: (fontSize * lineHeightFactor) | 0,
        };
    }
    createWidget(viewZoneChangeAccessor, lineNumber, items, viewZoneIdsToCleanUp) {
        const layoutInfo = this._getLayoutInfo();
        return new ActionsContentWidget(this._editor, viewZoneChangeAccessor, lineNumber, layoutInfo.codeLensHeight + 2, this._styleClassName, items, viewZoneIdsToCleanUp);
    }
}
export class ActionsSource {
    constructor(viewModel, modifiedBaseRange) {
        this.viewModel = viewModel;
        this.modifiedBaseRange = modifiedBaseRange;
        this.itemsInput1 = this.getItemsInput(1);
        this.itemsInput2 = this.getItemsInput(2);
        this.resultItems = derived(this, (reader) => {
            const viewModel = this.viewModel;
            const modifiedBaseRange = this.modifiedBaseRange;
            const state = viewModel.model.getState(modifiedBaseRange).read(reader);
            const model = viewModel.model;
            const result = [];
            if (state.kind === ModifiedBaseRangeStateKind.unrecognized) {
                result.push({
                    text: localize('manualResolution', 'Manual Resolution'),
                    tooltip: localize('manualResolutionTooltip', 'This conflict has been resolved manually.'),
                });
            }
            else if (state.kind === ModifiedBaseRangeStateKind.base) {
                result.push({
                    text: localize('noChangesAccepted', 'No Changes Accepted'),
                    tooltip: localize('noChangesAcceptedTooltip', 'The current resolution of this conflict equals the common ancestor of both the right and left changes.'),
                });
            }
            else {
                const labels = [];
                if (state.includesInput1) {
                    labels.push(model.input1.title);
                }
                if (state.includesInput2) {
                    labels.push(model.input2.title);
                }
                if (state.kind === ModifiedBaseRangeStateKind.both && state.firstInput === 2) {
                    labels.reverse();
                }
                result.push({
                    text: `${labels.join(' + ')}`,
                });
            }
            const stateToggles = [];
            if (state.includesInput1) {
                stateToggles.push(command(localize('remove', 'Remove {0}', model.input1.title), async () => {
                    transaction((tx) => {
                        model.setState(modifiedBaseRange, state.withInputValue(1, false), true, tx);
                        model.telemetry.reportRemoveInvoked(1, state.includesInput(2));
                    });
                }, localize('removeTooltip', 'Remove {0} from the result document.', model.input1.title)));
            }
            if (state.includesInput2) {
                stateToggles.push(command(localize('remove', 'Remove {0}', model.input2.title), async () => {
                    transaction((tx) => {
                        model.setState(modifiedBaseRange, state.withInputValue(2, false), true, tx);
                        model.telemetry.reportRemoveInvoked(2, state.includesInput(1));
                    });
                }, localize('removeTooltip', 'Remove {0} from the result document.', model.input2.title)));
            }
            if (state.kind === ModifiedBaseRangeStateKind.both && state.firstInput === 2) {
                stateToggles.reverse();
            }
            result.push(...stateToggles);
            if (state.kind === ModifiedBaseRangeStateKind.unrecognized) {
                result.push(command(localize('resetToBase', 'Reset to base'), async () => {
                    transaction((tx) => {
                        model.setState(modifiedBaseRange, ModifiedBaseRangeState.base, true, tx);
                        model.telemetry.reportResetToBaseInvoked();
                    });
                }, localize('resetToBaseTooltip', 'Reset this conflict to the common ancestor of both the right and left changes.')));
            }
            return result;
        });
        this.isEmpty = derived(this, (reader) => {
            return (this.itemsInput1.read(reader).length +
                this.itemsInput2.read(reader).length +
                this.resultItems.read(reader).length ===
                0);
        });
        this.inputIsEmpty = derived(this, (reader) => {
            return this.itemsInput1.read(reader).length + this.itemsInput2.read(reader).length === 0;
        });
    }
    getItemsInput(inputNumber) {
        return derived((reader) => {
            /** @description items */
            const viewModel = this.viewModel;
            const modifiedBaseRange = this.modifiedBaseRange;
            if (!viewModel.model.hasBaseRange(modifiedBaseRange)) {
                return [];
            }
            const state = viewModel.model.getState(modifiedBaseRange).read(reader);
            const handled = viewModel.model.isHandled(modifiedBaseRange).read(reader);
            const model = viewModel.model;
            const result = [];
            const inputData = inputNumber === 1 ? viewModel.model.input1 : viewModel.model.input2;
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            if (!modifiedBaseRange.isConflicting && handled && !showNonConflictingChanges) {
                return [];
            }
            const otherInputNumber = inputNumber === 1 ? 2 : 1;
            if (state.kind !== ModifiedBaseRangeStateKind.unrecognized &&
                !state.isInputIncluded(inputNumber)) {
                if (!state.isInputIncluded(otherInputNumber) ||
                    !this.viewModel.shouldUseAppendInsteadOfAccept.read(reader)) {
                    result.push(command(localize('accept', 'Accept {0}', inputData.title), async () => {
                        transaction((tx) => {
                            model.setState(modifiedBaseRange, state.withInputValue(inputNumber, true, false), inputNumber, tx);
                            model.telemetry.reportAcceptInvoked(inputNumber, state.includesInput(otherInputNumber));
                        });
                    }, localize('acceptTooltip', 'Accept {0} in the result document.', inputData.title)));
                    if (modifiedBaseRange.canBeCombined) {
                        const commandName = modifiedBaseRange.isOrderRelevant
                            ? localize('acceptBoth0First', 'Accept Combination ({0} First)', inputData.title)
                            : localize('acceptBoth', 'Accept Combination');
                        result.push(command(commandName, async () => {
                            transaction((tx) => {
                                model.setState(modifiedBaseRange, ModifiedBaseRangeState.base
                                    .withInputValue(inputNumber, true)
                                    .withInputValue(otherInputNumber, true, true), true, tx);
                                model.telemetry.reportSmartCombinationInvoked(state.includesInput(otherInputNumber));
                            });
                        }, localize('acceptBothTooltip', 'Accept an automatic combination of both sides in the result document.')));
                    }
                }
                else {
                    result.push(command(localize('append', 'Append {0}', inputData.title), async () => {
                        transaction((tx) => {
                            model.setState(modifiedBaseRange, state.withInputValue(inputNumber, true, false), inputNumber, tx);
                            model.telemetry.reportAcceptInvoked(inputNumber, state.includesInput(otherInputNumber));
                        });
                    }, localize('appendTooltip', 'Append {0} to the result document.', inputData.title)));
                    if (modifiedBaseRange.canBeCombined) {
                        result.push(command(localize('combine', 'Accept Combination', inputData.title), async () => {
                            transaction((tx) => {
                                model.setState(modifiedBaseRange, state.withInputValue(inputNumber, true, true), inputNumber, tx);
                                model.telemetry.reportSmartCombinationInvoked(state.includesInput(otherInputNumber));
                            });
                        }, localize('acceptBothTooltip', 'Accept an automatic combination of both sides in the result document.')));
                    }
                }
                if (!model.isInputHandled(modifiedBaseRange, inputNumber).read(reader)) {
                    result.push(command(localize('ignore', 'Ignore'), async () => {
                        transaction((tx) => {
                            model.setInputHandled(modifiedBaseRange, inputNumber, true, tx);
                        });
                    }, localize('markAsHandledTooltip', "Don't take this side of the conflict.")));
                }
            }
            return result;
        });
    }
}
function command(title, action, tooltip) {
    return {
        text: title,
        action,
        tooltip,
    };
}
class ActionsContentWidget extends FixedZoneWidget {
    constructor(editor, viewZoneAccessor, afterLineNumber, height, className, items, viewZoneIdsToCleanUp) {
        super(editor, viewZoneAccessor, afterLineNumber, height, viewZoneIdsToCleanUp);
        this._domNode = h('div.merge-editor-conflict-actions').root;
        this.widgetDomNode.appendChild(this._domNode);
        this._domNode.classList.add(className);
        this._register(autorun((reader) => {
            /** @description update commands */
            const i = items.read(reader);
            this.setState(i);
        }));
    }
    setState(items) {
        const children = [];
        let isFirst = true;
        for (const item of items) {
            if (isFirst) {
                isFirst = false;
            }
            else {
                children.push($('span', undefined, '\u00a0|\u00a0'));
            }
            const title = renderLabelWithIcons(item.text);
            if (item.action) {
                children.push($('a', { title: item.tooltip, role: 'button', onclick: () => item.action() }, ...title));
            }
            else {
                children.push($('span', { title: item.tooltip }, ...title));
            }
        }
        reset(this._domNode, ...children);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmxpY3RBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2NvbmZsaWN0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDaEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDN0YsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQ04sT0FBTyxFQUNQLE9BQU8sRUFFUCxXQUFXLEdBQ1gsTUFBTSwwQ0FBMEMsQ0FBQTtBQUtqRCxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFFTixzQkFBc0IsRUFDdEIsMEJBQTBCLEdBQzFCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBR3RELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO0lBSXJELFlBQTZCLE9BQW9CO1FBQ2hELEtBQUssRUFBRSxDQUFBO1FBRHFCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFHaEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFD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