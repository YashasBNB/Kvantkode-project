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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbnRlcmFjdGl2ZS9icm93c2VyL2ludGVyYWN0aXZlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUU1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsT0FBTyxJQUFJLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2pH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