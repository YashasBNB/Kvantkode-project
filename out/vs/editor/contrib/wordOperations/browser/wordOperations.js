/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, } from '../../../browser/editorExtensions.js';
import { ReplaceCommand } from '../../../common/commands/replaceCommand.js';
import { EditorOptions } from '../../../common/config/editorOptions.js';
import { CursorState } from '../../../common/cursorCommon.js';
import { WordOperations, } from '../../../common/cursor/cursorWordOperations.js';
import { getMapForWordSeparators, } from '../../../common/core/wordCharacterClassifier.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import * as nls from '../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IsWindowsContext } from '../../../../platform/contextkey/common/contextkeys.js';
export class MoveWordCommand extends EditorCommand {
    constructor(opts) {
        super(opts);
        this._inSelectionMode = opts.inSelectionMode;
        this._wordNavigationType = opts.wordNavigationType;
    }
    runEditorCommand(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const wordSeparators = getMapForWordSeparators(editor.getOption(136 /* EditorOption.wordSeparators */), editor.getOption(135 /* EditorOption.wordSegmenterLocales */));
        const model = editor.getModel();
        const selections = editor.getSelections();
        const hasMulticursor = selections.length > 1;
        const result = selections.map((sel) => {
            const inPosition = new Position(sel.positionLineNumber, sel.positionColumn);
            const outPosition = this._move(wordSeparators, model, inPosition, this._wordNavigationType, hasMulticursor);
            return this._moveTo(sel, outPosition, this._inSelectionMode);
        });
        model.pushStackElement();
        editor._getViewModel().setCursorStates('moveWordCommand', 3 /* CursorChangeReason.Explicit */, result.map((r) => CursorState.fromModelSelection(r)));
        if (result.length === 1) {
            const pos = new Position(result[0].positionLineNumber, result[0].positionColumn);
            editor.revealPosition(pos, 0 /* ScrollType.Smooth */);
        }
    }
    _moveTo(from, to, inSelectionMode) {
        if (inSelectionMode) {
            // move just position
            return new Selection(from.selectionStartLineNumber, from.selectionStartColumn, to.lineNumber, to.column);
        }
        else {
            // move everything
            return new Selection(to.lineNumber, to.column, to.lineNumber, to.column);
        }
    }
}
export class WordLeftCommand extends MoveWordCommand {
    _move(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        return WordOperations.moveWordLeft(wordSeparators, model, position, wordNavigationType, hasMulticursor);
    }
}
export class WordRightCommand extends MoveWordCommand {
    _move(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        return WordOperations.moveWordRight(wordSeparators, model, position, wordNavigationType);
    }
}
export class CursorWordStartLeft extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordStartLeft',
            precondition: undefined,
        });
    }
}
export class CursorWordEndLeft extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordEndLeft',
            precondition: undefined,
        });
    }
}
export class CursorWordLeft extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 1 /* WordNavigationType.WordStartFast */,
            id: 'cursorWordLeft',
            precondition: undefined,
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext)?.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
                mac: { primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
export class CursorWordStartLeftSelect extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordStartLeftSelect',
            precondition: undefined,
        });
    }
}
export class CursorWordEndLeftSelect extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordEndLeftSelect',
            precondition: undefined,
        });
    }
}
export class CursorWordLeftSelect extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 1 /* WordNavigationType.WordStartFast */,
            id: 'cursorWordLeftSelect',
            precondition: undefined,
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext)?.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */,
                mac: { primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
// Accessibility navigation commands should only be enabled on windows since they are tuned to what NVDA expects
export class CursorWordAccessibilityLeft extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 3 /* WordNavigationType.WordAccessibility */,
            id: 'cursorWordAccessibilityLeft',
            precondition: undefined,
        });
    }
    _move(wordCharacterClassifier, model, position, wordNavigationType, hasMulticursor) {
        return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue, wordCharacterClassifier.intlSegmenterLocales), model, position, wordNavigationType, hasMulticursor);
    }
}
export class CursorWordAccessibilityLeftSelect extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 3 /* WordNavigationType.WordAccessibility */,
            id: 'cursorWordAccessibilityLeftSelect',
            precondition: undefined,
        });
    }
    _move(wordCharacterClassifier, model, position, wordNavigationType, hasMulticursor) {
        return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue, wordCharacterClassifier.intlSegmenterLocales), model, position, wordNavigationType, hasMulticursor);
    }
}
export class CursorWordStartRight extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordStartRight',
            precondition: undefined,
        });
    }
}
export class CursorWordEndRight extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordEndRight',
            precondition: undefined,
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext)?.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                mac: { primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
export class CursorWordRight extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordRight',
            precondition: undefined,
        });
    }
}
export class CursorWordStartRightSelect extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordStartRightSelect',
            precondition: undefined,
        });
    }
}
export class CursorWordEndRightSelect extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordEndRightSelect',
            precondition: undefined,
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext)?.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */,
                mac: { primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
export class CursorWordRightSelect extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordRightSelect',
            precondition: undefined,
        });
    }
}
export class CursorWordAccessibilityRight extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 3 /* WordNavigationType.WordAccessibility */,
            id: 'cursorWordAccessibilityRight',
            precondition: undefined,
        });
    }
    _move(wordCharacterClassifier, model, position, wordNavigationType, hasMulticursor) {
        return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue, wordCharacterClassifier.intlSegmenterLocales), model, position, wordNavigationType, hasMulticursor);
    }
}
export class CursorWordAccessibilityRightSelect extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 3 /* WordNavigationType.WordAccessibility */,
            id: 'cursorWordAccessibilityRightSelect',
            precondition: undefined,
        });
    }
    _move(wordCharacterClassifier, model, position, wordNavigationType, hasMulticursor) {
        return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue, wordCharacterClassifier.intlSegmenterLocales), model, position, wordNavigationType, hasMulticursor);
    }
}
export class DeleteWordCommand extends EditorCommand {
    constructor(opts) {
        super(opts);
        this._whitespaceHeuristics = opts.whitespaceHeuristics;
        this._wordNavigationType = opts.wordNavigationType;
    }
    runEditorCommand(accessor, editor, args) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        if (!editor.hasModel()) {
            return;
        }
        const wordSeparators = getMapForWordSeparators(editor.getOption(136 /* EditorOption.wordSeparators */), editor.getOption(135 /* EditorOption.wordSegmenterLocales */));
        const model = editor.getModel();
        const selections = editor.getSelections();
        const autoClosingBrackets = editor.getOption(6 /* EditorOption.autoClosingBrackets */);
        const autoClosingQuotes = editor.getOption(11 /* EditorOption.autoClosingQuotes */);
        const autoClosingPairs = languageConfigurationService
            .getLanguageConfiguration(model.getLanguageId())
            .getAutoClosingPairs();
        const viewModel = editor._getViewModel();
        const commands = selections.map((sel) => {
            const deleteRange = this._delete({
                wordSeparators,
                model,
                selection: sel,
                whitespaceHeuristics: this._whitespaceHeuristics,
                autoClosingDelete: editor.getOption(9 /* EditorOption.autoClosingDelete */),
                autoClosingBrackets,
                autoClosingQuotes,
                autoClosingPairs,
                autoClosedCharacters: viewModel.getCursorAutoClosedCharacters(),
            }, this._wordNavigationType);
            return new ReplaceCommand(deleteRange, '');
        });
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
export class DeleteWordLeftCommand extends DeleteWordCommand {
    _delete(ctx, wordNavigationType) {
        const r = WordOperations.deleteWordLeft(ctx, wordNavigationType);
        if (r) {
            return r;
        }
        return new Range(1, 1, 1, 1);
    }
}
export class DeleteWordRightCommand extends DeleteWordCommand {
    _delete(ctx, wordNavigationType) {
        const r = WordOperations.deleteWordRight(ctx, wordNavigationType);
        if (r) {
            return r;
        }
        const lineCount = ctx.model.getLineCount();
        const maxColumn = ctx.model.getLineMaxColumn(lineCount);
        return new Range(lineCount, maxColumn, lineCount, maxColumn);
    }
}
export class DeleteWordStartLeft extends DeleteWordLeftCommand {
    constructor() {
        super({
            whitespaceHeuristics: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'deleteWordStartLeft',
            precondition: EditorContextKeys.writable,
        });
    }
}
export class DeleteWordEndLeft extends DeleteWordLeftCommand {
    constructor() {
        super({
            whitespaceHeuristics: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'deleteWordEndLeft',
            precondition: EditorContextKeys.writable,
        });
    }
}
export class DeleteWordLeft extends DeleteWordLeftCommand {
    constructor() {
        super({
            whitespaceHeuristics: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'deleteWordLeft',
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                mac: { primary: 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
export class DeleteWordStartRight extends DeleteWordRightCommand {
    constructor() {
        super({
            whitespaceHeuristics: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'deleteWordStartRight',
            precondition: EditorContextKeys.writable,
        });
    }
}
export class DeleteWordEndRight extends DeleteWordRightCommand {
    constructor() {
        super({
            whitespaceHeuristics: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'deleteWordEndRight',
            precondition: EditorContextKeys.writable,
        });
    }
}
export class DeleteWordRight extends DeleteWordRightCommand {
    constructor() {
        super({
            whitespaceHeuristics: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'deleteWordRight',
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 20 /* KeyCode.Delete */,
                mac: { primary: 512 /* KeyMod.Alt */ | 20 /* KeyCode.Delete */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
export class DeleteInsideWord extends EditorAction {
    constructor() {
        super({
            id: 'deleteInsideWord',
            precondition: EditorContextKeys.writable,
            label: nls.localize2('deleteInsideWord', 'Delete Word'),
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const wordSeparators = getMapForWordSeparators(editor.getOption(136 /* EditorOption.wordSeparators */), editor.getOption(135 /* EditorOption.wordSegmenterLocales */));
        const model = editor.getModel();
        const selections = editor.getSelections();
        const commands = selections.map((sel) => {
            const deleteRange = WordOperations.deleteInsideWord(wordSeparators, model, sel);
            return new ReplaceCommand(deleteRange, '');
        });
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
registerEditorCommand(new CursorWordStartLeft());
registerEditorCommand(new CursorWordEndLeft());
registerEditorCommand(new CursorWordLeft());
registerEditorCommand(new CursorWordStartLeftSelect());
registerEditorCommand(new CursorWordEndLeftSelect());
registerEditorCommand(new CursorWordLeftSelect());
registerEditorCommand(new CursorWordStartRight());
registerEditorCommand(new CursorWordEndRight());
registerEditorCommand(new CursorWordRight());
registerEditorCommand(new CursorWordStartRightSelect());
registerEditorCommand(new CursorWordEndRightSelect());
registerEditorCommand(new CursorWordRightSelect());
registerEditorCommand(new CursorWordAccessibilityLeft());
registerEditorCommand(new CursorWordAccessibilityLeftSelect());
registerEditorCommand(new CursorWordAccessibilityRight());
registerEditorCommand(new CursorWordAccessibilityRightSelect());
registerEditorCommand(new DeleteWordStartLeft());
registerEditorCommand(new DeleteWordEndLeft());
registerEditorCommand(new DeleteWordLeft());
registerEditorCommand(new DeleteWordStartRight());
registerEditorCommand(new DeleteWordEndRight());
registerEditorCommand(new DeleteWordRight());
registerEditorAction(DeleteInsideWord);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi93b3JkT3BlcmF0aW9ucy9icm93c2VyL3dvcmRPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFDTixZQUFZLEVBQ1osYUFBYSxFQUViLG9CQUFvQixFQUNwQixxQkFBcUIsR0FFckIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDM0UsT0FBTyxFQUFnQixhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFN0QsT0FBTyxFQUdOLGNBQWMsR0FDZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTix1QkFBdUIsR0FFdkIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMxRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtB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