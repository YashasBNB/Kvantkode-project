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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rRGlmZkFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUVOLHdDQUF3QyxFQUN4Qyx3QkFBd0IsRUFDeEIsMkJBQTJCLEVBQzNCLG9DQUFvQyxFQUNwQyxpQ0FBaUMsRUFDakMsNkJBQTZCLEVBQzdCLHVCQUF1QixFQUN2QixzQkFBc0IsRUFDdEIsb0NBQW9DLEdBQ3BDLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFaEUsT0FBTyxFQUNOLGNBQWMsRUFDZCxjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUNoQixVQUFVLEVBQ1YsZ0JBQWdCLEdBQ2hCLE1BQU0scUJBQXFCLENBQUE7QUFD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