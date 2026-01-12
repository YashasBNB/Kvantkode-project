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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9jb3JlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUNOLE9BQU8sRUFFUCxNQUFNLEVBQ04sWUFBWSxHQUNaLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBR3hGLE9BQU8sRUFDTiwrQkFBK0IsRUFHL0Isb0JBQW9CLEdBRXBCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUNOLG1DQUFtQyxFQUNuQyx3QkFBd0IsRUFDeEIsdUJBQXVCLEVBQ3ZCLHlCQUF5QixFQUN6QixxQkFBcUIsRUFDckIsNEJBQTRCLEVBQzVCLDhCQUE4QixHQUM5QixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBYyxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFTekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpFLGlCQUFpQjtBQUNqQixNQUFNLENBQUMsTUFB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