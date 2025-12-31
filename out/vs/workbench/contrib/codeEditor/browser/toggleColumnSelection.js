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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlQ29sdW1uU2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3RvZ2dsZUNvbHVtblNlbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUc3RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBR3ZFLE1BQU0sT0FBTywyQkFBNEIsU0FBUSxPQUFPO2FBQ3ZDLE9BQUUsR0FBRyxxQ0FBcUMsQ0FBQTtJQUUxRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwyQkFBMkIsQ0FBQyxFQUFFO1lBQ2xDLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSw4QkFBOEIsQ0FBQztnQkFDckUsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUNoRSx5QkFBeUIsQ0FDekI7YUFDRDtZQUNELEVBQUUs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