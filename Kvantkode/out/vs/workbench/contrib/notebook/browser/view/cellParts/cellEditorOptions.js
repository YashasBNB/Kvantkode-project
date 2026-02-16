/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../base/common/event.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { Action2, MenuId, registerAction2, } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { ActiveEditorContext } from '../../../../../common/contextkeys.js';
import { NotebookMultiCellAction, NOTEBOOK_ACTIONS_CATEGORY, } from '../../controller/coreActions.js';
import { NOTEBOOK_CELL_LINE_NUMBERS, NOTEBOOK_EDITOR_FOCUSED, } from '../../../common/notebookContextKeys.js';
import { CellContentPart } from '../cellPart.js';
import { NOTEBOOK_EDITOR_ID } from '../../../common/notebookCommon.js';
//todo@Yoyokrazy implenets is needed or not?
export class CellEditorOptions extends CellContentPart {
    set tabSize(value) {
        if (this._tabSize !== value) {
            this._tabSize = value;
            this._onDidChange.fire();
        }
    }
    get tabSize() {
        return this._tabSize;
    }
    set indentSize(value) {
        if (this._indentSize !== value) {
            this._indentSize = value;
            this._onDidChange.fire();
        }
    }
    get indentSize() {
        return this._indentSize;
    }
    set insertSpaces(value) {
        if (this._insertSpaces !== value) {
            this._insertSpaces = value;
            this._onDidChange.fire();
        }
    }
    get insertSpaces() {
        return this._insertSpaces;
    }
    constructor(base, notebookOptions, configurationService) {
        super();
        this.base = base;
        this.notebookOptions = notebookOptions;
        this.configurationService = configurationService;
        this._lineNumbers = 'inherit';
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(base.onDidChange(() => {
            this._recomputeOptions();
        }));
        this._value = this._computeEditorOptions();
    }
    updateState(element, e) {
        if (e.cellLineNumberChanged) {
            this.setLineNumbers(element.lineNumbers);
        }
    }
    _recomputeOptions() {
        this._value = this._computeEditorOptions();
        this._onDidChange.fire();
    }
    _computeEditorOptions() {
        const value = this.base.value; // base IEditorOptions
        // TODO @Yoyokrazy find a different way to get the editor overrides, this is not the right way
        const cellEditorOverridesRaw = this.notebookOptions.getDisplayOptions().editorOptionsCustomizations;
        const indentSize = cellEditorOverridesRaw?.['editor.indentSize'];
        if (indentSize !== undefined) {
            this.indentSize = indentSize;
        }
        const insertSpaces = cellEditorOverridesRaw?.['editor.insertSpaces'];
        if (insertSpaces !== undefined) {
            this.insertSpaces = insertSpaces;
        }
        const tabSize = cellEditorOverridesRaw?.['editor.tabSize'];
        if (tabSize !== undefined) {
            this.tabSize = tabSize;
        }
        let cellRenderLineNumber = value.lineNumbers;
        switch (this._lineNumbers) {
            case 'inherit':
                // inherit from the notebook setting
                if (this.configurationService.getValue('notebook.lineNumbers') === 'on') {
                    if (value.lineNumbers === 'off') {
                        cellRenderLineNumber = 'on';
                    } // otherwise just use the editor setting
                }
                else {
                    cellRenderLineNumber = 'off';
                }
                break;
            case 'on':
                // should turn on, ignore the editor line numbers off options
                if (value.lineNumbers === 'off') {
                    cellRenderLineNumber = 'on';
                } // otherwise just use the editor setting
                break;
            case 'off':
                cellRenderLineNumber = 'off';
                break;
        }
        const overrides = {};
        if (value.lineNumbers !== cellRenderLineNumber) {
            overrides.lineNumbers = cellRenderLineNumber;
        }
        if (this.notebookOptions.getLayoutConfiguration().disableRulers) {
            overrides.rulers = [];
        }
        return {
            ...value,
            ...overrides,
        };
    }
    getUpdatedValue(internalMetadata, cellUri) {
        const options = this.getValue(internalMetadata, cellUri);
        delete options.hover; // This is toggled by a debug editor contribution
        return options;
    }
    getValue(internalMetadata, cellUri) {
        return {
            ...this._value,
            ...{
                padding: this.notebookOptions.computeEditorPadding(internalMetadata, cellUri),
            },
        };
    }
    getDefaultValue() {
        return {
            ...this._value,
            ...{
                padding: { top: 12, bottom: 12 },
            },
        };
    }
    setLineNumbers(lineNumbers) {
        this._lineNumbers = lineNumbers;
        this._recomputeOptions();
    }
}
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    properties: {
        'notebook.lineNumbers': {
            type: 'string',
            enum: ['off', 'on'],
            default: 'off',
            markdownDescription: localize('notebook.lineNumbers', 'Controls the display of line numbers in the cell editor.'),
        },
    },
});
registerAction2(class ToggleLineNumberAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggleLineNumbers',
            title: localize2('notebook.toggleLineNumbers', 'Toggle Notebook Line Numbers'),
            precondition: NOTEBOOK_EDITOR_FOCUSED,
            menu: [
                {
                    id: MenuId.NotebookToolbar,
                    group: 'notebookLayout',
                    order: 2,
                    when: ContextKeyExpr.equals('config.notebook.globalToolbar', true),
                },
            ],
            category: NOTEBOOK_ACTIONS_CATEGORY,
            f1: true,
            toggled: {
                condition: ContextKeyExpr.notEquals('config.notebook.lineNumbers', 'off'),
                title: localize('notebook.showLineNumbers', 'Notebook Line Numbers'),
            },
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const renderLiNumbers = configurationService.getValue('notebook.lineNumbers') === 'on';
        if (renderLiNumbers) {
            configurationService.updateValue('notebook.lineNumbers', 'off');
        }
        else {
            configurationService.updateValue('notebook.lineNumbers', 'on');
        }
    }
});
registerAction2(class ToggleActiveLineNumberAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: 'notebook.cell.toggleLineNumbers',
            title: localize('notebook.cell.toggleLineNumbers.title', 'Show Cell Line Numbers'),
            precondition: ActiveEditorContext.isEqualTo(NOTEBOOK_EDITOR_ID),
            menu: [
                {
                    id: MenuId.NotebookCellTitle,
                    group: 'View',
                    order: 1,
                },
            ],
            toggled: ContextKeyExpr.or(NOTEBOOK_CELL_LINE_NUMBERS.isEqualTo('on'), ContextKeyExpr.and(NOTEBOOK_CELL_LINE_NUMBERS.isEqualTo('inherit'), ContextKeyExpr.equals('config.notebook.lineNumbers', 'on'))),
        });
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            this.updateCell(accessor.get(IConfigurationService), context.cell);
        }
        else {
            const configurationService = accessor.get(IConfigurationService);
            context.selectedCells.forEach((cell) => {
                this.updateCell(configurationService, cell);
            });
        }
    }
    updateCell(configurationService, cell) {
        const renderLineNumbers = configurationService.getValue('notebook.lineNumbers') === 'on';
        const cellLineNumbers = cell.lineNumbers;
        // 'on', 'inherit' 	-> 'on'
        // 'on', 'off'		-> 'off'
        // 'on', 'on'		-> 'on'
        // 'off', 'inherit'	-> 'off'
        // 'off', 'off'		-> 'off'
        // 'off', 'on'		-> 'on'
        const currentLineNumberIsOn = cellLineNumbers === 'on' || (cellLineNumbers === 'inherit' && renderLineNumbers);
        if (currentLineNumberIsOn) {
            cell.lineNumbers = 'off';
        }
        else {
            cell.lineNumbers = 'on';
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXRvck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbEVkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHdDQUF3QyxDQUFBO0FBR3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUNOLE9BQU8sRUFDUCxNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSwwRUFBMEUsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFHTix1QkFBdUIsRUFDdkIseUJBQXlCLEdBQ3pCLE1BQU0saUNBQWlDLENBQUE7QUFFeEMsT0FBTyxFQUNOLDBCQUEwQixFQUMxQix1QkFBdUIsR0FDdkIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDaEQsT0FBTyxFQUFnQyxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBS3BHLDRDQUE0QztBQUM1QyxNQUFNLE9BQU8saUJBQWtCLFNBQVEsZUFBZTtJQU1y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