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
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../editor/browser/services/bulkEditService.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { peekViewBorder } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { Context as SuggestContext } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorActivation, } from '../../../../platform/editor/common/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { contrastBorder, ifDefinedThenElse, listInactiveSelectionBackground, registerColor, } from '../../../../platform/theme/common/colorRegistry.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions, } from '../../../common/editor.js';
import { PANEL_BORDER } from '../../../common/theme.js';
import { ResourceNotebookCellEdit } from '../../bulkEdit/browser/bulkCellEdits.js';
import { ReplEditorSettings, INTERACTIVE_INPUT_CURSOR_BOUNDARY } from './interactiveCommon.js';
import { IInteractiveDocumentService, InteractiveDocumentService, } from './interactiveDocumentService.js';
import { InteractiveEditor } from './interactiveEditor.js';
import { InteractiveEditorInput } from './interactiveEditorInput.js';
import { IInteractiveHistoryService, InteractiveHistoryService, } from './interactiveHistoryService.js';
import { NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT } from '../../notebook/browser/controller/coreActions.js';
import * as icons from '../../notebook/browser/notebookIcons.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { CellKind, CellUri, INTERACTIVE_WINDOW_EDITOR_ID, NotebookSetting, NotebookWorkingCopyTypeIdentifier, } from '../../notebook/common/notebookCommon.js';
import { InteractiveWindowOpen, IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED, } from '../../notebook/common/notebookContextKeys.js';
import { INotebookKernelService } from '../../notebook/common/notebookKernelService.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { columnToEditorGroup } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkingCopyEditorService, } from '../../../services/workingCopy/common/workingCopyEditorService.js';
import { isReplEditorControl } from '../../replNotebook/browser/replEditor.js';
import { InlineChatController } from '../../inlineChat/browser/inlineChatController.js';
import { IsLinuxContext, IsWindowsContext, } from '../../../../platform/contextkey/common/contextkeys.js';
const interactiveWindowCategory = localize2('interactiveWindow', 'Interactive Window');
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(InteractiveEditor, INTERACTIVE_WINDOW_EDITOR_ID, 'Interactive Window'), [new SyncDescriptor(InteractiveEditorInput)]);
let InteractiveDocumentContribution = class InteractiveDocumentContribution extends Disposable {
    static { this.ID = 'workbench.contrib.interactiveDocument'; }
    constructor(notebookService, editorResolverService, editorService, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        const info = notebookService.getContributedNotebookType('interactive');
        // We need to contribute a notebook type for the Interactive Window to provide notebook models.
        if (!info) {
            this._register(notebookService.registerContributedNotebookType('interactive', {
                providerDisplayName: 'Interactive Notebook',
                displayName: 'Interactive',
                filenamePattern: ['*.interactive'],
                priority: RegisteredEditorPriority.builtin,
            }));
        }
        editorResolverService.registerEditor(`${Schemas.vscodeInteractiveInput}:/**`, {
            id: 'vscode-interactive-input',
            label: 'Interactive Editor',
            priority: RegisteredEditorPriority.exclusive,
        }, {
            canSupportResource: (uri) => uri.scheme === Schemas.vscodeInteractiveInput,
            singlePerResource: true,
        }, {
            createEditorInput: ({ resource }) => {
                const editorInput = editorService
                    .getEditors(1 /* EditorsOrder.SEQUENTIAL */)
                    .find((editor) => editor.editor instanceof InteractiveEditorInput &&
                    editor.editor.inputResource.toString() === resource.toString());
                return editorInput;
            },
        });
        editorResolverService.registerEditor(`*.interactive`, {
            id: 'interactive',
            label: 'Interactive Editor',
            priority: RegisteredEditorPriority.exclusive,
        }, {
            canSupportResource: (uri) => (uri.scheme === Schemas.untitled && extname(uri) === '.interactive') ||
                (uri.scheme === Schemas.vscodeNotebookCell && extname(uri) === '.interactive'),
            singlePerResource: true,
        }, {
            createEditorInput: ({ resource, options }) => {
                const data = CellUri.parse(resource);
                let cellOptions;
                let iwResource = resource;
                if (data) {
                    cellOptions = { resource, options };
                    iwResource = data.notebook;
                }
                const notebookOptions = {
                    ...options,
                    cellOptions,
                    cellRevealType: undefined,
                    cellSelections: undefined,
                    isReadOnly: undefined,
                    viewState: undefined,
                    indexedCellOptions: undefined,
                };
                const editorInput = createEditor(iwResource, this.instantiationService);
                return {
                    editor: editorInput,
                    options: notebookOptions,
                };
            },
            createUntitledEditorInput: ({ resource, options }) => {
                if (!resource) {
                    throw new Error('Interactive window editors must have a resource name');
                }
                const data = CellUri.parse(resource);
                let cellOptions;
                if (data) {
                    cellOptions = { resource, options };
                }
                const notebookOptions = {
                    ...options,
                    cellOptions,
                    cellRevealType: undefined,
                    cellSelections: undefined,
                    isReadOnly: undefined,
                    viewState: undefined,
                    indexedCellOptions: undefined,
                };
                const editorInput = createEditor(resource, this.instantiationService);
                return {
                    editor: editorInput,
                    options: notebookOptions,
                };
            },
        });
    }
};
InteractiveDocumentContribution = __decorate([
    __param(0, INotebookService),
    __param(1, IEditorResolverService),
    __param(2, IEditorService),
    __param(3, IInstantiationService)
], InteractiveDocumentContribution);
export { InteractiveDocumentContribution };
let InteractiveInputContentProvider = class InteractiveInputContentProvider {
    static { this.ID = 'workbench.contrib.interactiveInputContentProvider'; }
    constructor(textModelService, _modelService) {
        this._modelService = _modelService;
        this._registration = textModelService.registerTextModelContentProvider(Schemas.vscodeInteractiveInput, this);
    }
    dispose() {
        this._registration.dispose();
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const result = this._modelService.createModel('', null, resource, false);
        return result;
    }
};
InteractiveInputContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService)
], InteractiveInputContentProvider);
function createEditor(resource, instantiationService) {
    const counter = /\/Interactive-(\d+)/.exec(resource.path);
    const inputBoxPath = counter && counter[1] ? `/InteractiveInput-${counter[1]}` : 'InteractiveInput';
    const inputUri = URI.from({ scheme: Schemas.vscodeInteractiveInput, path: inputBoxPath });
    const editorInput = InteractiveEditorInput.create(instantiationService, resource, inputUri);
    return editorInput;
}
let InteractiveWindowWorkingCopyEditorHandler = class InteractiveWindowWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.interactiveWindowWorkingCopyEditorHandler'; }
    constructor(_instantiationService, _workingCopyEditorService, _extensionService) {
        super();
        this._instantiationService = _instantiationService;
        this._workingCopyEditorService = _workingCopyEditorService;
        this._extensionService = _extensionService;
        this._installHandler();
    }
    handles(workingCopy) {
        const viewType = this._getViewType(workingCopy);
        return !!viewType && viewType === 'interactive';
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        return (editor instanceof InteractiveEditorInput && isEqual(workingCopy.resource, editor.resource));
    }
    createEditor(workingCopy) {
        return createEditor(workingCopy.resource, this._instantiationService);
    }
    async _installHandler() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        this._register(this._workingCopyEditorService.registerHandler(this));
    }
    _getViewType(workingCopy) {
        return NotebookWorkingCopyTypeIdentifier.parse(workingCopy.typeId)?.viewType;
    }
};
InteractiveWindowWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IExtensionService)
], InteractiveWindowWorkingCopyEditorHandler);
registerWorkbenchContribution2(InteractiveDocumentContribution.ID, InteractiveDocumentContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(InteractiveInputContentProvider.ID, InteractiveInputContentProvider, {
    editorTypeId: INTERACTIVE_WINDOW_EDITOR_ID,
});
registerWorkbenchContribution2(InteractiveWindowWorkingCopyEditorHandler.ID, InteractiveWindowWorkingCopyEditorHandler, {
    editorTypeId: INTERACTIVE_WINDOW_EDITOR_ID,
});
export class InteractiveEditorSerializer {
    static { this.ID = InteractiveEditorInput.ID; }
    canSerialize(editor) {
        if (!(editor instanceof InteractiveEditorInput)) {
            return false;
        }
        return URI.isUri(editor.primary.resource) && URI.isUri(editor.inputResource);
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        return JSON.stringify({
            resource: input.primary.resource,
            inputResource: input.inputResource,
            name: input.getName(),
            language: input.language,
        });
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, inputResource, name, language } = data;
        if (!URI.isUri(resource) || !URI.isUri(inputResource)) {
            return undefined;
        }
        const input = InteractiveEditorInput.create(instantiationService, resource, inputResource, name, language);
        return input;
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(InteractiveEditorSerializer.ID, InteractiveEditorSerializer);
registerSingleton(IInteractiveHistoryService, InteractiveHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(IInteractiveDocumentService, InteractiveDocumentService, 1 /* InstantiationType.Delayed */);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: '_interactive.open',
            title: localize2('interactive.open', 'Open Interactive Window'),
            f1: false,
            category: interactiveWindowCategory,
            metadata: {
                description: localize('interactive.open', 'Open Interactive Window'),
                args: [
                    {
                        name: 'showOptions',
                        description: 'Show Options',
                        schema: {
                            type: 'object',
                            properties: {
                                viewColumn: {
                                    type: 'number',
                                    default: -1,
                                },
                                preserveFocus: {
                                    type: 'boolean',
                                    default: true,
                                },
                            },
                        },
                    },
                    {
                        name: 'resource',
                        description: 'Interactive resource Uri',
                        isOptional: true,
                    },
                    {
                        name: 'controllerId',
                        description: 'Notebook controller Id',
                        isOptional: true,
                    },
                    {
                        name: 'title',
                        description: 'Notebook editor title',
                        isOptional: true,
                    },
                ],
            },
        });
    }
    async run(accessor, showOptions, resource, id, title) {
        const editorService = accessor.get(IEditorService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const historyService = accessor.get(IInteractiveHistoryService);
        const kernelService = accessor.get(INotebookKernelService);
        const logService = accessor.get(ILogService);
        const configurationService = accessor.get(IConfigurationService);
        const group = columnToEditorGroup(editorGroupService, configurationService, typeof showOptions === 'number' ? showOptions : showOptions?.viewColumn);
        const editorOptions = {
            activation: EditorActivation.PRESERVE,
            preserveFocus: typeof showOptions !== 'number' ? (showOptions?.preserveFocus ?? false) : false,
        };
        if (resource && extname(resource) === '.interactive') {
            logService.debug('Open interactive window from resource:', resource.toString());
            const resourceUri = URI.revive(resource);
            const editors = editorService
                .findEditors(resourceUri)
                .filter((id) => id.editor instanceof InteractiveEditorInput &&
                id.editor.resource?.toString() === resourceUri.toString());
            if (editors.length) {
                logService.debug('Find existing interactive window:', resource.toString());
                const editorInput = editors[0].editor;
                const currentGroup = editors[0].groupId;
                const editor = await editorService.openEditor(editorInput, editorOptions, currentGroup);
                const editorControl = editor?.getControl();
                return {
                    notebookUri: editorInput.resource,
                    inputUri: editorInput.inputResource,
                    notebookEditorId: editorControl?.notebookEditor?.getId(),
                };
            }
        }
        const existingNotebookDocument = new Set();
        editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */).forEach((editor) => {
            if (editor.editor.resource) {
                existingNotebookDocument.add(editor.editor.resource.toString());
            }
        });
        let notebookUri = undefined;
        let inputUri = undefined;
        let counter = 1;
        do {
            notebookUri = URI.from({
                scheme: Schemas.untitled,
                path: `/Interactive-${counter}.interactive`,
            });
            inputUri = URI.from({
                scheme: Schemas.vscodeInteractiveInput,
                path: `/InteractiveInput-${counter}`,
            });
            counter++;
        } while (existingNotebookDocument.has(notebookUri.toString()));
        InteractiveEditorInput.setName(notebookUri, title);
        logService.debug('Open new interactive window:', notebookUri.toString(), inputUri.toString());
        if (id) {
            const allKernels = kernelService.getMatchingKernel({
                uri: notebookUri,
                notebookType: 'interactive',
            }).all;
            const preferredKernel = allKernels.find((kernel) => kernel.id === id);
            if (preferredKernel) {
                kernelService.preselectKernelForNotebook(preferredKernel, {
                    uri: notebookUri,
                    notebookType: 'interactive',
                });
            }
        }
        historyService.clearHistory(notebookUri);
        const editorInput = { resource: notebookUri, options: editorOptions };
        const editorPane = await editorService.openEditor(editorInput, group);
        const editorControl = editorPane?.getControl();
        // Extensions must retain references to these URIs to manipulate the interactive editor
        logService.debug('New interactive window opened. Notebook editor id', editorControl?.notebookEditor?.getId());
        return { notebookUri, inputUri, notebookEditorId: editorControl?.notebookEditor?.getId() };
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.execute',
            title: localize2('interactive.execute', 'Execute Code'),
            category: interactiveWindowCategory,
            keybinding: [
                {
                    // when: NOTEBOOK_CELL_LIST_FOCUSED,
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
                {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'), ContextKeyExpr.equals('config.interactiveWindow.executeWithShiftEnter', true)),
                    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
                {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'), ContextKeyExpr.equals('config.interactiveWindow.executeWithShiftEnter', false)),
                    primary: 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
            ],
            menu: [
                {
                    id: MenuId.InteractiveInputExecute,
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
                if (found.editor.typeId === InteractiveEditorInput.ID) {
                    const editor = await editorService.openEditor(found.editor, found.groupId);
                    editorControl = editor?.getControl();
                    break;
                }
            }
        }
        else {
            editorControl = editorService.activeEditorPane?.getControl();
        }
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            const notebookDocument = editorControl.notebookEditor.textModel;
            const textModel = editorControl.activeCodeEditor?.getModel();
            const activeKernel = editorControl.notebookEditor.activeKernel;
            const language = activeKernel?.supportedLanguages[0] ?? PLAINTEXT_LANGUAGE_ID;
            if (notebookDocument && textModel && editorControl.activeCodeEditor) {
                const index = notebookDocument.length;
                const value = textModel.getValue();
                if (isFalsyOrWhitespace(value)) {
                    return;
                }
                const ctrl = InlineChatController.get(editorControl.activeCodeEditor);
                if (ctrl) {
                    ctrl.acceptSession();
                }
                historyService.replaceLast(notebookDocument.uri, value);
                historyService.addToHistory(notebookDocument.uri, '');
                textModel.setValue('');
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
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.input.clear',
            title: localize2('interactive.input.clear', 'Clear the interactive window input editor contents'),
            category: interactiveWindowCategory,
            f1: false,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            const notebookDocument = editorControl.notebookEditor.textModel;
            const editor = editorControl.activeCodeEditor;
            const range = editor?.getModel()?.getFullModelRange();
            if (notebookDocument && editor && range) {
                editor.executeEdits('', [EditOperation.replace(range, null)]);
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.history.previous',
            title: localize2('interactive.history.previous', 'Previous value in history'),
            category: interactiveWindowCategory,
            f1: false,
            keybinding: {
                when: ContextKeyExpr.and(INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('bottom'), INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('none'), SuggestContext.Visible.toNegated()),
                primary: 16 /* KeyCode.UpArrow */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            precondition: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED.negate()),
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const historyService = accessor.get(IInteractiveHistoryService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            const notebookDocument = editorControl.notebookEditor.textModel;
            const textModel = editorControl.activeCodeEditor?.getModel();
            if (notebookDocument && textModel) {
                const previousValue = historyService.getPreviousValue(notebookDocument.uri);
                if (previousValue) {
                    textModel.setValue(previousValue);
                }
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.history.next',
            title: localize2('interactive.history.next', 'Next value in history'),
            category: interactiveWindowCategory,
            f1: false,
            keybinding: {
                when: ContextKeyExpr.and(INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('top'), INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('none'), SuggestContext.Visible.toNegated()),
                primary: 18 /* KeyCode.DownArrow */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            precondition: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED.negate()),
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const historyService = accessor.get(IInteractiveHistoryService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            const notebookDocument = editorControl.notebookEditor.textModel;
            const textModel = editorControl.activeCodeEditor?.getModel();
            if (notebookDocument && textModel) {
                const nextValue = historyService.getNextValue(notebookDocument.uri);
                if (nextValue !== null) {
                    textModel.setValue(nextValue);
                }
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.scrollToTop',
            title: localize('interactiveScrollToTop', 'Scroll to Top'),
            keybinding: {
                when: ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'),
                primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            category: interactiveWindowCategory,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            if (editorControl.notebookEditor.getLength() === 0) {
                return;
            }
            editorControl.notebookEditor.revealCellRangeInView({ start: 0, end: 1 });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.scrollToBottom',
            title: localize('interactiveScrollToBottom', 'Scroll to Bottom'),
            keybinding: {
                when: ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'),
                primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            category: interactiveWindowCategory,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            if (editorControl.notebookEditor.getLength() === 0) {
                return;
            }
            const len = editorControl.notebookEditor.getLength();
            editorControl.notebookEditor.revealCellRangeInView({ start: len - 1, end: len });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.input.focus',
            title: localize2('interactive.input.focus', 'Focus Input Editor'),
            category: interactiveWindowCategory,
            menu: {
                id: MenuId.CommandPalette,
                when: InteractiveWindowOpen,
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            editorService.activeEditorPane?.focus();
        }
        else {
            // find and open the most recent interactive window
            const openEditors = editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
            const interactiveWindow = Iterable.find(openEditors, (identifier) => {
                return identifier.editor.typeId === InteractiveEditorInput.ID;
            });
            if (interactiveWindow) {
                const editorInput = interactiveWindow.editor;
                const currentGroup = interactiveWindow.groupId;
                const editor = await editorService.openEditor(editorInput, currentGroup);
                const editorControl = editor?.getControl();
                if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
                    editorService.activeEditorPane?.focus();
                }
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.history.focus',
            title: localize2('interactive.history.focus', 'Focus History'),
            category: interactiveWindowCategory,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'),
            },
            keybinding: [
                {
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    when: ContextKeyExpr.and(INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('bottom'), INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('none')),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                },
                {
                    when: ContextKeyExpr.or(IsWindowsContext, IsLinuxContext),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                },
            ],
            precondition: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED.negate()),
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            editorControl.notebookEditor.focus();
        }
    }
});
registerColor('interactive.activeCodeBorder', {
    dark: ifDefinedThenElse(peekViewBorder, peekViewBorder, '#007acc'),
    light: ifDefinedThenElse(peekViewBorder, peekViewBorder, '#007acc'),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('interactive.activeCodeBorder', 'The border color for the current interactive code cell when the editor has focus.'));
registerColor('interactive.inactiveCodeBorder', {
    //dark: theme.getColor(listInactiveSelectionBackground) ?? transparent(listInactiveSelectionBackground, 1),
    dark: ifDefinedThenElse(listInactiveSelectionBackground, listInactiveSelectionBackground, '#37373D'),
    light: ifDefinedThenElse(listInactiveSelectionBackground, listInactiveSelectionBackground, '#E4E6F1'),
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER,
}, localize('interactive.inactiveCodeBorder', 'The border color for the current interactive code cell when the editor does not have focus.'));
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'interactiveWindow',
    order: 100,
    type: 'object',
    properties: {
        [ReplEditorSettings.interactiveWindowAlwaysScrollOnNewCell]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('interactiveWindow.alwaysScrollOnNewCell', 'Automatically scroll the interactive window to show the output of the last statement executed. If this value is false, the window will only scroll if the last cell was already the one scrolled to.'),
        },
        [NotebookSetting.InteractiveWindowPromptToSave]: {
            type: 'boolean',
            default: false,
            markdownDescription: localize('interactiveWindow.promptToSaveOnClose', 'Prompt to save the interactive window when it is closed. Only new interactive windows will be affected by this setting change.'),
        },
        [ReplEditorSettings.executeWithShiftEnter]: {
            type: 'boolean',
            default: false,
            markdownDescription: localize('interactiveWindow.executeWithShiftEnter', 'Execute the Interactive Window (REPL) input box with shift+enter, so that enter can be used to create a newline.'),
            tags: ['replExecute'],
        },
        [ReplEditorSettings.showExecutionHint]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('interactiveWindow.showExecutionHint', 'Display a hint in the Interactive Window (REPL) input box to indicate how to execute code.'),
            tags: ['replExecute'],
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW50ZXJhY3RpdmUvYnJvd3Nlci9pbnRlcmFjdGl2ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLE9BQU8sSUFBSSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNB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