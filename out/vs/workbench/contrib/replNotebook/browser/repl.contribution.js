/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Event } from '../../../../base/common/event.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { parse } from '../../../../base/common/marshalling.js';
import { isEqual } from '../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../editor/browser/services/bulkEditService.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { localize2 } from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions, } from '../../../common/editor.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IWorkingCopyEditorService, } from '../../../services/workingCopy/common/workingCopyEditorService.js';
import { ResourceNotebookCellEdit } from '../../bulkEdit/browser/bulkCellEdits.js';
import { getReplView } from '../../debug/browser/repl.js';
import { REPL_VIEW_ID } from '../../debug/common/debug.js';
import { InlineChatController } from '../../inlineChat/browser/inlineChatController.js';
import { IInteractiveHistoryService } from '../../interactive/browser/interactiveHistoryService.js';
import { NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT } from '../../notebook/browser/controller/coreActions.js';
import * as icons from '../../notebook/browser/notebookIcons.js';
import { ReplEditorAccessibleView } from '../../notebook/browser/replEditorAccessibleView.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { CellKind, NotebookSetting, NotebookWorkingCopyTypeIdentifier, REPL_EDITOR_ID, } from '../../notebook/common/notebookCommon.js';
import { IS_COMPOSITE_NOTEBOOK, MOST_RECENT_REPL_EDITOR, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_EDITOR_FOCUSED, } from '../../notebook/common/notebookContextKeys.js';
import { INotebookEditorModelResolverService } from '../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { isReplEditorControl, ReplEditor } from './replEditor.js';
import { ReplEditorHistoryAccessibilityHelp, ReplEditorInputAccessibilityHelp, } from './replEditorAccessibilityHelp.js';
import { ReplEditorInput } from './replEditorInput.js';
class ReplEditorSerializer {
    canSerialize(input) {
        return input.typeId === ReplEditorInput.ID;
    }
    serialize(input) {
        assertType(input instanceof ReplEditorInput);
        const data = {
            resource: input.resource,
            preferredResource: input.preferredResource,
            viewType: input.viewType,
            options: input.options,
            label: input.getName(),
        };
        return JSON.stringify(data);
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, viewType } = data;
        if (!data || !URI.isUri(resource) || typeof viewType !== 'string') {
            return undefined;
        }
        const input = instantiationService.createInstance(ReplEditorInput, resource, data.label);
        return input;
    }
}
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ReplEditor, REPL_EDITOR_ID, 'REPL Editor'), [new SyncDescriptor(ReplEditorInput)]);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ReplEditorInput.ID, ReplEditorSerializer);
let ReplDocumentContribution = class ReplDocumentContribution extends Disposable {
    static { this.ID = 'workbench.contrib.replDocument'; }
    constructor(notebookService, editorResolverService, notebookEditorModelResolverService, instantiationService, configurationService) {
        super();
        this.notebookEditorModelResolverService = notebookEditorModelResolverService;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.editorInputCache = new ResourceMap();
        editorResolverService.registerEditor(
        // don't match anything, we don't need to support re-opening files as REPL editor at this point
        ` `, {
            id: 'repl',
            label: 'repl Editor',
            priority: RegisteredEditorPriority.option,
        }, {
            // We want to support all notebook types which could have any file extension,
            // so we just check if the resource corresponds to a notebook
            canSupportResource: (uri) => notebookService.getNotebookTextModel(uri) !== undefined,
            singlePerResource: true,
        }, {
            createUntitledEditorInput: async ({ resource, options }) => {
                if (resource) {
                    const editor = this.editorInputCache.get(resource);
                    if (editor && !editor.isDisposed()) {
                        return { editor, options };
                    }
                    else if (editor) {
                        this.editorInputCache.delete(resource);
                    }
                }
                const scratchpad = this.configurationService.getValue(NotebookSetting.InteractiveWindowPromptToSave) !== true;
                const ref = await this.notebookEditorModelResolverService.resolve({ untitledResource: resource }, 'jupyter-notebook', { scratchpad, viewType: 'repl' });
                const notebookUri = ref.object.notebook.uri;
                // untitled notebooks are disposed when they get saved. we should not hold a reference
                // to such a disposed notebook and therefore dispose the reference as well
                ref.object.notebook.onWillDispose(() => {
                    ref.dispose();
                });
                const label = options?.label ?? undefined;
                const editor = this.instantiationService.createInstance(ReplEditorInput, notebookUri, label);
                this.editorInputCache.set(notebookUri, editor);
                Event.once(editor.onWillDispose)(() => this.editorInputCache.delete(notebookUri));
                return { editor, options };
            },
            createEditorInput: async ({ resource, options }) => {
                if (this.editorInputCache.has(resource)) {
                    return { editor: this.editorInputCache.get(resource), options };
                }
                const label = options?.label ?? undefined;
                const editor = this.instantiationService.createInstance(ReplEditorInput, resource, label);
                this.editorInputCache.set(resource, editor);
                Event.once(editor.onWillDispose)(() => this.editorInputCache.delete(resource));
                return { editor, options };
            },
        });
    }
};
ReplDocumentContribution = __decorate([
    __param(0, INotebookService),
    __param(1, IEditorResolverService),
    __param(2, INotebookEditorModelResolverService),
    __param(3, IInstantiationService),
    __param(4, IConfigurationService)
], ReplDocumentContribution);
export { ReplDocumentContribution };
let ReplWindowWorkingCopyEditorHandler = class ReplWindowWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.replWorkingCopyEditorHandler'; }
    constructor(instantiationService, workingCopyEditorService, extensionService, notebookService) {
        super();
        this.instantiationService = instantiationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.extensionService = extensionService;
        this.notebookService = notebookService;
        this._installHandler();
    }
    async handles(workingCopy) {
        const notebookType = this._getNotebookType(workingCopy);
        if (!notebookType) {
            return false;
        }
        return (!!notebookType &&
            notebookType.viewType === 'repl' &&
            (await this.notebookService.canResolve(notebookType.notebookType)));
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        return editor instanceof ReplEditorInput && isEqual(workingCopy.resource, editor.resource);
    }
    createEditor(workingCopy) {
        return this.instantiationService.createInstance(ReplEditorInput, workingCopy.resource, undefined);
    }
    async _installHandler() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        this._register(this.workingCopyEditorService.registerHandler(this));
    }
    _getNotebookType(workingCopy) {
        return NotebookWorkingCopyTypeIdentifier.parse(workingCopy.typeId);
    }
};
ReplWindowWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IExtensionService),
    __param(3, INotebookService)
], ReplWindowWorkingCopyEditorHandler);
registerWorkbenchContribution2(ReplWindowWorkingCopyEditorHandler.ID, ReplWindowWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ReplDocumentContribution.ID, ReplDocumentContribution, 2 /* WorkbenchPhase.BlockRestore */);
AccessibleViewRegistry.register(new ReplEditorInputAccessibilityHelp());
AccessibleViewRegistry.register(new ReplEditorHistoryAccessibilityHelp());
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'repl.focusLastItemExecuted',
            title: localize2('repl.focusLastReplOutput', 'Focus Most Recent REPL Execution'),
            category: 'REPL',
            menu: {
                id: MenuId.CommandPalette,
                when: MOST_RECENT_REPL_EDITOR,
            },
            keybinding: [
                {
                    primary: KeyChord(512 /* KeyMod.Alt */ | 13 /* KeyCode.End */, 512 /* KeyMod.Alt */ | 13 /* KeyCode.End */),
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                    when: ContextKeyExpr.or(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED.negate()),
                },
            ],
            precondition: MOST_RECENT_REPL_EDITOR,
        });
    }
    async run(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        const contextKeyService = accessor.get(IContextKeyService);
        let notebookEditor;
        if (editorControl && isReplEditorControl(editorControl)) {
            notebookEditor = editorControl.notebookEditor;
        }
        else {
            const uriString = MOST_RECENT_REPL_EDITOR.getValue(contextKeyService);
            const uri = uriString ? URI.parse(uriString) : undefined;
            if (!uri) {
                return;
            }
            const replEditor = editorService.findEditors(uri)[0];
            if (replEditor) {
                const editor = await editorService.openEditor(replEditor.editor, replEditor.groupId);
                const editorControl = editor?.getControl();
                if (editorControl && isReplEditorControl(editorControl)) {
                    notebookEditor = editorControl.notebookEditor;
                }
            }
        }
        const viewModel = notebookEditor?.getViewModel();
        if (notebookEditor && viewModel) {
            // last cell of the viewmodel is the last cell history
            const lastCellIndex = viewModel.length - 1;
            if (lastCellIndex >= 0) {
                const cell = viewModel.viewCells[lastCellIndex];
                notebookEditor.focusNotebookCell(cell, 'container');
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'repl.input.focus',
            title: localize2('repl.input.focus', 'Focus Input Editor'),
            category: 'REPL',
            menu: {
                id: MenuId.CommandPalette,
                when: MOST_RECENT_REPL_EDITOR,
            },
            keybinding: [
                {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED),
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                },
                {
                    when: ContextKeyExpr.and(MOST_RECENT_REPL_EDITOR),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
                    primary: KeyChord(512 /* KeyMod.Alt */ | 14 /* KeyCode.Home */, 512 /* KeyMod.Alt */ | 14 /* KeyCode.Home */),
                },
            ],
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        const contextKeyService = accessor.get(IContextKeyService);
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            editorService.activeEditorPane?.focus();
        }
        else {
            const uriString = MOST_RECENT_REPL_EDITOR.getValue(contextKeyService);
            const uri = uriString ? URI.parse(uriString) : undefined;
            if (!uri) {
                return;
            }
            const replEditor = editorService.findEditors(uri)[0];
            if (replEditor) {
                await editorService.openEditor({ resource: uri, options: { preserveFocus: false } }, replEditor.groupId);
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'repl.execute',
            title: localize2('repl.execute', 'Execute REPL input'),
            category: 'REPL',
            keybinding: [
                {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.repl'), NOTEBOOK_CELL_LIST_FOCUSED.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
                {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.repl'), ContextKeyExpr.equals('config.interactiveWindow.executeWithShiftEnter', true), NOTEBOOK_CELL_LIST_FOCUSED.negate()),
                    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
                {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.repl'), ContextKeyExpr.equals('config.interactiveWindow.executeWithShiftEnter', false), NOTEBOOK_CELL_LIST_FOCUSED.negate()),
                    primary: 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
            ],
            menu: [
                {
                    id: MenuId.ReplInputExecute,
                },
            ],
            icon: icons.executeIcon,
            f1: false,
            metadata: {
                description: 'Execute the Contents of the Input Box',
                args: [
                    {
                        name: 'resource',
                        description: 'Interactive resource Uri',
                        isOptional: true,
                    },
                ],
            },
        });
    }
    async run(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const bulkEditService = accessor.get(IBulkEditService);
        const historyService = accessor.get(IInteractiveHistoryService);
        const notebookEditorService = accessor.get(INotebookEditorService);
        let editorControl;
        if (context) {
            const resourceUri = URI.revive(context);
            const editors = editorService.findEditors(resourceUri);
            for (const found of editors) {
                if (found.editor.typeId === ReplEditorInput.ID) {
                    const editor = await editorService.openEditor(found.editor, found.groupId);
                    editorControl = editor?.getControl();
                    break;
                }
            }
        }
        else {
            editorControl = editorService.activeEditorPane?.getControl();
        }
        if (isReplEditorControl(editorControl)) {
            executeReplInput(bulkEditService, historyService, notebookEditorService, editorControl);
        }
    }
});
async function executeReplInput(bulkEditService, historyService, notebookEditorService, editorControl) {
    if (editorControl && editorControl.notebookEditor && editorControl.activeCodeEditor) {
        const notebookDocument = editorControl.notebookEditor.textModel;
        const textModel = editorControl.activeCodeEditor.getModel();
        const activeKernel = editorControl.notebookEditor.activeKernel;
        const language = activeKernel?.supportedLanguages[0] ?? PLAINTEXT_LANGUAGE_ID;
        if (notebookDocument && textModel) {
            const index = notebookDocument.length - 1;
            const value = textModel.getValue();
            if (isFalsyOrWhitespace(value)) {
                return;
            }
            // Just accept any existing inline chat hunk
            const ctrl = InlineChatController.get(editorControl.activeCodeEditor);
            if (ctrl) {
                ctrl.acceptSession();
            }
            historyService.replaceLast(notebookDocument.uri, value);
            historyService.addToHistory(notebookDocument.uri, '');
            textModel.setValue('');
            notebookDocument.cells[index].resetTextBuffer(textModel.getTextBuffer());
            const collapseState = editorControl.notebookEditor.notebookOptions.getDisplayOptions()
                .interactiveWindowCollapseCodeCells === 'fromEditor'
                ? {
                    inputCollapsed: false,
                    outputCollapsed: false,
                }
                : undefined;
            await bulkEditService.apply([
                new ResourceNotebookCellEdit(notebookDocument.uri, {
                    editType: 1 /* CellEditType.Replace */,
                    index: index,
                    count: 0,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            mime: undefined,
                            language,
                            source: value,
                            outputs: [],
                            metadata: {},
                            collapseState,
                        },
                    ],
                }),
            ]);
            // reveal the cell into view first
            const range = { start: index, end: index + 1 };
            editorControl.notebookEditor.revealCellRangeInView(range);
            await editorControl.notebookEditor.executeNotebookCells(editorControl.notebookEditor.getCellsInRange({ start: index, end: index + 1 }));
            // update the selection and focus in the extension host model
            const editor = notebookEditorService.getNotebookEditor(editorControl.notebookEditor.getId());
            if (editor) {
                editor.setSelections([range]);
                editor.setFocus(range);
            }
        }
    }
}
AccessibleViewRegistry.register(new ReplEditorAccessibleView());
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.find.replInputFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    when: ContextKeyExpr.equals('view', REPL_VIEW_ID),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
    secondary: [61 /* KeyCode.F3 */],
    handler: (accessor) => {
        getReplView(accessor.get(IViewsService))?.openFind();
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZXBsTm90ZWJvb2svYnJvd3Nlci9yZXBsLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDNUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzdHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxD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