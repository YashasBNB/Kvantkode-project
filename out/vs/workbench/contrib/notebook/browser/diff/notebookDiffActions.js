/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IBulkEditService, ResourceTextEdit, } from '../../../../../editor/browser/services/bulkEditService.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, } from '../../../../../platform/contextkey/common/contextkey.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { SideBySideDiffElementViewModel, } from './diffElementViewModel.js';
import { NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY, NOTEBOOK_DIFF_CELL_INPUT, NOTEBOOK_DIFF_CELL_PROPERTY, NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED, NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS, NOTEBOOK_DIFF_ITEM_DIFF_STATE, NOTEBOOK_DIFF_ITEM_KIND, NOTEBOOK_DIFF_METADATA, NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN, } from './notebookDiffEditorBrowser.js';
import { NotebookTextDiffEditor } from './notebookDiffEditor.js';
import { nextChangeIcon, openAsTextIcon, previousChangeIcon, renderOutputIcon, revertIcon, toggleWhitespace, } from '../notebookIcons.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
import { NOTEBOOK_DIFF_EDITOR_ID, } from '../../common/notebookCommon.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { NotebookMultiTextDiffEditor } from './notebookMultiDiffEditor.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import product from '../../../../../platform/product/common/product.js';
import { ctxHasEditorModification, ctxHasRequestInProgress, } from '../../../chat/browser/chatEditing/chatEditingEditorContextKeys.js';
// ActiveEditorContext.isEqualTo(SearchEditorConstants.SearchEditorID)
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.openFile',
            icon: Codicon.goToFile,
            title: localize2('notebook.diff.openFile', 'Open File'),
            precondition: ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)),
                },
            ],
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const activeEditor = editorService.activeEditorPane;
        if (!activeEditor) {
            return;
        }
        if (activeEditor instanceof NotebookTextDiffEditor ||
            activeEditor instanceof NotebookMultiTextDiffEditor) {
            const diffEditorInput = activeEditor.input;
            const resource = diffEditorInput.modified.resource;
            await editorService.openEditor({ resource });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.toggleCollapseUnchangedRegions',
            title: localize2('notebook.diff.cell.toggleCollapseUnchangedRegions', 'Toggle Collapse Unchanged Regions'),
            icon: Codicon.map,
            toggled: ContextKeyExpr.has('config.diffEditor.hideUnchangedRegions.enabled'),
            precondition: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID),
            menu: {
                id: MenuId.EditorTitle,
                group: 'navigation',
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID),
            },
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('diffEditor.hideUnchangedRegions.enabled');
        configurationService.updateValue('diffEditor.hideUnchangedRegions.enabled', newValue);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.switchToText',
            icon: openAsTextIcon,
            title: localize2('notebook.diff.switchToText', 'Open Text Diff Editor'),
            precondition: ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)),
                },
            ],
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const activeEditor = editorService.activeEditorPane;
        if (!activeEditor) {
            return;
        }
        if (activeEditor instanceof NotebookTextDiffEditor ||
            activeEditor instanceof NotebookMultiTextDiffEditor) {
            const diffEditorInput = activeEditor.input;
            await editorService.openEditor({
                original: { resource: diffEditorInput.original.resource },
                modified: { resource: diffEditorInput.resource },
                label: diffEditorInput.getName(),
                options: {
                    preserveFocus: false,
                    override: DEFAULT_EDITOR_ASSOCIATION.id,
                },
            });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.showUnchangedCells',
            title: localize2('showUnchangedCells', 'Show Unchanged Cells'),
            icon: Codicon.unfold,
            precondition: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.has(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key)),
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.has(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key), ContextKeyExpr.equals(NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN.key, true)),
                id: MenuId.EditorTitle,
                order: 22,
                group: 'navigation',
            },
        });
    }
    run(accessor, ...args) {
        const activeEditor = accessor.get(IEditorService).activeEditorPane;
        if (!activeEditor) {
            return;
        }
        if (activeEditor instanceof NotebookMultiTextDiffEditor) {
            activeEditor.showUnchanged();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.hideUnchangedCells',
            title: localize2('hideUnchangedCells', 'Hide Unchanged Cells'),
            icon: Codicon.fold,
            precondition: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.has(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key)),
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.has(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key), ContextKeyExpr.equals(NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN.key, false)),
                id: MenuId.EditorTitle,
                order: 22,
                group: 'navigation',
            },
        });
    }
    run(accessor, ...args) {
        const activeEditor = accessor.get(IEditorService).activeEditorPane;
        if (!activeEditor) {
            return;
        }
        if (activeEditor instanceof NotebookMultiTextDiffEditor) {
            activeEditor.hideUnchanged();
        }
    }
});
registerAction2(class GoToFileAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.2.goToCell',
            title: localize2('goToCell', 'Go To Cell'),
            icon: Codicon.goToFile,
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_KIND.key, 'Cell'), ContextKeyExpr.notEquals(NOTEBOOK_DIFF_ITEM_DIFF_STATE.key, 'delete')),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 0,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookMultiTextDiffEditor)) {
            return;
        }
        await editorService.openEditor({
            resource: uri,
            options: {
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            },
        });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.revertMetadata',
            title: localize('notebook.diff.revertMetadata', 'Revert Notebook Metadata'),
            icon: revertIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffDocumentMetadata,
                when: NOTEBOOK_DIFF_METADATA,
            },
            precondition: NOTEBOOK_DIFF_METADATA,
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookTextDiffEditor)) {
            return;
        }
        context.modifiedDocumentTextModel.applyEdits([
            {
                editType: 5 /* CellEditType.DocumentMetadata */,
                metadata: context.originalMetadata.metadata,
            },
        ], true, undefined, () => undefined, undefined, true);
    }
});
const revertInput = localize('notebook.diff.cell.revertInput', 'Revert Input');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.2.cell.revertInput',
            title: revertInput,
            icon: revertIcon,
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_KIND.key, 'Cell'), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_DIFF_STATE.key, 'modified')),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 2,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookMultiTextDiffEditor)) {
            return;
        }
        const item = activeEditorPane.getDiffElementViewModel(uri);
        if (item && item instanceof SideBySideDiffElementViewModel) {
            const modified = item.modified;
            const original = item.original;
            if (!original || !modified) {
                return;
            }
            const bulkEditService = accessor.get(IBulkEditService);
            await bulkEditService.apply([
                new ResourceTextEdit(modified.uri, {
                    range: modified.textModel.getFullModelRange(),
                    text: original.textModel.getValue(),
                }),
            ], { quotableLabel: 'Revert Notebook Cell Content Change' });
        }
    }
});
const revertOutputs = localize('notebook.diff.cell.revertOutputs', 'Revert Outputs');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.2.cell.revertOutputs',
            title: revertOutputs,
            icon: revertIcon,
            f1: false,
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_KIND.key, 'Output'), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_DIFF_STATE.key, 'modified')),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 2,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookMultiTextDiffEditor)) {
            return;
        }
        const item = activeEditorPane.getDiffElementViewModel(uri);
        if (item && item instanceof SideBySideDiffElementViewModel) {
            const original = item.original;
            const modifiedCellIndex = item.modifiedDocument.cells.findIndex((cell) => cell.handle === item.modified.handle);
            if (modifiedCellIndex === -1) {
                return;
            }
            item.mainDocumentTextModel.applyEdits([
                {
                    editType: 2 /* CellEditType.Output */,
                    index: modifiedCellIndex,
                    outputs: original.outputs,
                },
            ], true, undefined, () => undefined, undefined, true);
        }
    }
});
const revertMetadata = localize('notebook.diff.cell.revertMetadata', 'Revert Metadata');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.2.cell.revertMetadata',
            title: revertMetadata,
            icon: revertIcon,
            f1: false,
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_KIND.key, 'Metadata'), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_DIFF_STATE.key, 'modified')),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 2,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookMultiTextDiffEditor)) {
            return;
        }
        const item = activeEditorPane.getDiffElementViewModel(uri);
        if (item && item instanceof SideBySideDiffElementViewModel) {
            const original = item.original;
            const modifiedCellIndex = item.modifiedDocument.cells.findIndex((cell) => cell.handle === item.modified.handle);
            if (modifiedCellIndex === -1) {
                return;
            }
            item.mainDocumentTextModel.applyEdits([
                {
                    editType: 3 /* CellEditType.Metadata */,
                    index: modifiedCellIndex,
                    metadata: original.metadata,
                },
            ], true, undefined, () => undefined, undefined, true);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.revertMetadata',
            title: revertMetadata,
            icon: revertIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellMetadataTitle,
                when: NOTEBOOK_DIFF_CELL_PROPERTY,
            },
            precondition: NOTEBOOK_DIFF_CELL_PROPERTY,
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        if (!(context instanceof SideBySideDiffElementViewModel)) {
            return;
        }
        const original = context.original;
        const modified = context.modified;
        const modifiedCellIndex = context.mainDocumentTextModel.cells.indexOf(modified.textModel);
        if (modifiedCellIndex === -1) {
            return;
        }
        const rawEdits = [
            { editType: 3 /* CellEditType.Metadata */, index: modifiedCellIndex, metadata: original.metadata },
        ];
        if (context.original.language && context.modified.language !== context.original.language) {
            rawEdits.push({
                editType: 4 /* CellEditType.CellLanguage */,
                index: modifiedCellIndex,
                language: context.original.language,
            });
        }
        context.modifiedDocument.applyEdits(rawEdits, true, undefined, () => undefined, undefined, true);
    }
});
// registerAction2(class extends Action2 {
// 	constructor() {
// 		super(
// 			{
// 				id: 'notebook.diff.cell.switchOutputRenderingStyle',
// 				title: localize('notebook.diff.cell.switchOutputRenderingStyle', "Switch Outputs Rendering"),
// 				icon: renderOutputIcon,
// 				f1: false,
// 				menu: {
// 					id: MenuId.NotebookDiffCellOutputsTitle
// 				}
// 			}
// 		);
// 	}
// 	run(accessor: ServicesAccessor, context?: DiffElementViewModelBase) {
// 		if (!context) {
// 			return;
// 		}
// 		context.renderOutput = true;
// 	}
// });
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.switchOutputRenderingStyleToText',
            title: localize('notebook.diff.cell.switchOutputRenderingStyleToText', 'Switch Output Rendering'),
            icon: renderOutputIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellOutputsTitle,
                when: NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED,
            },
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        context.renderOutput = !context.renderOutput;
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.revertOutputs',
            title: localize('notebook.diff.cell.revertOutputs', 'Revert Outputs'),
            icon: revertIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellOutputsTitle,
                when: NOTEBOOK_DIFF_CELL_PROPERTY,
            },
            precondition: NOTEBOOK_DIFF_CELL_PROPERTY,
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        if (!(context instanceof SideBySideDiffElementViewModel)) {
            return;
        }
        const original = context.original;
        const modified = context.modified;
        const modifiedCellIndex = context.mainDocumentTextModel.cells.indexOf(modified.textModel);
        if (modifiedCellIndex === -1) {
            return;
        }
        context.mainDocumentTextModel.applyEdits([
            {
                editType: 2 /* CellEditType.Output */,
                index: modifiedCellIndex,
                outputs: original.outputs,
            },
        ], true, undefined, () => undefined, undefined, true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggle.diff.cell.ignoreTrimWhitespace',
            title: localize('ignoreTrimWhitespace.label', 'Show Leading/Trailing Whitespace Differences'),
            icon: toggleWhitespace,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellInputTitle,
                when: NOTEBOOK_DIFF_CELL_INPUT,
                order: 1,
            },
            precondition: NOTEBOOK_DIFF_CELL_INPUT,
            toggled: ContextKeyExpr.equals(NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY, false),
        });
    }
    run(accessor, context) {
        const cell = context;
        if (!cell?.modified) {
            return;
        }
        const uri = cell.modified.uri;
        const configService = accessor.get(ITextResourceConfigurationService);
        const key = 'diffEditor.ignoreTrimWhitespace';
        const val = configService.getValue(uri, key);
        configService.updateValue(uri, key, !val);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.revertInput',
            title: revertInput,
            icon: revertIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellInputTitle,
                when: NOTEBOOK_DIFF_CELL_INPUT,
                order: 2,
            },
            precondition: NOTEBOOK_DIFF_CELL_INPUT,
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        const original = context.original;
        const modified = context.modified;
        if (!original || !modified) {
            return;
        }
        const bulkEditService = accessor.get(IBulkEditService);
        return bulkEditService.apply([
            new ResourceTextEdit(modified.uri, {
                range: modified.textModel.getFullModelRange(),
                text: original.textModel.getValue(),
            }),
        ], { quotableLabel: 'Revert Notebook Cell Content Change' });
    }
});
class ToggleRenderAction extends Action2 {
    constructor(id, title, precondition, toggled, order, toggleOutputs, toggleMetadata) {
        super({
            id: id,
            title,
            precondition: precondition,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    group: 'notebook',
                    when: precondition,
                    order: order,
                },
            ],
            toggled: toggled,
        });
        this.toggleOutputs = toggleOutputs;
        this.toggleMetadata = toggleMetadata;
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        if (this.toggleOutputs !== undefined) {
            const oldValue = configurationService.getValue('notebook.diff.ignoreOutputs');
            configurationService.updateValue('notebook.diff.ignoreOutputs', !oldValue);
        }
        if (this.toggleMetadata !== undefined) {
            const oldValue = configurationService.getValue('notebook.diff.ignoreMetadata');
            configurationService.updateValue('notebook.diff.ignoreMetadata', !oldValue);
        }
    }
}
registerAction2(class extends ToggleRenderAction {
    constructor() {
        super('notebook.diff.showOutputs', localize2('notebook.diff.showOutputs', 'Show Outputs Differences'), ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)), ContextKeyExpr.notEquals('config.notebook.diff.ignoreOutputs', true), 2, true, undefined);
    }
});
registerAction2(class extends ToggleRenderAction {
    constructor() {
        super('notebook.diff.showMetadata', localize2('notebook.diff.showMetadata', 'Show Metadata Differences'), ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)), ContextKeyExpr.notEquals('config.notebook.diff.ignoreMetadata', true), 1, undefined, true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.action.previous',
            title: localize('notebook.diff.action.previous.title', 'Show Previous Change'),
            icon: previousChangeIcon,
            f1: false,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 61 /* KeyCode.F3 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID),
            },
            menu: {
                id: MenuId.EditorTitle,
                group: 'navigation',
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID),
            },
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        if (editorService.activeEditorPane?.getId() !== NOTEBOOK_DIFF_EDITOR_ID) {
            return;
        }
        const editor = editorService.activeEditorPane.getControl();
        editor?.previousChange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.action.next',
            title: localize('notebook.diff.action.next.title', 'Show Next Change'),
            icon: nextChangeIcon,
            f1: false,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 61 /* KeyCode.F3 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID),
            },
            menu: {
                id: MenuId.EditorTitle,
                group: 'navigation',
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID),
            },
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        if (editorService.activeEditorPane?.getId() !== NOTEBOOK_DIFF_EDITOR_ID) {
            return;
        }
        const editor = editorService.activeEditorPane.getControl();
        editor?.nextChange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.inline.toggle',
            title: localize('notebook.diff.inline.toggle.title', 'Toggle Inline View'),
            menu: {
                id: MenuId.EditorTitle,
                group: '1_diff',
                order: 10,
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ContextKeyExpr.equals('config.notebook.diff.experimental.toggleInline', true), ctxHasEditorModification.negate(), ctxHasRequestInProgress.negate()),
            },
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        if (editorService.activeEditorPane?.getId() !== NOTEBOOK_DIFF_EDITOR_ID) {
            return;
        }
        const editor = editorService.activeEditorPane.getControl();
        editor?.toggleInlineView();
    }
});
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    properties: {
        'notebook.diff.ignoreMetadata': {
            type: 'boolean',
            default: false,
            markdownDescription: localize('notebook.diff.ignoreMetadata', 'Hide Metadata Differences'),
        },
        'notebook.diff.ignoreOutputs': {
            type: 'boolean',
            default: false,
            markdownDescription: localize('notebook.diff.ignoreOutputs', 'Hide Outputs Differences'),
        },
        'notebook.diff.experimental.toggleInline': {
            type: 'boolean',
            default: typeof product.quality === 'string' && product.quality !== 'stable', // only enable as default in insiders
            markdownDescription: localize('notebook.diff.toggleInline', 'Enable the command to toggle the experimental notebook inline diff editor.'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9ub3RlYm9va0RpZmZBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sY0FBYyxHQUVkLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFFTix3Q0FBd0MsRUFDeEMsd0JBQXdCLEVBQ3hCLDJCQUEyQixFQUMzQixvQ0FBb0MsRUFDcEMsaUNBQWlDLEVBQ2pDLDZCQUE2QixFQUM3Qix1QkFBdUIsRUFDdkIsc0JBQXNCLEVBQ3RCLG9DQUFvQyxHQUNwQyxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRWhFLE9BQU8sRUFDTixjQUFjLEVBQ2QsY0FBYyxFQUNkLGtCQUFrQixFQUNsQixnQkFBZ0IsRUFDaEIsVUFBVSxFQUNWLGdCQUFnQixHQUNoQixNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FDckMsTUFBTSx1RUFBdUUsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUd6RSxPQUFPLEVBR04sdUJBQXVCLEdBQ3ZCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDdEgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBTWhFLE9BQU8sT0FBTyxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsdUJBQXVCLEdBQ3ZCLE1BQU0sbUVBQW1FLENBQUE7QUFFMUUsc0VBQXNFO0FBRXRFLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3QkFBd0I7WUFDNUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQ3RCLEtBQUssRUFBRSxTQUFTLENBQUMsd0JBQXdCLEVBQUUsV0FBVyxDQUFDO1lBQ3ZELFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUM5QixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLEVBQ3hELG1CQUFtQixDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMsQ0FDN0Q7WUFDRCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQ3RCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFDeEQsbUJBQW1CLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxDQUM3RDtpQkFDRDthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVsRCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7UUFDbkQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFDQyxZQUFZLFlBQVksc0JBQXNCO1lBQzlDLFlBQVksWUFBWSwyQkFBMkIsRUFDbEQsQ0FBQztZQUNGLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxLQUFnQyxDQUFBO1lBQ3JFLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFBO1lBQ2xELE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDN0MsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbURBQW1EO1lBQ3ZELEtBQUssRUFBRSxTQUFTLENBQ2YsbURBQW1ELEVBQ25ELG1DQUFtQyxDQUNuQztZQUNELElBQUksRUFBRSxPQUFPLENBQUMsR0FBRztZQUNqQixPQUFPLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnREFBZ0QsQ0FBQztZQUM3RSxZQUFZLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztZQUN0RSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO2dCQUN0QixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsSUFBSSxFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7YUFDOUQ7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFlO1FBQ2pELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sUUFBUSxHQUFHLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUM5Qyx5Q0FBeUMsQ0FDekMsQ0FBQTtRQUNELG9CQUFvQixDQUFDLFdBQVcsQ0FBQyx5Q0FBeUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN0RixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRCQUE0QjtZQUNoQyxJQUFJLEVBQUUsY0FBYztZQUNwQixLQUFLLEVBQUUsU0FBUyxDQUFDLDRCQUE0QixFQUFFLHVCQUF1QixDQUFDO1lBQ3ZFLFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUM5QixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLEVBQ3hELG1CQUFtQixDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMsQ0FDN0Q7WUFDRCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQ3RCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFDeEQsbUJBQW1CLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxDQUM3RDtpQkFDRDthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVsRCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7UUFDbkQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFDQyxZQUFZLFlBQVksc0JBQXNCO1lBQzlDLFlBQVksWUFBWSwyQkFBMkIsRUFDbEQsQ0FBQztZQUNGLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxLQUFnQyxDQUFBO1lBRXJFLE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQztnQkFDOUIsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO2dCQUN6RCxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLFFBQVEsRUFBRTtnQkFDaEQsS0FBSyxFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUU7Z0JBQ2hDLE9BQU8sRUFBRTtvQkFDUixhQUFhLEVBQUUsS0FBSztvQkFDcEIsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUU7aUJBQ3ZDO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsd0NBQXdDO1lBQzVDLEtBQUssRUFBRSxTQUFTLENBQUMsb0JBQW9CLEVBQUUsc0JBQXNCLENBQUM7WUFDOUQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3BCLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLEVBQzdELGNBQWMsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsR0FBRyxDQUFDLENBQ3pEO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLEVBQzdELGNBQWMsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsR0FBRyxDQUFDLEVBQ3pELGNBQWMsQ0FBQyxNQUFNLENBQUMsb0NBQW9DLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUNyRTtnQkFDRCxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7Z0JBQ3RCLEtBQUssRUFBRSxFQUFFO2dCQUNULEtBQUssRUFBRSxZQUFZO2FBQ25CO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBZTtRQUNqRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGdCQUFnQixDQUFBO1FBQ2xFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksWUFBWSxZQUFZLDJCQUEyQixFQUFFLENBQUM7WUFDekQsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQzdCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdDQUF3QztZQUM1QyxLQUFLLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixFQUFFLHNCQUFzQixDQUFDO1lBQzlELElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDL0IsbUJBQW1CLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxFQUM3RCxjQUFjLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLEdBQUcsQ0FBQyxDQUN6RDtZQUNELElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxFQUM3RCxjQUFjLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLEdBQUcsQ0FBQyxFQUN6RCxjQUFjLENBQUMsTUFBTSxDQUFDLG9DQUFvQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FDdEU7Z0JBQ0QsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO2dCQUN0QixLQUFLLEVBQUUsRUFBRTtnQkFDVCxLQUFLLEVBQUUsWUFBWTthQUNuQjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQWU7UUFDakQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNsRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLFlBQVksWUFBWSwyQkFBMkIsRUFBRSxDQUFDO1lBQ3pELFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLGNBQWUsU0FBUSxPQUFPO0lBQ25DO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQztZQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUM7WUFDMUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQ3RCLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxFQUM3RCxjQUFjLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsRUFDMUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQ3JFO2dCQUNELEVBQUUsRUFBRSxNQUFNLENBQUMsMEJBQTBCO2dCQUNyQyxLQUFLLEVBQUUsQ0FBQztnQkFDUixLQUFLLEVBQUUsWUFBWTthQUNuQjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQ25ELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQVEsQ0FBQTtRQUMxQixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFBO1FBQ3ZELElBQUksQ0FBQyxDQUFDLGdCQUFnQixZQUFZLDJCQUEyQixDQUFDLEVBQUUsQ0FBQztZQUNoRSxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQztZQUM5QixRQUFRLEVBQUUsR0FBRztZQUNiLE9BQU8sRUFBRTtnQkFDUixtQkFBbUIsK0RBQXVEO2FBQzdDO1NBQzlCLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsOEJBQThCO1lBQ2xDLEtBQUssRUFBRSxRQUFRLENBQUMsOEJBQThCLEVBQUUsMEJBQTBCLENBQUM7WUFDM0UsSUFBSSxFQUFFLFVBQVU7WUFDaEIsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyw0QkFBNEI7Z0JBQ3ZDLElBQUksRUFBRSxzQkFBc0I7YUFDNUI7WUFDRCxZQUFZLEVBQUUsc0JBQXNCO1NBQ3BDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUEyQztRQUMxRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7UUFDdkQsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLFlBQVksc0JBQXNCLENBQUMsRUFBRSxDQUFDO1lBQzNELE9BQU07UUFDUCxDQUFDO1FBRUQsT0FBTyxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FDM0M7WUFDQztnQkFDQyxRQUFRLHVDQUErQjtnQkFDdkMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRO2FBQzNDO1NBQ0QsRUFDRCxJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0FBRTlFLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3Q0FBd0M7WUFDNUMsS0FBSyxFQUFFLFdBQVc7WUFDbEIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFO2dCQUNMLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixtQkFBbUIsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLEVBQzdELGNBQWMsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUMxRCxjQUFjLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FDcEU7Z0JBQ0QsRUFBRSxFQUFFLE1BQU0sQ0FBQywwQkFBMEI7Z0JBQ3JDLEtBQUssRUFBRSxDQUFDO2dCQUNSLEtBQUssRUFBRSxZQUFZO2FBQ25CO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDbkQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBUSxDQUFBO1FBQzFCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7UUFDdkQsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLFlBQVksMkJBQTJCLENBQUMsRUFBRSxDQUFDO1lBQ2hFLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDMUQsSUFBSSxJQUFJLElBQUksSUFBSSxZQUFZLDhCQUE4QixFQUFFLENBQUM7WUFDNUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQTtZQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBRTlCLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDNUIsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDdEQsTUFBTSxlQUFlLENBQUMsS0FBSyxDQUMxQjtnQkFDQyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7b0JBQ2xDLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFO29CQUM3QyxJQUFJLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7aUJBQ25DLENBQUM7YUFDRixFQUNELEVBQUUsYUFBYSxFQUFFLHFDQUFxQyxFQUFFLENBQ3hELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0FBRXBGLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQ0FBMEM7WUFDOUMsS0FBSyxFQUFFLGFBQWE7WUFDcEIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMsRUFDN0QsY0FBYyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEVBQzVELGNBQWMsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUNwRTtnQkFDRCxFQUFFLEVBQUUsTUFBTSxDQUFDLDBCQUEwQjtnQkFDckMsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsS0FBSyxFQUFFLFlBQVk7YUFDbkI7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUNuRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFRLENBQUE7UUFDMUIsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUN2RCxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsWUFBWSwyQkFBMkIsQ0FBQyxFQUFFLENBQUM7WUFDaEUsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMxRCxJQUFJLElBQUksSUFBSSxJQUFJLFlBQVksOEJBQThCLEVBQUUsQ0FBQztZQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBRTlCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQzlELENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUM5QyxDQUFBO1lBQ0QsSUFBSSxpQkFBaUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM5QixPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQ3BDO2dCQUNDO29CQUNDLFFBQVEsNkJBQXFCO29CQUM3QixLQUFLLEVBQUUsaUJBQWlCO29CQUN4QixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87aUJBQ3pCO2FBQ0QsRUFDRCxJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0FBRXZGLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwyQ0FBMkM7WUFDL0MsS0FBSyxFQUFFLGNBQWM7WUFDckIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMsRUFDN0QsY0FBYyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQzlELGNBQWMsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUNwRTtnQkFDRCxFQUFFLEVBQUUsTUFBTSxDQUFDLDBCQUEwQjtnQkFDckMsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsS0FBSyxFQUFFLFlBQVk7YUFDbkI7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUNuRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFRLENBQUE7UUFDMUIsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUN2RCxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsWUFBWSwyQkFBMkIsQ0FBQyxFQUFFLENBQUM7WUFDaEUsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMxRCxJQUFJLElBQUksSUFBSSxJQUFJLFlBQVksOEJBQThCLEVBQUUsQ0FBQztZQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFBO1lBRTlCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQzlELENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUM5QyxDQUFBO1lBQ0QsSUFBSSxpQkFBaUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM5QixPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQ3BDO2dCQUNDO29CQUNDLFFBQVEsK0JBQXVCO29CQUMvQixLQUFLLEVBQUUsaUJBQWlCO29CQUN4QixRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVE7aUJBQzNCO2FBQ0QsRUFDRCxJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQ0FBbUM7WUFDdkMsS0FBSyxFQUFFLGNBQWM7WUFDckIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyw2QkFBNkI7Z0JBQ3hDLElBQUksRUFBRSwyQkFBMkI7YUFDakM7WUFDRCxZQUFZLEVBQUUsMkJBQTJCO1NBQ3pDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUFzQztRQUNyRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSw4QkFBOEIsQ0FBQyxFQUFFLENBQUM7WUFDMUQsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUE7UUFFakMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDekYsSUFBSSxpQkFBaUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQXlCO1lBQ3RDLEVBQUUsUUFBUSwrQkFBdUIsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUU7U0FDMUYsQ0FBQTtRQUNELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxRixRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNiLFFBQVEsbUNBQTJCO2dCQUNuQyxLQUFLLEVBQUUsaUJBQWlCO2dCQUN4QixRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRO2FBQ25DLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUNsQyxRQUFRLEVBQ1IsSUFBSSxFQUNKLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQ2YsU0FBUyxFQUNULElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELDBDQUEwQztBQUMxQyxtQkFBbUI7QUFDbkIsV0FBVztBQUNYLE9BQU87QUFDUCwyREFBMkQ7QUFDM0Qsb0dBQW9HO0FBQ3BHLDhCQUE4QjtBQUM5QixpQkFBaUI7QUFDakIsY0FBYztBQUNkLCtDQUErQztBQUMvQyxRQUFRO0FBQ1IsT0FBTztBQUNQLE9BQU87QUFDUCxLQUFLO0FBQ0wseUVBQXlFO0FBQ3pFLG9CQUFvQjtBQUNwQixhQUFhO0FBQ2IsTUFBTTtBQUVOLGlDQUFpQztBQUNqQyxLQUFLO0FBQ0wsTUFBTTtBQUVOLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxREFBcUQ7WUFDekQsS0FBSyxFQUFFLFFBQVEsQ0FDZCxxREFBcUQsRUFDckQseUJBQXlCLENBQ3pCO1lBQ0QsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixFQUFFLEVBQUUsS0FBSztZQUNULElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLDRCQUE0QjtnQkFDdkMsSUFBSSxFQUFFLG9DQUFvQzthQUMxQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUFzQztRQUNyRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFNO1FBQ1AsQ0FBQztRQUVELE9BQU8sQ0FBQyxZQUFZLEdBQUcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFBO0lBQzdDLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0NBQWtDO1lBQ3RDLEtBQUssRUFBRSxRQUFRLENBQUMsa0NBQWtDLEVBQUUsZ0JBQWdCLENBQUM7WUFDckUsSUFBSSxFQUFFLFVBQVU7WUFDaEIsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyw0QkFBNEI7Z0JBQ3ZDLElBQUksRUFBRSwyQkFBMkI7YUFDakM7WUFDRCxZQUFZLEVBQUUsMkJBQTJCO1NBQ3pDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUFzQztRQUNyRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSw4QkFBOEIsQ0FBQyxFQUFFLENBQUM7WUFDMUQsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUE7UUFFakMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDekYsSUFBSSxpQkFBaUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsT0FBTyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FDdkM7WUFDQztnQkFDQyxRQUFRLDZCQUFxQjtnQkFDN0IsS0FBSyxFQUFFLGlCQUFpQjtnQkFDeEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2FBQ3pCO1NBQ0QsRUFDRCxJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdEQUFnRDtZQUNwRCxLQUFLLEVBQUUsUUFBUSxDQUNkLDRCQUE0QixFQUM1Qiw4Q0FBOEMsQ0FDOUM7WUFDRCxJQUFJLEVBQUUsZ0JBQWdCO1lBQ3RCLEVBQUUsRUFBRSxLQUFLO1lBQ1QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsMEJBQTBCO2dCQUNyQyxJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsWUFBWSxFQUFFLHdCQUF3QjtZQUN0QyxPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLENBQUM7U0FDL0UsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNELEdBQUcsQ0FBQyxRQUEwQixFQUFFLE9BQXNDO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQTtRQUNwQixJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ3JCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUE7UUFDN0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sR0FBRyxHQUFHLGlDQUFpQyxDQUFBO1FBQzdDLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVDLGFBQWEsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzFDLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsZ0NBQWdDO1lBQ3BDLEtBQUssRUFBRSxXQUFXO1lBQ2xCLElBQUksRUFBRSxVQUFVO1lBQ2hCLEVBQUUsRUFBRSxLQUFLO1lBQ1QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsMEJBQTBCO2dCQUNyQyxJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsWUFBWSxFQUFFLHdCQUF3QjtTQUN0QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsR0FBRyxDQUFDLFFBQTBCLEVBQUUsT0FBc0M7UUFDckUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFBO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUE7UUFFakMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzVCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RELE9BQU8sZUFBZSxDQUFDLEtBQUssQ0FDM0I7WUFDQyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2xDLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFO2dCQUM3QyxJQUFJLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7YUFDbkMsQ0FBQztTQUNGLEVBQ0QsRUFBRSxhQUFhLEVBQUUscUNBQXFDLEVBQUUsQ0FDeEQsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxNQUFNLGtCQUFtQixTQUFRLE9BQU87SUFDdkMsWUFDQyxFQUFVLEVBQ1YsS0FBbUMsRUFDbkMsWUFBOEMsRUFDOUMsT0FBeUMsRUFDekMsS0FBYSxFQUNJLGFBQXVCLEVBQ3ZCLGNBQXdCO1FBRXpDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxFQUFFO1lBQ04sS0FBSztZQUNMLFlBQVksRUFBRSxZQUFZO1lBQzFCLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7b0JBQ3RCLEtBQUssRUFBRSxVQUFVO29CQUNqQixJQUFJLEVBQUUsWUFBWTtvQkFDbEIsS0FBSyxFQUFFLEtBQUs7aUJBQ1o7YUFDRDtZQUNELE9BQU8sRUFBRSxPQUFPO1NBQ2hCLENBQUMsQ0FBQTtRQWhCZSxrQkFBYSxHQUFiLGFBQWEsQ0FBVTtRQUN2QixtQkFBYyxHQUFkLGNBQWMsQ0FBVTtJQWdCMUMsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFaEUsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1lBQzdFLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzNFLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdkMsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLDhCQUE4QixDQUFDLENBQUE7WUFDOUUsb0JBQW9CLENBQUMsV0FBVyxDQUFDLDhCQUE4QixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDNUUsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsa0JBQWtCO0lBQy9CO1FBQ0MsS0FBSyxDQUNKLDJCQUEyQixFQUMzQixTQUFTLENBQUMsMkJBQTJCLEVBQUUsMEJBQTBCLENBQUMsRUFDbEUsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxFQUN4RCxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLENBQzdELEVBQ0QsY0FBYyxDQUFDLFNBQVMsQ0FBQyxvQ0FBb0MsRUFBRSxJQUFJLENBQUMsRUFDcEUsQ0FBQyxFQUNELElBQUksRUFDSixTQUFTLENBQ1QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLGtCQUFrQjtJQUMvQjtRQUNDLEtBQUssQ0FDSiw0QkFBNEIsRUFDNUIsU0FBUyxDQUFDLDRCQUE0QixFQUFFLDJCQUEyQixDQUFDLEVBQ3BFLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFDeEQsbUJBQW1CLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxDQUM3RCxFQUNELGNBQWMsQ0FBQyxTQUFTLENBQUMscUNBQXFDLEVBQUUsSUFBSSxDQUFDLEVBQ3JFLENBQUMsRUFDRCxTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLHNCQUFzQixDQUFDO1lBQzlFLElBQUksRUFBRSxrQkFBa0I7WUFDeEIsRUFBRSxFQUFFLEtBQUs7WUFDVCxVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLDhDQUF5QixzQkFBYTtnQkFDL0MsTUFBTSw2Q0FBbUM7Z0JBQ3pDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO2FBQzlEO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVztnQkFDdEIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO2FBQzlEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixNQUFNLGFBQWEsR0FBbUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRSxJQUFJLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsS0FBSyx1QkFBdUIsRUFBRSxDQUFDO1lBQ3pFLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFFNUMsQ0FBQTtRQUNaLE1BQU0sRUFBRSxjQUFjLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDJCQUEyQjtZQUMvQixLQUFLLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLGtCQUFrQixDQUFDO1lBQ3RFLElBQUksRUFBRSxjQUFjO1lBQ3BCLEVBQUUsRUFBRSxLQUFLO1lBQ1QsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSwwQ0FBdUI7Z0JBQ2hDLE1BQU0sNkNBQW1DO2dCQUN6QyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQzthQUM5RDtZQUNELElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7Z0JBQ3RCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixJQUFJLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQzthQUM5RDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsTUFBTSxhQUFhLEdBQW1CLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEUsSUFBSSxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLEtBQUssdUJBQXVCLEVBQUUsQ0FBQztZQUN6RSxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBRTVDLENBQUE7UUFDWixNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUE7SUFDckIsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw2QkFBNkI7WUFDakMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxvQkFBb0IsQ0FBQztZQUMxRSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO2dCQUN0QixLQUFLLEVBQUUsUUFBUTtnQkFDZixLQUFLLEVBQUUsRUFBRTtnQkFDVCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxFQUN4RCxjQUFjLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxFQUFFLElBQUksQ0FBQyxFQUM3RSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsRUFDakMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLENBQ2hDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sYUFBYSxHQUFtQixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xFLElBQUksYUFBYSxDQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBRSxLQUFLLHVCQUF1QixFQUFFLENBQUM7WUFDekUsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUU1QyxDQUFBO1FBQ1osTUFBTSxFQUFFLGdCQUFnQixFQUFFLENBQUE7SUFDM0IsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ2hHLEVBQUUsRUFBRSxVQUFVO0lBQ2QsS0FBSyxFQUFFLEdBQUc7SUFDVixJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRTtRQUNYLDhCQUE4QixFQUFFO1lBQy9CLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7WUFDZCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsOEJBQThCLEVBQUUsMkJBQTJCLENBQUM7U0FDMUY7UUFDRCw2QkFBNkIsRUFBRTtZQUM5QixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1lBQ2QsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDBCQUEwQixDQUFDO1NBQ3hGO1FBQ0QseUNBQXlDLEVBQUU7WUFDMUMsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsT0FBTyxPQUFPLENBQUMsT0FBTyxLQUFLLFFBQVEsSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRSxxQ0FBcUM7WUFDbkgsbUJBQW1CLEVBQUUsUUFBUSxDQUM1Qiw0QkFBNEIsRUFDNUIsNEVBQTRFLENBQzVFO1NBQ0Q7S0FDRDtDQUNELENBQUMsQ0FBQSJ9