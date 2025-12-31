/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorCommand } from '../../../browser/editorExtensions.js';
import { WordPartOperations, } from '../../../common/cursor/cursorWordOperations.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { DeleteWordCommand, MoveWordCommand } from '../../wordOperations/browser/wordOperations.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
export class DeleteWordPartLeft extends DeleteWordCommand {
    constructor() {
        super({
            whitespaceHeuristics: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'deleteWordPartLeft',
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    _delete(ctx, wordNavigationType) {
        const r = WordPartOperations.deleteWordPartLeft(ctx);
        if (r) {
            return r;
        }
        return new Range(1, 1, 1, 1);
    }
}
export class DeleteWordPartRight extends DeleteWordCommand {
    constructor() {
        super({
            whitespaceHeuristics: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'deleteWordPartRight',
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 20 /* KeyCode.Delete */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    _delete(ctx, wordNavigationType) {
        const r = WordPartOperations.deleteWordPartRight(ctx);
        if (r) {
            return r;
        }
        const lineCount = ctx.model.getLineCount();
        const maxColumn = ctx.model.getLineMaxColumn(lineCount);
        return new Range(lineCount, maxColumn, lineCount, maxColumn);
    }
}
export class WordPartLeftCommand extends MoveWordCommand {
    _move(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        return WordPartOperations.moveWordPartLeft(wordSeparators, model, position, hasMulticursor);
    }
}
export class CursorWordPartLeft extends WordPartLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordPartLeft',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
// Register previous id for compatibility purposes
CommandsRegistry.registerCommandAlias('cursorWordPartStartLeft', 'cursorWordPartLeft');
export class CursorWordPartLeftSelect extends WordPartLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordPartLeftSelect',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
// Register previous id for compatibility purposes
CommandsRegistry.registerCommandAlias('cursorWordPartStartLeftSelect', 'cursorWordPartLeftSelect');
export class WordPartRightCommand extends MoveWordCommand {
    _move(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        return WordPartOperations.moveWordPartRight(wordSeparators, model, position);
    }
}
export class CursorWordPartRight extends WordPartRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordPartRight',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
export class CursorWordPartRightSelect extends WordPartRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordPartRightSelect',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
registerEditorCommand(new DeleteWordPartLeft());
registerEditorCommand(new DeleteWordPartRight());
registerEditorCommand(new CursorWordPartLeft());
registerEditorCommand(new CursorWordPartLeftSelect());
registerEditorCommand(new CursorWordPartRight());
registerEditorCommand(new CursorWordPartRightSelect());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZFBhcnRPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvd29yZFBhcnRPcGVyYXRpb25zL2Jyb3dzZXIvd29yZFBhcnRPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVFLE9BQU8sRUFHTixrQkFBa0IsR0FDbEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUd2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBR25GLE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxpQkFBaUI7SUFDeEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxvQkFBb0IsRUFBRSxJQUFJO1lBQzFCLGtCQUFrQixzQ0FBOEI7WUFDaEQsRUFBRSxFQUFFLG9CQUFvQjtZQUN4QixZQUFZLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtZQUN4QyxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLGNBQWM7Z0JBQ3hDLE9BQU8sRUFBRSxDQUFDO2dCQUNWLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSwrQ0FBMkIsNEJBQW9CLEVBQUU7Z0JBQ2pFLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVTLE9BQU8sQ0FBQyxHQUFzQixFQUFFLGtCQUFzQztRQUMvRSxNQUFNLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0Is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