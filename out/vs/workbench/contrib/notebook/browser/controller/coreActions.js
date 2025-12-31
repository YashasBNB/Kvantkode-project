/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry, } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { getNotebookEditorFromEditorPane, cellRangeToViewCells, } from '../notebookBrowser.js';
import { INTERACTIVE_WINDOW_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_KERNEL_COUNT, NOTEBOOK_KERNEL_SOURCE_COUNT, REPL_NOTEBOOK_IS_ACTIVE_EDITOR, } from '../../common/notebookContextKeys.js';
import { isICellRange } from '../../common/notebookRange.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isEditorCommandsContext } from '../../../../common/editor.js';
import { INotebookEditorService } from '../services/notebookEditorService.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { isEqual } from '../../../../../base/common/resources.js';
// Kernel Command
export const SELECT_KERNEL_ID = '_notebook.selectKernel';
export const NOTEBOOK_ACTIONS_CATEGORY = localize2('notebookActions.category', 'Notebook');
export const CELL_TITLE_CELL_GROUP_ID = 'inline/cell';
export const CELL_TITLE_OUTPUT_GROUP_ID = 'inline/output';
export const NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT = 100 /* KeybindingWeight.EditorContrib */; // smaller than Suggest Widget, etc
export const NOTEBOOK_OUTPUT_WEBVIEW_ACTION_WEIGHT = 200 /* KeybindingWeight.WorkbenchContrib */ + 1; // higher than Workbench contribution (such as Notebook List View), etc
export var CellToolbarOrder;
(function (CellToolbarOrder) {
    CellToolbarOrder[CellToolbarOrder["RunSection"] = 0] = "RunSection";
    CellToolbarOrder[CellToolbarOrder["EditCell"] = 1] = "EditCell";
    CellToolbarOrder[CellToolbarOrder["ExecuteAboveCells"] = 2] = "ExecuteAboveCells";
    CellToolbarOrder[CellToolbarOrder["ExecuteCellAndBelow"] = 3] = "ExecuteCellAndBelow";
    CellToolbarOrder[CellToolbarOrder["SaveCell"] = 4] = "SaveCell";
    CellToolbarOrder[CellToolbarOrder["SplitCell"] = 5] = "SplitCell";
    CellToolbarOrder[CellToolbarOrder["ClearCellOutput"] = 6] = "ClearCellOutput";
})(CellToolbarOrder || (CellToolbarOrder = {}));
export var CellOverflowToolbarGroups;
(function (CellOverflowToolbarGroups) {
    CellOverflowToolbarGroups["Copy"] = "1_copy";
    CellOverflowToolbarGroups["Insert"] = "2_insert";
    CellOverflowToolbarGroups["Edit"] = "3_edit";
    CellOverflowToolbarGroups["Share"] = "4_share";
})(CellOverflowToolbarGroups || (CellOverflowToolbarGroups = {}));
export function getContextFromActiveEditor(editorService) {
    const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    if (!editor || !editor.hasModel()) {
        return;
    }
    const activeCell = editor.getActiveCell();
    const selectedCells = editor.getSelectionViewModels();
    return {
        cell: activeCell,
        selectedCells,
        notebookEditor: editor,
    };
}
function getWidgetFromUri(accessor, uri) {
    const notebookEditorService = accessor.get(INotebookEditorService);
    const widget = notebookEditorService
        .listNotebookEditors()
        .find((widget) => widget.hasModel() && widget.textModel.uri.toString() === uri.toString());
    if (widget && widget.hasModel()) {
        return widget;
    }
    return undefined;
}
export function getContextFromUri(accessor, context) {
    const uri = URI.revive(context);
    if (uri) {
        const widget = getWidgetFromUri(accessor, uri);
        if (widget) {
            return {
                notebookEditor: widget,
            };
        }
    }
    return undefined;
}
export function findTargetCellEditor(context, targetCell) {
    let foundEditor = undefined;
    for (const [, codeEditor] of context.notebookEditor.codeEditors) {
        if (isEqual(codeEditor.getModel()?.uri, targetCell.uri)) {
            foundEditor = codeEditor;
            break;
        }
    }
    return foundEditor;
}
export class NotebookAction extends Action2 {
    constructor(desc) {
        if (desc.f1 !== false) {
            desc.f1 = false;
            const f1Menu = {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.or(NOTEBOOK_IS_ACTIVE_EDITOR, INTERACTIVE_WINDOW_IS_ACTIVE_EDITOR, REPL_NOTEBOOK_IS_ACTIVE_EDITOR),
            };
            if (!desc.menu) {
                desc.menu = [];
            }
            else if (!Array.isArray(desc.menu)) {
                desc.menu = [desc.menu];
            }
            desc.menu = [...desc.menu, f1Menu];
        }
        desc.category = NOTEBOOK_ACTIONS_CATEGORY;
        super(desc);
    }
    async run(accessor, context, ...additionalArgs) {
        sendEntryTelemetry(accessor, this.desc.id, context);
        if (!this.isNotebookActionContext(context)) {
            context = this.getEditorContextFromArgsOrActive(accessor, context, ...additionalArgs);
            if (!context) {
                return;
            }
        }
        return this.runWithContext(accessor, context);
    }
    isNotebookActionContext(context) {
        return !!context && !!context.notebookEditor;
    }
    getEditorContextFromArgsOrActive(accessor, context, ...additionalArgs) {
        return getContextFromActiveEditor(accessor.get(IEditorService));
    }
}
// todo@rebornix, replace NotebookAction with this
export class NotebookMultiCellAction extends Action2 {
    constructor(desc) {
        if (desc.f1 !== false) {
            desc.f1 = false;
            const f1Menu = {
                id: MenuId.CommandPalette,
                when: NOTEBOOK_IS_ACTIVE_EDITOR,
            };
            if (!desc.menu) {
                desc.menu = [];
            }
            else if (!Array.isArray(desc.menu)) {
                desc.menu = [desc.menu];
            }
            desc.menu = [...desc.menu, f1Menu];
        }
        desc.category = NOTEBOOK_ACTIONS_CATEGORY;
        super(desc);
    }
    parseArgs(accessor, ...args) {
        return undefined;
    }
    /**
     * The action/command args are resolved in following order
     * `run(accessor, cellToolbarContext)` from cell toolbar
     * `run(accessor, ...args)` from command service with arguments
     * `run(accessor, undefined)` from keyboard shortcuts, command palatte, etc
     */
    async run(accessor, ...additionalArgs) {
        const context = additionalArgs[0];
        sendEntryTelemetry(accessor, this.desc.id, context);
        const isFromCellToolbar = isCellToolbarContext(context);
        if (isFromCellToolbar) {
            return this.runWithContext(accessor, context);
        }
        // handle parsed args
        const parsedArgs = this.parseArgs(accessor, ...additionalArgs);
        if (parsedArgs) {
            return this.runWithContext(accessor, parsedArgs);
        }
        // no parsed args, try handle active editor
        const editor = getEditorFromArgsOrActivePane(accessor);
        if (editor) {
            const selectedCellRange = editor.getSelections().length === 0 ? [editor.getFocus()] : editor.getSelections();
            return this.runWithContext(accessor, {
                ui: false,
                notebookEditor: editor,
                selectedCells: cellRangeToViewCells(editor, selectedCellRange),
            });
        }
    }
}
export class NotebookCellAction extends NotebookAction {
    isCellActionContext(context) {
        return (!!context &&
            !!context.notebookEditor &&
            !!context.cell);
    }
    getCellContextFromArgs(accessor, context, ...additionalArgs) {
        return undefined;
    }
    async run(accessor, context, ...additionalArgs) {
        sendEntryTelemetry(accessor, this.desc.id, context);
        if (this.isCellActionContext(context)) {
            return this.runWithContext(accessor, context);
        }
        const contextFromArgs = this.getCellContextFromArgs(accessor, context, ...additionalArgs);
        if (contextFromArgs) {
            return this.runWithContext(accessor, contextFromArgs);
        }
        const activeEditorContext = this.getEditorContextFromArgsOrActive(accessor);
        if (this.isCellActionContext(activeEditorContext)) {
            return this.runWithContext(accessor, activeEditorContext);
        }
    }
}
export const executeNotebookCondition = ContextKeyExpr.or(ContextKeyExpr.greater(NOTEBOOK_KERNEL_COUNT.key, 0), ContextKeyExpr.greater(NOTEBOOK_KERNEL_SOURCE_COUNT.key, 0));
function sendEntryTelemetry(accessor, id, context) {
    if (context) {
        const telemetryService = accessor.get(ITelemetryService);
        if (context.source) {
            telemetryService.publicLog2('workbenchActionExecuted', { id: id, from: context.source });
        }
        else if (URI.isUri(context)) {
            telemetryService.publicLog2('workbenchActionExecuted', { id: id, from: 'cellEditorContextMenu' });
        }
        else if (context && 'from' in context && context.from === 'cellContainer') {
            telemetryService.publicLog2('workbenchActionExecuted', { id: id, from: 'cellContainer' });
        }
        else {
            const from = isCellToolbarContext(context)
                ? 'cellToolbar'
                : isEditorCommandsContext(context)
                    ? 'editorToolbar'
                    : 'other';
            telemetryService.publicLog2('workbenchActionExecuted', { id: id, from: from });
        }
    }
}
function isCellToolbarContext(context) {
    return (!!context &&
        !!context.notebookEditor &&
        context.$mid === 13 /* MarshalledId.NotebookCellActionContext */);
}
function isMultiCellArgs(arg) {
    if (arg === undefined) {
        return false;
    }
    const ranges = arg.ranges;
    if (!ranges) {
        return false;
    }
    if (!Array.isArray(ranges) || ranges.some((range) => !isICellRange(range))) {
        return false;
    }
    if (arg.document) {
        const uri = URI.revive(arg.document);
        if (!uri) {
            return false;
        }
    }
    return true;
}
export function getEditorFromArgsOrActivePane(accessor, context) {
    const editorFromUri = getContextFromUri(accessor, context)?.notebookEditor;
    if (editorFromUri) {
        return editorFromUri;
    }
    const editor = getNotebookEditorFromEditorPane(accessor.get(IEditorService).activeEditorPane);
    if (!editor || !editor.hasModel()) {
        return;
    }
    return editor;
}
export function parseMultiCellExecutionArgs(accessor, ...args) {
    const firstArg = args[0];
    if (isMultiCellArgs(firstArg)) {
        const editor = getEditorFromArgsOrActivePane(accessor, firstArg.document);
        if (!editor) {
            return;
        }
        const ranges = firstArg.ranges;
        const selectedCells = ranges.map((range) => editor.getCellsInRange(range).slice(0)).flat();
        const autoReveal = firstArg.autoReveal;
        return {
            ui: false,
            notebookEditor: editor,
            selectedCells,
            autoReveal,
        };
    }
    // handle legacy arguments
    if (isICellRange(firstArg)) {
        // cellRange, document
        const secondArg = args[1];
        const editor = getEditorFromArgsOrActivePane(accessor, secondArg);
        if (!editor) {
            return;
        }
        return {
            ui: false,
            notebookEditor: editor,
            selectedCells: editor.getCellsInRange(firstArg),
        };
    }
    // let's just execute the active cell
    const context = getContextFromActiveEditor(accessor.get(IEditorService));
    return context
        ? {
            ui: false,
            notebookEditor: context.notebookEditor,
            selectedCells: context.selectedCells ?? [],
            cell: context.cell,
        }
        : undefined;
}
export const cellExecutionArgs = [
    {
        isOptional: true,
        name: 'options',
        description: 'The cell range options',
        schema: {
            type: 'object',
            required: ['ranges'],
            properties: {
                ranges: {
                    type: 'array',
                    items: [
                        {
                            type: 'object',
                            required: ['start', 'end'],
                            properties: {
                                start: {
                                    type: 'number',
                                },
                                end: {
                                    type: 'number',
                                },
                            },
                        },
                    ],
                },
                document: {
                    type: 'object',
                    description: 'The document uri',
                },
                autoReveal: {
                    type: 'boolean',
                    description: 'Whether the cell should be revealed into view automatically',
                },
            },
        },
    },
];
MenuRegistry.appendMenuItem(MenuId.NotebookCellTitle, {
    submenu: MenuId.NotebookCellInsert,
    title: localize('notebookMenu.insertCell', 'Insert Cell'),
    group: "2_insert" /* CellOverflowToolbarGroups.Insert */,
    when: NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true),
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.NotebookCellTitle,
    title: localize('notebookMenu.cellTitle', 'Notebook Cell'),
    group: "2_insert" /* CellOverflowToolbarGroups.Insert */,
    when: NOTEBOOK_EDITOR_FOCUSED,
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellTitle, {
    title: localize('miShare', 'Share'),
    submenu: MenuId.EditorContextShare,
    group: "4_share" /* CellOverflowToolbarGroups.Share */,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvY29yZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFDTixPQUFPLEVBRVAsTUFBTSxFQUNOLFlBQVksR0FDWixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUd4RixPQUFPLEVBQ04sK0JBQStCLEVBRy9CLG9CQUFvQixHQUVwQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFDTixtQ0FBbUMsRUFDbkMsd0JBQXdCLEVBQ3hCLHVCQUF1QixFQUN2Qix5QkFBeUIsRUFDekIscUJBQXFCLEVBQ3JCLDRCQUE0QixFQUM1Qiw4QkFBOEIsR0FDOUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQWMsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBU3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRSxpQkFBaUI7QUFDakIsTUFBTSxDQUFDLE1BQU0sZ0JB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