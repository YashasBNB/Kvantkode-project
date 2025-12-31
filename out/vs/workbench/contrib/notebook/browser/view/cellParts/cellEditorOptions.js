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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXRvck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxFZGl0b3JPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUd2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFDTixPQUFPLEVBQ1AsTUFBTSxFQUNOLGVBQWUsR0FDZixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sMEVBQTBFLENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRSxPQUFPLEVBR04sdUJBQXVCLEVBQ3ZCLHlCQUF5QixHQUN6QixNQUFNLGlDQUFpQyxDQUFBO0FBRXhDLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsdUJBQXVCLEdBQ3ZCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2hELE9BQU8sRUFBZ0Msa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUtwRyw0Q0FBNEM7QUFDNUMsTUFBTSxPQUFPLGlCQUFrQixTQUFRLGVBQWU7SUFNckQsSUFBSSxPQUFPLENBQUMsS0FBeUI7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