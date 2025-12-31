/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { EditorAction, registerEditorAction, } from '../../../browser/editorExtensions.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { BlockCommentCommand } from './blockCommentCommand.js';
import { LineCommentCommand } from './lineCommentCommand.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
class CommentLineAction extends EditorAction {
    constructor(type, opts) {
        super(opts);
        this._type = type;
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const commands = [];
        const modelOptions = model.getOptions();
        const commentsOptions = editor.getOption(23 /* EditorOption.comments */);
        const selections = editor
            .getSelections()
            .map((selection, index) => ({ selection, index, ignoreFirstLine: false }));
        selections.sort((a, b) => Range.compareRangesUsingStarts(a.selection, b.selection));
        // Remove selections that would result in copying the same line
        let prev = selections[0];
        for (let i = 1; i < selections.length; i++) {
            const curr = selections[i];
            if (prev.selection.endLineNumber === curr.selection.startLineNumber) {
                // these two selections would copy the same line
                if (prev.index < curr.index) {
                    // prev wins
                    curr.ignoreFirstLine = true;
                }
                else {
                    // curr wins
                    prev.ignoreFirstLine = true;
                    prev = curr;
                }
            }
        }
        for (const selection of selections) {
            commands.push(new LineCommentCommand(languageConfigurationService, selection.selection, modelOptions.indentSize, this._type, commentsOptions.insertSpace, commentsOptions.ignoreEmptyLines, selection.ignoreFirstLine));
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
class ToggleCommentLineAction extends CommentLineAction {
    constructor() {
        super(0 /* Type.Toggle */, {
            id: 'editor.action.commentLine',
            label: nls.localize2('comment.line', 'Toggle Line Comment'),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarEditMenu,
                group: '5_insert',
                title: nls.localize({ key: 'miToggleLineComment', comment: ['&& denotes a mnemonic'] }, '&&Toggle Line Comment'),
                order: 1,
            },
        });
    }
}
class AddLineCommentAction extends CommentLineAction {
    constructor() {
        super(1 /* Type.ForceAdd */, {
            id: 'editor.action.addCommentLine',
            label: nls.localize2('comment.line.add', 'Add Line Comment'),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
class RemoveLineCommentAction extends CommentLineAction {
    constructor() {
        super(2 /* Type.ForceRemove */, {
            id: 'editor.action.removeCommentLine',
            label: nls.localize2('comment.line.remove', 'Remove Line Comment'),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
class BlockCommentAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.blockComment',
            label: nls.localize2('comment.block', 'Toggle Block Comment'),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarEditMenu,
                group: '5_insert',
                title: nls.localize({ key: 'miToggleBlockComment', comment: ['&& denotes a mnemonic'] }, 'Toggle &&Block Comment'),
                order: 2,
            },
        });
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        if (!editor.hasModel()) {
            return;
        }
        const commentsOptions = editor.getOption(23 /* EditorOption.comments */);
        const commands = [];
        const selections = editor.getSelections();
        for (const selection of selections) {
            commands.push(new BlockCommentCommand(selection, commentsOptions.insertSpace, languageConfigurationService));
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
registerEditorAction(ToggleCommentLineAction);
registerEditorAction(AddLineCommentAction);
registerEditorAction(RemoveLineCommentAction);
registerEditorAction(BlockCommentAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbW1lbnQvYnJvd3Nlci9jb21tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFFL0UsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsR0FFcEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFRLE1BQU0seUJBQXlCLENBQUE7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHdkUsTUFBZSxpQkFBa0IsU0FBUSxZQUFZO0lBR3BELFlBQVksSUFBVSxFQUFFLElBQW9CO1FBQzNDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNYLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO0lBQ2xCLENBQUM7SUFFTSxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN6RCxNQUFNLDRCQUE0QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtRQUVoRixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEtBQUss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