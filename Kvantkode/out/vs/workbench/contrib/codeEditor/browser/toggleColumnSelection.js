/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CoreNavigationCommands } from '../../../../editor/browser/coreCommands.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Selection } from '../../../../editor/common/core/selection.js';
export class ToggleColumnSelectionAction extends Action2 {
    static { this.ID = 'editor.action.toggleColumnSelection'; }
    constructor() {
        super({
            id: ToggleColumnSelectionAction.ID,
            title: {
                ...localize2('toggleColumnSelection', 'Toggle Column Selection Mode'),
                mnemonicTitle: localize({ key: 'miColumnSelection', comment: ['&& denotes a mnemonic'] }, 'Column &&Selection Mode'),
            },
            f1: true,
            toggled: ContextKeyExpr.equals('config.editor.columnSelection', true),
            menu: {
                id: MenuId.MenubarSelectionMenu,
                group: '4_config',
                order: 2,
            },
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const oldValue = configurationService.getValue('editor.columnSelection');
        const codeEditor = this._getCodeEditor(codeEditorService);
        await configurationService.updateValue('editor.columnSelection', !oldValue);
        const newValue = configurationService.getValue('editor.columnSelection');
        if (!codeEditor ||
            codeEditor !== this._getCodeEditor(codeEditorService) ||
            oldValue === newValue ||
            !codeEditor.hasModel() ||
            typeof oldValue !== 'boolean' ||
            typeof newValue !== 'boolean') {
            return;
        }
        const viewModel = codeEditor._getViewModel();
        if (codeEditor.getOption(22 /* EditorOption.columnSelection */)) {
            const selection = codeEditor.getSelection();
            const modelSelectionStart = new Position(selection.selectionStartLineNumber, selection.selectionStartColumn);
            const viewSelectionStart = viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelSelectionStart);
            const modelPosition = new Position(selection.positionLineNumber, selection.positionColumn);
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: modelSelectionStart,
                viewPosition: viewSelectionStart,
            });
            const visibleColumn = viewModel.cursorConfig.visibleColumnFromColumn(viewModel, viewPosition);
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: modelPosition,
                viewPosition: viewPosition,
                doColumnSelect: true,
                mouseColumn: visibleColumn + 1,
            });
        }
        else {
            const columnSelectData = viewModel.getCursorColumnSelectData();
            const fromViewColumn = viewModel.cursorConfig.columnFromVisibleColumn(viewModel, columnSelectData.fromViewLineNumber, columnSelectData.fromViewVisualColumn);
            const fromPosition = viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(columnSelectData.fromViewLineNumber, fromViewColumn));
            const toViewColumn = viewModel.cursorConfig.columnFromVisibleColumn(viewModel, columnSelectData.toViewLineNumber, columnSelectData.toViewVisualColumn);
            const toPosition = viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(columnSelectData.toViewLineNumber, toViewColumn));
            codeEditor.setSelection(new Selection(fromPosition.lineNumber, fromPosition.column, toPosition.lineNumber, toPosition.column));
        }
    }
    _getCodeEditor(codeEditorService) {
        const codeEditor = codeEditorService.getFocusedCodeEditor();
        if (codeEditor) {
            return codeEditor;
        }
        return codeEditorService.getActiveCodeEditor();
    }
}
registerAction2(ToggleColumnSelectionAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlQ29sdW1uU2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvdG9nZ2xlQ29sdW1uU2VsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRzdGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHdkUsTUFBTSxPQUFPLDJCQUE0QixTQUFRLE9BQU87YUFDdkMsT0FBRSxHQUFHLHFDQUFxQyxDQUFBO0lBRTFEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDJCQUEyQixDQUFDLEVBQUU7WUFDbEMsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLHVCQUF1QixFQUFFLDhCQUE4QixDQUFDO2dCQUNyRSxhQUFhLEVBQUUsUUFBUSxDQUN0QixFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ2hFLHlCQUF5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