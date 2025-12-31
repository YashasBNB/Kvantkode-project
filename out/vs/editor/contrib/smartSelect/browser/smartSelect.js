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
var SmartSelectController_1;
import * as arrays from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { BracketSelectionRangeProvider } from './bracketSelections.js';
import { WordSelectionRangeProvider } from './wordSelections.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
class SelectionRanges {
    constructor(index, ranges) {
        this.index = index;
        this.ranges = ranges;
    }
    mov(fwd) {
        const index = this.index + (fwd ? 1 : -1);
        if (index < 0 || index >= this.ranges.length) {
            return this;
        }
        const res = new SelectionRanges(index, this.ranges);
        if (res.ranges[index].equalsRange(this.ranges[this.index])) {
            // next range equals this range, retry with next-next
            return res.mov(fwd);
        }
        return res;
    }
}
let SmartSelectController = class SmartSelectController {
    static { SmartSelectController_1 = this; }
    static { this.ID = 'editor.contrib.smartSelectController'; }
    static get(editor) {
        return editor.getContribution(SmartSelectController_1.ID);
    }
    constructor(_editor, _languageFeaturesService) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._ignoreSelection = false;
    }
    dispose() {
        this._selectionListener?.dispose();
    }
    async run(forward) {
        if (!this._editor.hasModel()) {
            return;
        }
        const selections = this._editor.getSelections();
        const model = this._editor.getModel();
        if (!this._state) {
            await provideSelectionRanges(this._languageFeaturesService.selectionRangeProvider, model, selections.map((s) => s.getPosition()), this._editor.getOption(118 /* EditorOption.smartSelect */), CancellationToken.None).then((ranges) => {
                if (!arrays.isNonEmptyArray(ranges) || ranges.length !== selections.length) {
                    // invalid result
                    return;
                }
                if (!this._editor.hasModel() ||
                    !arrays.equals(this._editor.getSelections(), selections, (a, b) => a.equalsSelection(b))) {
                    // invalid editor state
                    return;
                }
                for (let i = 0; i < ranges.length; i++) {
                    ranges[i] = ranges[i].filter((range) => {
                        // filter ranges inside the selection
                        return (range.containsPosition(selections[i].getStartPosition()) &&
                            range.containsPosition(selections[i].getEndPosition()));
                    });
                    // prepend current selection
                    ranges[i].unshift(selections[i]);
                }
                this._state = ranges.map((ranges) => new SelectionRanges(0, ranges));
                // listen to caret move and forget about state
                this._selectionListener?.dispose();
                this._selectionListener = this._editor.onDidChangeCursorPosition(() => {
                    if (!this._ignoreSelection) {
                        this._selectionListener?.dispose();
                        this._state = undefined;
                    }
                });
            });
        }
        if (!this._state) {
            // no state
            return;
        }
        this._state = this._state.map((state) => state.mov(forward));
        const newSelections = this._state.map((state) => Selection.fromPositions(state.ranges[state.index].getStartPosition(), state.ranges[state.index].getEndPosition()));
        // Void changed this to skip over added whitespace when using smartSelect
        // // Store the original selections for comparison
        // const originalSelections = selections;
        // // Keep skipping while we're only adding/removing whitespace
        // let keepSkipping = true;
        // let skipCount = 0;
        // const MAX_SKIPS = 5; // Avoid infinite loops by setting a reasonable limit
        // while (keepSkipping && skipCount < MAX_SKIPS) {
        // 	keepSkipping = false; // Reset for each iteration
        // 	// Check if all selections only added/removed whitespace
        // 	if (originalSelections.length === newSelections.length) {
        // 		for (let i = 0; i < originalSelections.length; i++) {
        // 			const oldSel = originalSelections[i];
        // 			const newSel = newSelections[i];
        // 			if (forward) { // For expanding (^+Shift+Right)
        // 				// Skip if only whitespace was added
        // 				const oldText = model.getValueInRange(oldSel).trim();
        // 				const newText = model.getValueInRange(newSel).trim();
        // 				const onlyWhitespaceAdded = oldText === newText && oldText.length > 0;
        // 				if (onlyWhitespaceAdded) {
        // 					console.log(`SMART SELECT - SKIPPING (EXPAND) [${skipCount + 1}]:`, {
        // 						reason: 'only whitespace added',
        // 						oldText: model.getValueInRange(oldSel),
        // 						newText: model.getValueInRange(newSel)
        // 					});
        // 					keepSkipping = true;
        // 					break;
        // 				}
        // 			} else { // For shrinking (^+Shift+Left)
        // 				// Skip if only whitespace was removed
        // 				const oldText = model.getValueInRange(oldSel).trim();
        // 				const newText = model.getValueInRange(newSel).trim();
        // 				const onlyWhitespaceRemoved = oldText === newText && newText.length > 0;
        // 				if (onlyWhitespaceRemoved) {
        // 					console.log(`SMART SELECT - SKIPPING (SHRINK) [${skipCount + 1}]:`, {
        // 						reason: 'only whitespace removed',
        // 						oldText: model.getValueInRange(oldSel),
        // 						newText: model.getValueInRange(newSel)
        // 					});
        // 					keepSkipping = true;
        // 					break;
        // 				}
        // 			}
        // 		}
        // 	}
        // 	// If we need to skip, move one more time
        // 	if (keepSkipping) {
        // 		skipCount++;
        // 		// Try to move to the next range
        // 		const prevState = this._state;
        // 		this._state = this._state.map(state => state.mov(forward));
        // 		// Check if we've reached the end of available ranges
        // 		const stateUnchanged = this._state.every((state, idx) =>
        // 			state.index === prevState[idx].index
        // 		);
        // 		if (stateUnchanged) {
        // 			// We can't move any further, so stop skipping
        // 			keepSkipping = false;
        // 		} else {
        // 			// Update selections for the next iteration
        // 			newSelections = this._state.map(state => Selection.fromPositions(
        // 				state.ranges[state.index].getStartPosition(),
        // 				state.ranges[state.index].getEndPosition()
        // 			));
        // 		}
        // 	}
        // }
        // // Print AFTER selection (before actually setting it)
        // console.log('SMART SELECT - AFTER:', newSelections.map(s => {
        // 	return {
        // 		range: `(${s.startLineNumber},${s.startColumn}) -> (${s.endLineNumber},${s.endColumn})`,
        // 		text: model.getValueInRange(s)
        // 	};
        // }));
        this._ignoreSelection = true;
        try {
            this._editor.setSelections(newSelections);
        }
        finally {
            this._ignoreSelection = false;
        }
    }
};
SmartSelectController = SmartSelectController_1 = __decorate([
    __param(1, ILanguageFeaturesService)
], SmartSelectController);
export { SmartSelectController };
class AbstractSmartSelect extends EditorAction {
    constructor(forward, opts) {
        super(opts);
        this._forward = forward;
    }
    async run(_accessor, editor) {
        const controller = SmartSelectController.get(editor);
        if (controller) {
            await controller.run(this._forward);
        }
    }
}
class GrowSelectionAction extends AbstractSmartSelect {
    constructor() {
        super(true, {
            id: 'editor.action.smartSelect.expand',
            label: nls.localize2('smartSelect.expand', 'Expand Selection'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */,
                    secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '1_basic',
                title: nls.localize({ key: 'miSmartSelectGrow', comment: ['&& denotes a mnemonic'] }, '&&Expand Selection'),
                order: 2,
            },
        });
    }
}
// renamed command id
CommandsRegistry.registerCommandAlias('editor.action.smartSelect.grow', 'editor.action.smartSelect.expand');
class ShrinkSelectionAction extends AbstractSmartSelect {
    constructor() {
        super(false, {
            id: 'editor.action.smartSelect.shrink',
            label: nls.localize2('smartSelect.shrink', 'Shrink Selection'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */,
                    secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '1_basic',
                title: nls.localize({ key: 'miSmartSelectShrink', comment: ['&& denotes a mnemonic'] }, '&&Shrink Selection'),
                order: 3,
            },
        });
    }
}
registerEditorContribution(SmartSelectController.ID, SmartSelectController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(GrowSelectionAction);
registerEditorAction(ShrinkSelectionAction);
export async function provideSelectionRanges(registry, model, positions, options, token) {
    const providers = registry
        .all(model)
        .concat(new WordSelectionRangeProvider(options.selectSubwords)); // ALWAYS have word based selection range
    if (providers.length === 1) {
        // add word selection and bracket selection when no provider exists
        providers.unshift(new BracketSelectionRangeProvider());
    }
    const work = [];
    const allRawRanges = [];
    for (const provider of providers) {
        work.push(Promise.resolve(provider.provideSelectionRanges(model, positions, token)).then((allProviderRanges) => {
            if (arrays.isNonEmptyArray(allProviderRanges) &&
                allProviderRanges.length === positions.length) {
                for (let i = 0; i < positions.length; i++) {
                    if (!allRawRanges[i]) {
                        allRawRanges[i] = [];
                    }
                    for (const oneProviderRanges of allProviderRanges[i]) {
                        if (Range.isIRange(oneProviderRanges.range) &&
                            Range.containsPosition(oneProviderRanges.range, positions[i])) {
                            allRawRanges[i].push(Range.lift(oneProviderRanges.range));
                        }
                    }
                }
            }
        }, onUnexpectedExternalError));
    }
    await Promise.all(work);
    return allRawRanges.map((oneRawRanges) => {
        if (oneRawRanges.length === 0) {
            return [];
        }
        // sort all by start/end position
        oneRawRanges.sort((a, b) => {
            if (Position.isBefore(a.getStartPosition(), b.getStartPosition())) {
                return 1;
            }
            else if (Position.isBefore(b.getStartPosition(), a.getStartPosition())) {
                return -1;
            }
            else if (Position.isBefore(a.getEndPosition(), b.getEndPosition())) {
                return -1;
            }
            else if (Position.isBefore(b.getEndPosition(), a.getEndPosition())) {
                return 1;
            }
            else {
                return 0;
            }
        });
        // remove ranges that don't contain the former range or that are equal to the
        // former range
        const oneRanges = [];
        let last;
        for (const range of oneRawRanges) {
            if (!last || (Range.containsRange(range, last) && !Range.equalsRange(range, last))) {
                oneRanges.push(range);
                last = range;
            }
        }
        if (!options.selectLeadingAndTrailingWhitespace) {
            return oneRanges;
        }
        // add ranges that expand trivia at line starts and ends whenever a range
        // wraps onto the a new line
        const oneRangesWithTrivia = [oneRanges[0]];
        for (let i = 1; i < oneRanges.length; i++) {
            const prev = oneRanges[i - 1];
            const cur = oneRanges[i];
            if (cur.startLineNumber !== prev.startLineNumber ||
                cur.endLineNumber !== prev.endLineNumber) {
                // add line/block range without leading/failing whitespace
                const rangeNoWhitespace = new Range(prev.startLineNumber, model.getLineFirstNonWhitespaceColumn(prev.startLineNumber), prev.endLineNumber, model.getLineLastNonWhitespaceColumn(prev.endLineNumber));
                if (rangeNoWhitespace.containsRange(prev) &&
                    !rangeNoWhitespace.equalsRange(prev) &&
                    cur.containsRange(rangeNoWhitespace) &&
                    !cur.equalsRange(rangeNoWhitespace)) {
                    oneRangesWithTrivia.push(rangeNoWhitespace);
                }
                // add line/block range
                const rangeFull = new Range(prev.startLineNumber, 1, prev.endLineNumber, model.getLineMaxColumn(prev.endLineNumber));
                if (rangeFull.containsRange(prev) &&
                    !rangeFull.equalsRange(rangeNoWhitespace) &&
                    cur.containsRange(rangeFull) &&
                    !cur.equalsRange(rangeFull)) {
                    oneRangesWithTrivia.push(rangeFull);
                }
            }
            oneRangesWithTrivia.push(cur);
        }
        return oneRangesWithTrivia;
    });
}
CommandsRegistry.registerCommand('_executeSelectionRangeProvider', async function (accessor, ...args) {
    const [resource, positions] = args;
    assertType(URI.isUri(resource));
    const registry = accessor.get(ILanguageFeaturesService).selectionRangeProvider;
    const reference = await accessor.get(ITextModelService).createModelReference(resource);
    try {
        return provideSelectionRanges(registry, reference.object.textEditorModel, positions, { selectLeadingAndTrailingWhitespace: true, selectSubwords: true }, CancellationToken.None);
    }
    finally {
        reference.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hcnRTZWxlY3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbWFydFNlbGVjdC9icm93c2VyL3NtYXJ0U2VsZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSTdFLE9BQU8sRUFDTixZQUFZLEVBR1osb0JBQW9CLEVBQ3BCLDBCQUEwQixHQUUxQixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2hFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRW5GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQy9FLE9BQU8s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