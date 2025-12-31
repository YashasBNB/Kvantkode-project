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
var NotebookContribution_1;
import { Schemas } from '../../../../base/common/network.js';
import { Disposable, DisposableStore, dispose, } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { toFormattedString } from '../../../../base/common/jsonFormatter.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService, } from '../../../../editor/common/languages/language.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import * as nls from '../../../../nls.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions, } from '../../../common/editor.js';
import { NotebookEditor } from './notebookEditor.js';
import { NotebookEditorInput } from '../common/notebookEditorInput.js';
import { INotebookService } from '../common/notebookService.js';
import { NotebookService } from './services/notebookServiceImpl.js';
import { CellKind, CellUri, NotebookWorkingCopyTypeIdentifier, NotebookSetting, NotebookCellsChangeType, NotebookMetadataUri, } from '../common/notebookCommon.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { INotebookEditorModelResolverService } from '../common/notebookEditorModelResolverService.js';
import { NotebookDiffEditorInput } from '../common/notebookDiffEditorInput.js';
import { NotebookTextDiffEditor } from './diff/notebookDiffEditor.js';
import { INotebookEditorWorkerService } from '../common/services/notebookWorkerService.js';
import { NotebookEditorWorkerServiceImpl } from './services/notebookWorkerServiceImpl.js';
import { INotebookCellStatusBarService } from '../common/notebookCellStatusBarService.js';
import { NotebookCellStatusBarService } from './services/notebookCellStatusBarServiceImpl.js';
import { INotebookEditorService } from './services/notebookEditorService.js';
import { NotebookEditorWidgetService } from './services/notebookEditorServiceImpl.js';
import { Extensions as JSONExtensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Event } from '../../../../base/common/event.js';
import { getFormattedOutputJSON, getStreamOutputData } from './diff/diffElementViewModel.js';
import { NotebookModelResolverServiceImpl } from '../common/notebookEditorModelResolverServiceImpl.js';
import { INotebookKernelHistoryService, INotebookKernelService, } from '../common/notebookKernelService.js';
import { NotebookKernelService } from './services/notebookKernelServiceImpl.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkingCopyEditorService, } from '../../../services/workingCopy/common/workingCopyEditorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { NotebookRendererMessagingService } from './services/notebookRendererMessagingServiceImpl.js';
import { INotebookRendererMessagingService } from '../common/notebookRendererMessagingService.js';
import { INotebookCellOutlineDataSourceFactory, NotebookCellOutlineDataSourceFactory, } from './viewModel/notebookOutlineDataSourceFactory.js';
// Editor Controller
import './controller/coreActions.js';
import './controller/insertCellActions.js';
import './controller/executeActions.js';
import './controller/sectionActions.js';
import './controller/layoutActions.js';
import './controller/editActions.js';
import './controller/cellOutputActions.js';
import './controller/apiActions.js';
import './controller/foldingController.js';
import './controller/chat/notebook.chat.contribution.js';
import './controller/variablesActions.js';
// Editor Contribution
import './contrib/editorHint/emptyCellEditorHint.js';
import './contrib/clipboard/notebookClipboard.js';
import './contrib/find/notebookFind.js';
import './contrib/format/formatting.js';
import './contrib/saveParticipants/saveParticipants.js';
import './contrib/gettingStarted/notebookGettingStarted.js';
import './contrib/layout/layoutActions.js';
import './contrib/marker/markerProvider.js';
import './contrib/navigation/arrow.js';
import './contrib/outline/notebookOutline.js';
import './contrib/profile/notebookProfile.js';
import './contrib/cellStatusBar/statusBarProviders.js';
import './contrib/cellStatusBar/contributedStatusBarItemController.js';
import './contrib/cellStatusBar/executionStatusBarItemController.js';
import './contrib/editorStatusBar/editorStatusBar.js';
import './contrib/undoRedo/notebookUndoRedo.js';
import './contrib/cellCommands/cellCommands.js';
import './contrib/viewportWarmup/viewportWarmup.js';
import './contrib/troubleshoot/layout.js';
import './contrib/debug/notebookBreakpoints.js';
import './contrib/debug/notebookCellPausing.js';
import './contrib/debug/notebookDebugDecorations.js';
import './contrib/execute/executionEditorProgress.js';
import './contrib/kernelDetection/notebookKernelDetection.js';
import './contrib/cellDiagnostics/cellDiagnostics.js';
import './contrib/multicursor/notebookMulticursor.js';
import './contrib/multicursor/notebookSelectionHighlight.js';
import './contrib/notebookVariables/notebookInlineVariables.js';
// Diff Editor Contribution
import './diff/notebookDiffActions.js';
// Services
import { editorOptionsRegistry } from '../../../../editor/common/config/editorOptions.js';
import { NotebookExecutionStateService } from './services/notebookExecutionStateServiceImpl.js';
import { NotebookExecutionService } from './services/notebookExecutionServiceImpl.js';
import { INotebookExecutionService } from '../common/notebookExecutionService.js';
import { INotebookKeymapService } from '../common/notebookKeymapService.js';
import { NotebookKeymapService } from './services/notebookKeymapServiceImpl.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { INotebookExecutionStateService } from '../common/notebookExecutionStateService.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { COMMENTEDITOR_DECORATION_KEY } from '../../comments/browser/commentReply.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { NotebookKernelHistoryService } from './services/notebookKernelHistoryServiceImpl.js';
import { INotebookLoggingService } from '../common/notebookLoggingService.js';
import { NotebookLoggingService } from './services/notebookLoggingServiceImpl.js';
import product from '../../../../platform/product/common/product.js';
import { NotebookVariables } from './contrib/notebookVariables/notebookVariables.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { NotebookAccessibilityHelp } from './notebookAccessibilityHelp.js';
import { NotebookAccessibleView } from './notebookAccessibleView.js';
import { DefaultFormatter } from '../../format/browser/formatActionsMultiple.js';
import { NotebookMultiTextDiffEditor } from './diff/notebookMultiDiffEditor.js';
import { NotebookMultiDiffEditorInput } from './diff/notebookMultiDiffEditorInput.js';
import { getFormattedMetadataJSON } from '../common/model/notebookCellTextModel.js';
import { INotebookOutlineEntryFactory, NotebookOutlineEntryFactory, } from './viewModel/notebookOutlineEntryFactory.js';
import { getFormattedNotebookMetadataJSON } from '../common/model/notebookMetadataTextModel.js';
/*--------------------------------------------------------------------------------------------- */
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookEditor, NotebookEditor.ID, 'Notebook Editor'), [new SyncDescriptor(NotebookEditorInput)]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookTextDiffEditor, NotebookTextDiffEditor.ID, 'Notebook Diff Editor'), [new SyncDescriptor(NotebookDiffEditorInput)]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NotebookMultiTextDiffEditor, NotebookMultiTextDiffEditor.ID, 'Notebook Diff Editor'), [new SyncDescriptor(NotebookMultiDiffEditorInput)]);
let NotebookDiffEditorSerializer = class NotebookDiffEditorSerializer {
    constructor(_configurationService) {
        this._configurationService = _configurationService;
    }
    canSerialize() {
        return true;
    }
    serialize(input) {
        assertType(input instanceof NotebookDiffEditorInput);
        return JSON.stringify({
            resource: input.resource,
            originalResource: input.original.resource,
            name: input.getName(),
            originalName: input.original.getName(),
            textDiffName: input.getName(),
            viewType: input.viewType,
        });
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, originalResource, name, viewType } = data;
        if (!data ||
            !URI.isUri(resource) ||
            !URI.isUri(originalResource) ||
            typeof name !== 'string' ||
            typeof viewType !== 'string') {
            return undefined;
        }
        if (this._configurationService.getValue('notebook.experimental.enableNewDiffEditor')) {
            return NotebookMultiDiffEditorInput.create(instantiationService, resource, name, undefined, originalResource, viewType);
        }
        else {
            return NotebookDiffEditorInput.create(instantiationService, resource, name, undefined, originalResource, viewType);
        }
    }
    static canResolveBackup(editorInput, backupResource) {
        return false;
    }
};
NotebookDiffEditorSerializer = __decorate([
    __param(0, IConfigurationService)
], NotebookDiffEditorSerializer);
class NotebookEditorSerializer {
    canSerialize(input) {
        return input.typeId === NotebookEditorInput.ID;
    }
    serialize(input) {
        assertType(input instanceof NotebookEditorInput);
        const data = {
            resource: input.resource,
            preferredResource: input.preferredResource,
            viewType: input.viewType,
            options: input.options,
        };
        return JSON.stringify(data);
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, preferredResource, viewType, options } = data;
        if (!data || !URI.isUri(resource) || typeof viewType !== 'string') {
            return undefined;
        }
        const input = NotebookEditorInput.getOrCreate(instantiationService, resource, preferredResource, viewType, options);
        return input;
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(NotebookEditorInput.ID, NotebookEditorSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(NotebookDiffEditorInput.ID, NotebookDiffEditorSerializer);
let NotebookContribution = class NotebookContribution extends Disposable {
    static { NotebookContribution_1 = this; }
    static { this.ID = 'workbench.contrib.notebook'; }
    constructor(undoRedoService, configurationService, codeEditorService) {
        super();
        this.codeEditorService = codeEditorService;
        this.updateCellUndoRedoComparisonKey(configurationService, undoRedoService);
        // Watch for changes to undoRedoPerCell setting
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.undoRedoPerCell)) {
                this.updateCellUndoRedoComparisonKey(configurationService, undoRedoService);
            }
        }));
        // register comment decoration
        this.codeEditorService.registerDecorationType('comment-controller', COMMENTEDITOR_DECORATION_KEY, {});
    }
    // Add or remove the cell undo redo comparison key based on the user setting
    updateCellUndoRedoComparisonKey(configurationService, undoRedoService) {
        const undoRedoPerCell = configurationService.getValue(NotebookSetting.undoRedoPerCell);
        if (!undoRedoPerCell) {
            // Add comparison key to map cell => main document
            if (!this._uriComparisonKeyComputer) {
                this._uriComparisonKeyComputer = undoRedoService.registerUriComparisonKeyComputer(CellUri.scheme, {
                    getComparisonKey: (uri) => {
                        if (undoRedoPerCell) {
                            return uri.toString();
                        }
                        return NotebookContribution_1._getCellUndoRedoComparisonKey(uri);
                    },
                });
            }
        }
        else {
            // Dispose comparison key
            this._uriComparisonKeyComputer?.dispose();
            this._uriComparisonKeyComputer = undefined;
        }
    }
    static _getCellUndoRedoComparisonKey(uri) {
        const data = CellUri.parse(uri);
        if (!data) {
            return uri.toString();
        }
        return data.notebook.toString();
    }
    dispose() {
        super.dispose();
        this._uriComparisonKeyComputer?.dispose();
    }
};
NotebookContribution = NotebookContribution_1 = __decorate([
    __param(0, IUndoRedoService),
    __param(1, IConfigurationService),
    __param(2, ICodeEditorService)
], NotebookContribution);
export { NotebookContribution };
let CellContentProvider = class CellContentProvider {
    static { this.ID = 'workbench.contrib.cellContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._registration = textModelService.registerTextModelContentProvider(CellUri.scheme, this);
    }
    dispose() {
        this._registration.dispose();
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parse(resource);
        // const data = parseCellUri(resource);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        let result = null;
        if (!ref.object.isResolved()) {
            return null;
        }
        for (const cell of ref.object.notebook.cells) {
            if (cell.uri.toString() === resource.toString()) {
                const bufferFactory = {
                    create: (defaultEOL) => {
                        const newEOL = defaultEOL === 2 /* DefaultEndOfLine.CRLF */ ? '\r\n' : '\n';
                        cell.textBuffer.setEOL(newEOL);
                        return { textBuffer: cell.textBuffer, disposable: Disposable.None };
                    },
                    getFirstLineText: (limit) => {
                        return cell.textBuffer.getLineContent(1).substring(0, limit);
                    },
                };
                const languageId = this._languageService.getLanguageIdByLanguageName(cell.language);
                const languageSelection = languageId
                    ? this._languageService.createById(languageId)
                    : cell.cellKind === CellKind.Markup
                        ? this._languageService.createById('markdown')
                        : this._languageService.createByFilepathOrFirstLine(resource, cell.textBuffer.getLineContent(1));
                result = this._modelService.createModel(bufferFactory, languageSelection, resource);
                break;
            }
        }
        if (!result) {
            ref.dispose();
            return null;
        }
        const once = Event.any(result.onWillDispose, ref.object.notebook.onWillDispose)(() => {
            once.dispose();
            ref.dispose();
        });
        return result;
    }
};
CellContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, INotebookEditorModelResolverService)
], CellContentProvider);
let CellInfoContentProvider = class CellInfoContentProvider {
    static { this.ID = 'workbench.contrib.cellInfoContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _labelService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._labelService = _labelService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._disposables = [];
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookCellMetadata, {
            provideTextContent: this.provideMetadataTextContent.bind(this),
        }));
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookCellOutput, {
            provideTextContent: this.provideOutputTextContent.bind(this),
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookCellMetadata,
            formatting: {
                label: '${path} (metadata)',
                separator: '/',
            },
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookCellOutput,
            formatting: {
                label: '${path} (output)',
                separator: '/',
            },
        }));
    }
    dispose() {
        dispose(this._disposables);
    }
    async provideMetadataTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellPropertyUri(resource, Schemas.vscodeNotebookCellMetadata);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        let result = null;
        const mode = this._languageService.createById('json');
        const disposables = new DisposableStore();
        for (const cell of ref.object.notebook.cells) {
            if (cell.handle === data.handle) {
                const cellIndex = ref.object.notebook.cells.indexOf(cell);
                const metadataSource = getFormattedMetadataJSON(ref.object.notebook.transientOptions.transientCellMetadata, cell.metadata, cell.language, true);
                result = this._modelService.createModel(metadataSource, mode, resource);
                this._disposables.push(disposables.add(ref.object.notebook.onDidChangeContent((e) => {
                    if (result &&
                        e.rawEvents.some((event) => (event.kind === NotebookCellsChangeType.ChangeCellMetadata ||
                            event.kind === NotebookCellsChangeType.ChangeCellLanguage) &&
                            event.index === cellIndex)) {
                        const value = getFormattedMetadataJSON(ref.object.notebook.transientOptions.transientCellMetadata, cell.metadata, cell.language, true);
                        if (result.getValue() !== value) {
                            result.setValue(value);
                        }
                    }
                })));
                break;
            }
        }
        if (!result) {
            ref.dispose();
            return null;
        }
        const once = result.onWillDispose(() => {
            disposables.dispose();
            once.dispose();
            ref.dispose();
        });
        return result;
    }
    parseStreamOutput(op) {
        if (!op) {
            return;
        }
        const streamOutputData = getStreamOutputData(op.outputs);
        if (streamOutputData) {
            return {
                content: streamOutputData,
                mode: this._languageService.createById(PLAINTEXT_LANGUAGE_ID),
            };
        }
        return;
    }
    _getResult(data, cell) {
        let result = undefined;
        const mode = this._languageService.createById('json');
        const op = cell.outputs.find((op) => op.outputId === data.outputId || op.alternativeOutputId === data.outputId);
        const streamOutputData = this.parseStreamOutput(op);
        if (streamOutputData) {
            result = streamOutputData;
            return result;
        }
        const obj = cell.outputs.map((output) => ({
            metadata: output.metadata,
            outputItems: output.outputs.map((opit) => ({
                mimeType: opit.mime,
                data: opit.data.toString(),
            })),
        }));
        const outputSource = toFormattedString(obj, {});
        result = {
            content: outputSource,
            mode,
        };
        return result;
    }
    async provideOutputsTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellPropertyUri(resource, Schemas.vscodeNotebookCellOutput);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        const cell = ref.object.notebook.cells.find((cell) => cell.handle === data.handle);
        if (!cell) {
            ref.dispose();
            return null;
        }
        const mode = this._languageService.createById('json');
        const model = this._modelService.createModel(getFormattedOutputJSON(cell.outputs || []), mode, resource, true);
        const cellModelListener = Event.any(cell.onDidChangeOutputs ?? Event.None, cell.onDidChangeOutputItems ?? Event.None)(() => {
            model.setValue(getFormattedOutputJSON(cell.outputs || []));
        });
        const once = model.onWillDispose(() => {
            once.dispose();
            cellModelListener.dispose();
            ref.dispose();
        });
        return model;
    }
    async provideOutputTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = CellUri.parseCellOutputUri(resource);
        if (!data) {
            return this.provideOutputsTextContent(resource);
        }
        const ref = await this._notebookModelResolverService.resolve(data.notebook);
        const cell = ref.object.notebook.cells.find((cell) => !!cell.outputs.find((op) => op.outputId === data.outputId || op.alternativeOutputId === data.outputId));
        if (!cell) {
            ref.dispose();
            return null;
        }
        const result = this._getResult(data, cell);
        if (!result) {
            ref.dispose();
            return null;
        }
        const model = this._modelService.createModel(result.content, result.mode, resource);
        const cellModelListener = Event.any(cell.onDidChangeOutputs ?? Event.None, cell.onDidChangeOutputItems ?? Event.None)(() => {
            const newResult = this._getResult(data, cell);
            if (!newResult) {
                return;
            }
            model.setValue(newResult.content);
            model.setLanguage(newResult.mode.languageId);
        });
        const once = model.onWillDispose(() => {
            once.dispose();
            cellModelListener.dispose();
            ref.dispose();
        });
        return model;
    }
};
CellInfoContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, ILabelService),
    __param(4, INotebookEditorModelResolverService)
], CellInfoContentProvider);
let NotebookMetadataContentProvider = class NotebookMetadataContentProvider {
    static { this.ID = 'workbench.contrib.notebookMetadataContentProvider'; }
    constructor(textModelService, _modelService, _languageService, _labelService, _notebookModelResolverService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._labelService = _labelService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._disposables = [];
        this._disposables.push(textModelService.registerTextModelContentProvider(Schemas.vscodeNotebookMetadata, {
            provideTextContent: this.provideMetadataTextContent.bind(this),
        }));
        this._disposables.push(this._labelService.registerFormatter({
            scheme: Schemas.vscodeNotebookMetadata,
            formatting: {
                label: '${path} (metadata)',
                separator: '/',
            },
        }));
    }
    dispose() {
        dispose(this._disposables);
    }
    async provideMetadataTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const data = NotebookMetadataUri.parse(resource);
        if (!data) {
            return null;
        }
        const ref = await this._notebookModelResolverService.resolve(data);
        let result = null;
        const mode = this._languageService.createById('json');
        const disposables = new DisposableStore();
        const metadataSource = getFormattedNotebookMetadataJSON(ref.object.notebook.transientOptions.transientDocumentMetadata, ref.object.notebook.metadata);
        result = this._modelService.createModel(metadataSource, mode, resource);
        if (!result) {
            ref.dispose();
            return null;
        }
        this._disposables.push(disposables.add(ref.object.notebook.onDidChangeContent((e) => {
            if (result &&
                e.rawEvents.some((event) => event.kind === NotebookCellsChangeType.ChangeCellContent ||
                    event.kind === NotebookCellsChangeType.ChangeDocumentMetadata ||
                    event.kind === NotebookCellsChangeType.ModelChange)) {
                const value = getFormattedNotebookMetadataJSON(ref.object.notebook.transientOptions.transientDocumentMetadata, ref.object.notebook.metadata);
                if (result.getValue() !== value) {
                    result.setValue(value);
                }
            }
        })));
        const once = result.onWillDispose(() => {
            disposables.dispose();
            once.dispose();
            ref.dispose();
        });
        return result;
    }
};
NotebookMetadataContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService),
    __param(3, ILabelService),
    __param(4, INotebookEditorModelResolverService)
], NotebookMetadataContentProvider);
class RegisterSchemasContribution extends Disposable {
    static { this.ID = 'workbench.contrib.registerCellSchemas'; }
    constructor() {
        super();
        this.registerMetadataSchemas();
    }
    registerMetadataSchemas() {
        const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
        const metadataSchema = {
            properties: {
                ['language']: {
                    type: 'string',
                    description: 'The language for the cell',
                },
            },
            // patternProperties: allSettings.patternProperties,
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true,
        };
        jsonRegistry.registerSchema('vscode://schemas/notebook/cellmetadata', metadataSchema);
    }
}
let NotebookEditorManager = class NotebookEditorManager {
    static { this.ID = 'workbench.contrib.notebookEditorManager'; }
    constructor(_editorService, _notebookEditorModelService, editorGroups) {
        this._editorService = _editorService;
        this._notebookEditorModelService = _notebookEditorModelService;
        this._disposables = new DisposableStore();
        this._disposables.add(Event.debounce(this._notebookEditorModelService.onDidChangeDirty, (last, current) => (!last ? [current] : [...last, current]), 100)(this._openMissingDirtyNotebookEditors, this));
        // CLOSE editors when we are about to open conflicting notebooks
        this._disposables.add(_notebookEditorModelService.onWillFailWithConflict((e) => {
            for (const group of editorGroups.groups) {
                const conflictInputs = group.editors.filter((input) => input instanceof NotebookEditorInput &&
                    input.viewType !== e.viewType &&
                    isEqual(input.resource, e.resource));
                const p = group.closeEditors(conflictInputs);
                e.waitUntil(p);
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
    _openMissingDirtyNotebookEditors(models) {
        const result = [];
        for (const model of models) {
            if (model.isDirty() &&
                !this._editorService.isOpened({
                    resource: model.resource,
                    typeId: NotebookEditorInput.ID,
                    editorId: model.viewType,
                }) &&
                extname(model.resource) !== '.interactive') {
                result.push({
                    resource: model.resource,
                    options: { inactive: true, preserveFocus: true, pinned: true, override: model.viewType },
                });
            }
        }
        if (result.length > 0) {
            this._editorService.openEditors(result);
        }
    }
};
NotebookEditorManager = __decorate([
    __param(0, IEditorService),
    __param(1, INotebookEditorModelResolverService),
    __param(2, IEditorGroupsService)
], NotebookEditorManager);
let SimpleNotebookWorkingCopyEditorHandler = class SimpleNotebookWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.simpleNotebookWorkingCopyEditorHandler'; }
    constructor(_instantiationService, _workingCopyEditorService, _extensionService, _notebookService) {
        super();
        this._instantiationService = _instantiationService;
        this._workingCopyEditorService = _workingCopyEditorService;
        this._extensionService = _extensionService;
        this._notebookService = _notebookService;
        this._installHandler();
    }
    async handles(workingCopy) {
        const viewType = this.handlesSync(workingCopy);
        if (!viewType) {
            return false;
        }
        return this._notebookService.canResolve(viewType);
    }
    handlesSync(workingCopy) {
        const viewType = this._getViewType(workingCopy);
        if (!viewType || viewType === 'interactive') {
            return undefined;
        }
        return viewType;
    }
    isOpen(workingCopy, editor) {
        if (!this.handlesSync(workingCopy)) {
            return false;
        }
        return (editor instanceof NotebookEditorInput &&
            editor.viewType === this._getViewType(workingCopy) &&
            isEqual(workingCopy.resource, editor.resource));
    }
    createEditor(workingCopy) {
        return NotebookEditorInput.getOrCreate(this._instantiationService, workingCopy.resource, undefined, this._getViewType(workingCopy));
    }
    async _installHandler() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        this._register(this._workingCopyEditorService.registerHandler(this));
    }
    _getViewType(workingCopy) {
        const notebookType = NotebookWorkingCopyTypeIdentifier.parse(workingCopy.typeId);
        if (notebookType && notebookType.viewType === notebookType.notebookType) {
            return notebookType?.viewType;
        }
        return undefined;
    }
};
SimpleNotebookWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IExtensionService),
    __param(3, INotebookService)
], SimpleNotebookWorkingCopyEditorHandler);
let NotebookLanguageSelectorScoreRefine = class NotebookLanguageSelectorScoreRefine {
    static { this.ID = 'workbench.contrib.notebookLanguageSelectorScoreRefine'; }
    constructor(_notebookService, languageFeaturesService) {
        this._notebookService = _notebookService;
        languageFeaturesService.setNotebookTypeResolver(this._getNotebookInfo.bind(this));
    }
    _getNotebookInfo(uri) {
        const cellUri = CellUri.parse(uri);
        if (!cellUri) {
            return undefined;
        }
        const notebook = this._notebookService.getNotebookTextModel(cellUri.notebook);
        if (!notebook) {
            return undefined;
        }
        return {
            uri: notebook.uri,
            type: notebook.viewType,
        };
    }
};
NotebookLanguageSelectorScoreRefine = __decorate([
    __param(0, INotebookService),
    __param(1, ILanguageFeaturesService)
], NotebookLanguageSelectorScoreRefine);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
registerWorkbenchContribution2(NotebookContribution.ID, NotebookContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(CellContentProvider.ID, CellContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(CellInfoContentProvider.ID, CellInfoContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(NotebookMetadataContentProvider.ID, NotebookMetadataContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(RegisterSchemasContribution.ID, RegisterSchemasContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(NotebookEditorManager.ID, NotebookEditorManager, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(NotebookLanguageSelectorScoreRefine.ID, NotebookLanguageSelectorScoreRefine, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(SimpleNotebookWorkingCopyEditorHandler.ID, SimpleNotebookWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
workbenchContributionsRegistry.registerWorkbenchContribution(NotebookVariables, 4 /* LifecyclePhase.Eventually */);
AccessibleViewRegistry.register(new NotebookAccessibleView());
AccessibleViewRegistry.register(new NotebookAccessibilityHelp());
registerSingleton(INotebookService, NotebookService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorWorkerService, NotebookEditorWorkerServiceImpl, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorModelResolverService, NotebookModelResolverServiceImpl, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookCellStatusBarService, NotebookCellStatusBarService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookEditorService, NotebookEditorWidgetService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKernelService, NotebookKernelService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKernelHistoryService, NotebookKernelHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookExecutionService, NotebookExecutionService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookExecutionStateService, NotebookExecutionStateService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookRendererMessagingService, NotebookRendererMessagingService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookKeymapService, NotebookKeymapService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookLoggingService, NotebookLoggingService, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookCellOutlineDataSourceFactory, NotebookCellOutlineDataSourceFactory, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookOutlineEntryFactory, NotebookOutlineEntryFactory, 1 /* InstantiationType.Delayed */);
const schemas = {};
function isConfigurationPropertySchema(x) {
    return typeof x.type !== 'undefined' || typeof x.anyOf !== 'undefined';
}
for (const editorOption of editorOptionsRegistry) {
    const schema = editorOption.schema;
    if (schema) {
        if (isConfigurationPropertySchema(schema)) {
            schemas[`editor.${editorOption.name}`] = schema;
        }
        else {
            for (const key in schema) {
                if (Object.hasOwnProperty.call(schema, key)) {
                    schemas[key] = schema[key];
                }
            }
        }
    }
}
const editorOptionsCustomizationSchema = {
    description: nls.localize('notebook.editorOptions.experimentalCustomization', 'Settings for code editors used in notebooks. This can be used to customize most editor.* settings.'),
    default: {},
    allOf: [
        {
            properties: schemas,
        },
        // , {
        // 	patternProperties: {
        // 		'^\\[.*\\]$': {
        // 			type: 'object',
        // 			default: {},
        // 			properties: schemas
        // 		}
        // 	}
        // }
    ],
    tags: ['notebookLayout'],
};
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'notebook',
    order: 100,
    title: nls.localize('notebookConfigurationTitle', 'Notebook'),
    type: 'object',
    properties: {
        [NotebookSetting.displayOrder]: {
            description: nls.localize('notebook.displayOrder.description', 'Priority list for output mime types'),
            type: 'array',
            items: {
                type: 'string',
            },
            default: [],
        },
        [NotebookSetting.cellToolbarLocation]: {
            description: nls.localize('notebook.cellToolbarLocation.description', 'Where the cell toolbar should be shown, or whether it should be hidden.'),
            type: 'object',
            additionalProperties: {
                markdownDescription: nls.localize('notebook.cellToolbarLocation.viewType', 'Configure the cell toolbar position for for specific file types'),
                type: 'string',
                enum: ['left', 'right', 'hidden'],
            },
            default: {
                default: 'right',
            },
            tags: ['notebookLayout'],
        },
        [NotebookSetting.showCellStatusBar]: {
            description: nls.localize('notebook.showCellStatusbar.description', 'Whether the cell status bar should be shown.'),
            type: 'string',
            enum: ['hidden', 'visible', 'visibleAfterExecute'],
            enumDescriptions: [
                nls.localize('notebook.showCellStatusbar.hidden.description', 'The cell Status bar is always hidden.'),
                nls.localize('notebook.showCellStatusbar.visible.description', 'The cell Status bar is always visible.'),
                nls.localize('notebook.showCellStatusbar.visibleAfterExecute.description', 'The cell Status bar is hidden until the cell has executed. Then it becomes visible to show the execution status.'),
            ],
            default: 'visible',
            tags: ['notebookLayout'],
        },
        [NotebookSetting.cellExecutionTimeVerbosity]: {
            description: nls.localize('notebook.cellExecutionTimeVerbosity.description', 'Controls the verbosity of the cell execution time in the cell status bar.'),
            type: 'string',
            enum: ['default', 'verbose'],
            enumDescriptions: [
                nls.localize('notebook.cellExecutionTimeVerbosity.default.description', 'The cell execution duration is visible, with advanced information in the hover tooltip.'),
                nls.localize('notebook.cellExecutionTimeVerbosity.verbose.description', 'The cell last execution timestamp and duration are visible, with advanced information in the hover tooltip.'),
            ],
            default: 'default',
            tags: ['notebookLayout'],
        },
        [NotebookSetting.textDiffEditorPreview]: {
            description: nls.localize('notebook.diff.enablePreview.description', 'Whether to use the enhanced text diff editor for notebook.'),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.diffOverviewRuler]: {
            description: nls.localize('notebook.diff.enableOverviewRuler.description', 'Whether to render the overview ruler in the diff editor for notebook.'),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.cellToolbarVisibility]: {
            markdownDescription: nls.localize('notebook.cellToolbarVisibility.description', 'Whether the cell toolbar should appear on hover or click.'),
            type: 'string',
            enum: ['hover', 'click'],
            default: 'click',
            tags: ['notebookLayout'],
        },
        [NotebookSetting.undoRedoPerCell]: {
            description: nls.localize('notebook.undoRedoPerCell.description', 'Whether to use separate undo/redo stack for each cell.'),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.compactView]: {
            description: nls.localize('notebook.compactView.description', 'Control whether the notebook editor should be rendered in a compact form. For example, when turned on, it will decrease the left margin width.'),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.focusIndicator]: {
            description: nls.localize('notebook.focusIndicator.description', 'Controls where the focus indicator is rendered, either along the cell borders or on the left gutter.'),
            type: 'string',
            enum: ['border', 'gutter'],
            default: 'gutter',
            tags: ['notebookLayout'],
        },
        [NotebookSetting.insertToolbarLocation]: {
            description: nls.localize('notebook.insertToolbarPosition.description', 'Control where the insert cell actions should appear.'),
            type: 'string',
            enum: ['betweenCells', 'notebookToolbar', 'both', 'hidden'],
            enumDescriptions: [
                nls.localize('insertToolbarLocation.betweenCells', 'A toolbar that appears on hover between cells.'),
                nls.localize('insertToolbarLocation.notebookToolbar', 'The toolbar at the top of the notebook editor.'),
                nls.localize('insertToolbarLocation.both', 'Both toolbars.'),
                nls.localize('insertToolbarLocation.hidden', "The insert actions don't appear anywhere."),
            ],
            default: 'both',
            tags: ['notebookLayout'],
        },
        [NotebookSetting.globalToolbar]: {
            description: nls.localize('notebook.globalToolbar.description', 'Control whether to render a global toolbar inside the notebook editor.'),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.stickyScrollEnabled]: {
            description: nls.localize('notebook.stickyScrollEnabled.description', 'Experimental. Control whether to render notebook Sticky Scroll headers in the notebook editor.'),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.stickyScrollMode]: {
            description: nls.localize('notebook.stickyScrollMode.description', 'Control whether nested sticky lines appear to stack flat or indented.'),
            type: 'string',
            enum: ['flat', 'indented'],
            enumDescriptions: [
                nls.localize('notebook.stickyScrollMode.flat', 'Nested sticky lines appear flat.'),
                nls.localize('notebook.stickyScrollMode.indented', 'Nested sticky lines appear indented.'),
            ],
            default: 'indented',
            tags: ['notebookLayout'],
        },
        [NotebookSetting.consolidatedOutputButton]: {
            description: nls.localize('notebook.consolidatedOutputButton.description', 'Control whether outputs action should be rendered in the output toolbar.'),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.showFoldingControls]: {
            description: nls.localize('notebook.showFoldingControls.description', 'Controls when the Markdown header folding arrow is shown.'),
            type: 'string',
            enum: ['always', 'never', 'mouseover'],
            enumDescriptions: [
                nls.localize('showFoldingControls.always', 'The folding controls are always visible.'),
                nls.localize('showFoldingControls.never', 'Never show the folding controls and reduce the gutter size.'),
                nls.localize('showFoldingControls.mouseover', 'The folding controls are visible only on mouseover.'),
            ],
            default: 'mouseover',
            tags: ['notebookLayout'],
        },
        [NotebookSetting.dragAndDropEnabled]: {
            description: nls.localize('notebook.dragAndDrop.description', 'Control whether the notebook editor should allow moving cells through drag and drop.'),
            type: 'boolean',
            default: true,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.consolidatedRunButton]: {
            description: nls.localize('notebook.consolidatedRunButton.description', 'Control whether extra actions are shown in a dropdown next to the run button.'),
            type: 'boolean',
            default: false,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.globalToolbarShowLabel]: {
            description: nls.localize('notebook.globalToolbarShowLabel', 'Control whether the actions on the notebook toolbar should render label or not.'),
            type: 'string',
            enum: ['always', 'never', 'dynamic'],
            default: 'always',
            tags: ['notebookLayout'],
        },
        [NotebookSetting.textOutputLineLimit]: {
            markdownDescription: nls.localize('notebook.textOutputLineLimit', 'Controls how many lines of text are displayed in a text output. If {0} is enabled, this setting is used to determine the scroll height of the output.', '`#notebook.output.scrolling#`'),
            type: 'number',
            default: 30,
            tags: ['notebookLayout', 'notebookOutputLayout'],
            minimum: 1,
        },
        [NotebookSetting.LinkifyOutputFilePaths]: {
            description: nls.localize('notebook.disableOutputFilePathLinks', 'Control whether to disable filepath links in the output of notebook cells.'),
            type: 'boolean',
            default: true,
            tags: ['notebookOutputLayout'],
        },
        [NotebookSetting.minimalErrorRendering]: {
            description: nls.localize('notebook.minimalErrorRendering', 'Control whether to render error output in a minimal style.'),
            type: 'boolean',
            default: false,
            tags: ['notebookOutputLayout'],
        },
        [NotebookSetting.markupFontSize]: {
            markdownDescription: nls.localize('notebook.markup.fontSize', 'Controls the font size in pixels of rendered markup in notebooks. When set to {0}, 120% of {1} is used.', '`0`', '`#editor.fontSize#`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.markdownLineHeight]: {
            markdownDescription: nls.localize('notebook.markdown.lineHeight', 'Controls the line height in pixels of markdown cells in notebooks. When set to {0}, {1} will be used', '`0`', '`normal`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout'],
        },
        [NotebookSetting.cellEditorOptionsCustomizations]: editorOptionsCustomizationSchema,
        [NotebookSetting.interactiveWindowCollapseCodeCells]: {
            markdownDescription: nls.localize('notebook.interactiveWindow.collapseCodeCells', 'Controls whether code cells in the interactive window are collapsed by default.'),
            type: 'string',
            enum: ['always', 'never', 'fromEditor'],
            default: 'fromEditor',
        },
        [NotebookSetting.outputLineHeight]: {
            markdownDescription: nls.localize('notebook.outputLineHeight', 'Line height of the output text within notebook cells.\n - When set to 0, editor line height is used.\n - Values between 0 and 8 will be used as a multiplier with the font size.\n - Values greater than or equal to 8 will be used as effective values.'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout', 'notebookOutputLayout'],
        },
        [NotebookSetting.outputFontSize]: {
            markdownDescription: nls.localize('notebook.outputFontSize', 'Font size for the output text within notebook cells. When set to 0, {0} is used.', '`#editor.fontSize#`'),
            type: 'number',
            default: 0,
            tags: ['notebookLayout', 'notebookOutputLayout'],
        },
        [NotebookSetting.outputFontFamily]: {
            markdownDescription: nls.localize('notebook.outputFontFamily', 'The font family of the output text within notebook cells. When set to empty, the {0} is used.', '`#editor.fontFamily#`'),
            type: 'string',
            tags: ['notebookLayout', 'notebookOutputLayout'],
        },
        [NotebookSetting.outputScrolling]: {
            markdownDescription: nls.localize('notebook.outputScrolling', 'Initially render notebook outputs in a scrollable region when longer than the limit.'),
            type: 'boolean',
            tags: ['notebookLayout', 'notebookOutputLayout'],
            default: typeof product.quality === 'string' && product.quality !== 'stable', // only enable as default in insiders
        },
        [NotebookSetting.outputWordWrap]: {
            markdownDescription: nls.localize('notebook.outputWordWrap', 'Controls whether the lines in output should wrap.'),
            type: 'boolean',
            tags: ['notebookLayout', 'notebookOutputLayout'],
            default: false,
        },
        [NotebookSetting.defaultFormatter]: {
            description: nls.localize('notebookFormatter.default', 'Defines a default notebook formatter which takes precedence over all other formatter settings. Must be the identifier of an extension contributing a formatter.'),
            type: ['string', 'null'],
            default: null,
            enum: DefaultFormatter.extensionIds,
            enumItemLabels: DefaultFormatter.extensionItemLabels,
            markdownEnumDescriptions: DefaultFormatter.extensionDescriptions,
        },
        [NotebookSetting.formatOnSave]: {
            markdownDescription: nls.localize('notebook.formatOnSave', 'Format a notebook on save. A formatter must be available and the editor must not be shutting down. When {0} is set to `afterDelay`, the file will only be formatted when saved explicitly.', '`#files.autoSave#`'),
            type: 'boolean',
            tags: ['notebookLayout'],
            default: false,
        },
        [NotebookSetting.insertFinalNewline]: {
            markdownDescription: nls.localize('notebook.insertFinalNewline', 'When enabled, insert a final new line into the end of code cells when saving a notebook.'),
            type: 'boolean',
            tags: ['notebookLayout'],
            default: false,
        },
        [NotebookSetting.formatOnCellExecution]: {
            markdownDescription: nls.localize('notebook.formatOnCellExecution', 'Format a notebook cell upon execution. A formatter must be available.'),
            type: 'boolean',
            default: false,
        },
        [NotebookSetting.confirmDeleteRunningCell]: {
            markdownDescription: nls.localize('notebook.confirmDeleteRunningCell', 'Control whether a confirmation prompt is required to delete a running cell.'),
            type: 'boolean',
            default: true,
        },
        [NotebookSetting.findFilters]: {
            markdownDescription: nls.localize('notebook.findFilters', 'Customize the Find Widget behavior for searching within notebook cells. When both markup source and markup preview are enabled, the Find Widget will search either the source code or preview based on the current state of the cell.'),
            type: 'object',
            properties: {
                markupSource: {
                    type: 'boolean',
                    default: true,
                },
                markupPreview: {
                    type: 'boolean',
                    default: true,
                },
                codeSource: {
                    type: 'boolean',
                    default: true,
                },
                codeOutput: {
                    type: 'boolean',
                    default: true,
                },
            },
            default: {
                markupSource: true,
                markupPreview: true,
                codeSource: true,
                codeOutput: true,
            },
            tags: ['notebookLayout'],
        },
        [NotebookSetting.remoteSaving]: {
            markdownDescription: nls.localize('notebook.remoteSaving', 'Enables the incremental saving of notebooks between processes and across Remote connections. When enabled, only the changes to the notebook are sent to the extension host, improving performance for large notebooks and slow network connections.'),
            type: 'boolean',
            default: typeof product.quality === 'string' && product.quality !== 'stable', // only enable as default in insiders
            tags: ['experimental'],
        },
        [NotebookSetting.scrollToRevealCell]: {
            markdownDescription: nls.localize('notebook.scrolling.revealNextCellOnExecute.description', 'How far to scroll when revealing the next cell upon running {0}.', 'notebook.cell.executeAndSelectBelow'),
            type: 'string',
            enum: ['fullCell', 'firstLine', 'none'],
            markdownEnumDescriptions: [
                nls.localize('notebook.scrolling.revealNextCellOnExecute.fullCell.description', 'Scroll to fully reveal the next cell.'),
                nls.localize('notebook.scrolling.revealNextCellOnExecute.firstLine.description', 'Scroll to reveal the first line of the next cell.'),
                nls.localize('notebook.scrolling.revealNextCellOnExecute.none.description', 'Do not scroll.'),
            ],
            default: 'fullCell',
        },
        [NotebookSetting.cellGenerate]: {
            markdownDescription: nls.localize('notebook.cellGenerate', 'Enable experimental generate action to create code cell with inline chat enabled.'),
            type: 'boolean',
            default: true,
        },
        [NotebookSetting.notebookVariablesView]: {
            markdownDescription: nls.localize('notebook.VariablesView.description', 'Enable the experimental notebook variables view within the debug panel.'),
            type: 'boolean',
            default: false,
        },
        [NotebookSetting.notebookInlineValues]: {
            markdownDescription: nls.localize('notebook.inlineValues.description', 'Control whether to show inline values within notebook code cells after cell execution. Values will remain until the cell is edited, re-executed, or explicitly cleared via the Clear All Outputs toolbar button or the `Notebook: Clear Inline Values` command.'),
            type: 'string',
            enum: ['on', 'auto', 'off'],
            enumDescriptions: [
                nls.localize('notebook.inlineValues.on', 'Always show inline values, with a regex fallback if no inline value provider is registered. Note: There may be a performance impact in larger cells if the fallback is used.'),
                nls.localize('notebook.inlineValues.auto', 'Show inline values only when an inline value provider is registered.'),
                nls.localize('notebook.inlineValues.off', 'Never show inline values.'),
            ],
            default: 'off',
        },
        [NotebookSetting.cellFailureDiagnostics]: {
            markdownDescription: nls.localize('notebook.cellFailureDiagnostics', 'Show available diagnostics for cell failures.'),
            type: 'boolean',
            default: true,
        },
        [NotebookSetting.outputBackupSizeLimit]: {
            markdownDescription: nls.localize('notebook.backup.sizeLimit', 'The limit of notebook output size in kilobytes (KB) where notebook files will no longer be backed up for hot reload. Use 0 for unlimited.'),
            type: 'number',
            default: 10000,
        },
        [NotebookSetting.multiCursor]: {
            markdownDescription: nls.localize('notebook.multiCursor.enabled', 'Experimental. Enables a limited set of multi cursor controls across multiple cells in the notebook editor. Currently supported are core editor actions (typing/cut/copy/paste/composition) and a limited subset of editor commands.'),
            type: 'boolean',
            default: false,
        },
        [NotebookSetting.markupFontFamily]: {
            markdownDescription: nls.localize('notebook.markup.fontFamily', 'Controls the font family of rendered markup in notebooks. When left blank, this will fall back to the default workbench font family.'),
            type: 'string',
            default: '',
            tags: ['notebookLayout'],
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2suY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9vay5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEdBQ1AsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBTzVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sZ0JBQWdCLEdBQ2hCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUNOLFVBQVUsR0FHVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RixPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixFQUlqQyw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBR04sZ0JBQWdCLEdBQ2hCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBOEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUNOLFFBQVEsRUFDUixPQUFPLEVBRVAsaUNBQWlDLEVBQ2pDLGVBQWUsRUFHZix1QkFBdUIsRUFDdkIsbUJBQW1CLEdBQ25CLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzFGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFFTixVQUFVLElBQUksY0FBYyxHQUM1QixNQUFNLHFFQUFxRSxDQUFBO0FBRTVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLHNCQUFzQixHQUN0QixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDN0YsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDakcsT0FBTyxFQUNOLHFDQUFxQyxFQUNyQyxvQ0FBb0MsR0FDcEMsTUFBTSxpREFBaUQsQ0FBQTtBQUV4RCxvQkFBb0I7QUFDcEIsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLGtDQUFrQyxDQUFBO0FBRXpDLHNCQUFzQjtBQUN0QixPQUFPLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sMENBQTBDLENBQUE7QUFDakQsT0FBTyxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sb0NBQW9DLENBQUE7QUFDM0MsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sc0NBQXNDLENBQUE7QUFDN0MsT0FBTywrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sNkRBQTZELENBQUE7QUFDcEUsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sOENBQThDLENBQUE7QUFDckQsT0FBTyxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sOENBQThDLENBQUE7QUFDckQsT0FBTyxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLHdEQUF3RCxDQUFBO0FBRS9ELDJCQUEyQjtBQUMzQixPQUFPLCtCQUErQixDQUFBO0FBRXRDLFdBQVc7QUFDWCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUVqRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRixPQUFPLE9BQU8sTUFBTSxnREFBZ0QsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDJCQUEyQixHQUMzQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRS9GLGtHQUFrRztBQUVsRyxRQUFRLENBQUMsRUFBRSxDQUFzQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsQ0FDL0Usb0JBQW9CLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLEVBQ2pGLENBQUMsSUFBSSxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUN6QyxDQUFBO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBc0IsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQy9FLG9CQUFvQixDQUFDLE1BQU0sQ0FDMUIsc0JBQXNCLEVBQ3RCLHNCQUFzQixDQUFDLEVBQUUsRUFDekIsc0JBQXNCLENBQ3RCLEVBQ0QsQ0FBQyxJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQzdDLENBQUE7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUFzQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsQ0FDL0Usb0JBQW9CLENBQUMsTUFBTSxDQUMxQiwyQkFBMkIsRUFDM0IsMkJBQTJCLENBQUMsRUFBRSxFQUM5QixzQkFBc0IsQ0FDdEIsRUFDRCxDQUFDLElBQUksY0FBYyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FDbEQsQ0FBQTtBQUVELElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTRCO0lBQ2pDLFlBQ3lDLHFCQUE0QztRQUE1QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO0lBQ2xGLENBQUM7SUFDSixZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsU0FBUyxDQUFDLEtBQWtCO1FBQzNCLFVBQVUsQ0FBQyxLQUFLLFlBQVksdUJBQXVCLENBQUMsQ0FBQTtRQUNwRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDckIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUTtZQUN6QyxJQUFJLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUNyQixZQUFZLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7WUFDdEMsWUFBWSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDN0IsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1NBQ3hCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxXQUFXLENBQUMsb0JBQTJDLEVBQUUsR0FBVztRQVVuRSxNQUFNLElBQUksR0FBUyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQTtRQUMzRCxJQUNDLENBQUMsSUFBSTtZQUNMLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7WUFDcEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDO1lBQzVCLE9BQU8sSUFBSSxLQUFLLFFBQVE7WUFDeEIsT0FBTyxRQUFRLEtBQUssUUFBUSxFQUMzQixDQUFDO1lBQ0YsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsQ0FBQyxFQUFFLENBQUM7WUFDdEYsT0FBTyw0QkFBNEIsQ0FBQyxNQUFNLENBQ3pDLG9CQUFvQixFQUNwQixRQUFRLEVBQ1IsSUFBSSxFQUNKLFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsUUFBUSxDQUNSLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sdUJBQXVCLENBQUMsTUFBTSxDQUNwQyxvQkFBb0IsRUFDcEIsUUFBUSxFQUNSLElBQUksRUFDSixTQUFTLEVBQ1QsZ0JBQWdCLEVBQ2hCLFFBQVEsQ0FDUixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBd0IsRUFBRSxjQUFtQjtRQUNwRSxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRCxDQUFBO0FBckVLLDRCQUE0QjtJQUUvQixXQUFBLHFCQUFxQixDQUFBO0dBRmxCLDRCQUE0QixDQXFFakM7QUFPRCxNQUFNLHdCQUF3QjtJQUM3QixZQUFZLENBQUMsS0FBa0I7UUFDOUIsT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLG1CQUFtQixDQUFDLEVBQUUsQ0FBQTtJQUMvQyxDQUFDO0lBQ0QsU0FBUyxDQUFDLEtBQWtCO1FBQzNCLFVBQVUsQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQTtRQUNoRCxNQUFNLElBQUksR0FBaUM7WUFDMUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxpQkFBaUI7WUFDMUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3hCLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztTQUN0QixDQUFBO1FBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFDRCxXQUFXLENBQUMsb0JBQTJDLEVBQUUsR0FBVztRQUNuRSxNQUFNLElBQUksR0FBaUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxNQUFNLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFDL0QsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbkUsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FDNUMsb0JBQW9CLEVBQ3BCLFFBQVEsRUFDUixpQkFBaUIsRUFDakIsUUFBUSxFQUNSLE9BQU8sQ0FDUCxDQUFBO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0NBQ0Q7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyx3QkFBd0IsQ0FDM0YsbUJBQW1CLENBQUMsRUFBRSxFQUN0Qix3QkFBd0IsQ0FDeEIsQ0FBQTtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQXlCLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDLHdCQUF3QixDQUMzRix1QkFBdUIsQ0FBQyxFQUFFLEVBQzFCLDRCQUE0QixDQUM1QixDQUFBO0FBRU0sSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVOzthQUNuQyxPQUFFLEdBQUcsNEJBQTRCLEFBQS9CLENBQStCO0lBSWpELFlBQ21CLGVBQWlDLEVBQzVCLG9CQUEyQyxFQUM3QixpQkFBcUM7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFGOEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUkxRSxJQUFJLENBQUMsK0JBQStCLENBQUMsb0JBQW9CLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFFM0UsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLCtCQUErQixDQUFDLG9CQUFvQixFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQzVFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FDNUMsb0JBQW9CLEVBQ3BCLDRCQUE0QixFQUM1QixFQUFFLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCw0RUFBNEU7SUFDcEUsK0JBQStCLENBQ3RDLG9CQUEyQyxFQUMzQyxlQUFpQztRQUVqQyxNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQVUsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRS9GLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixrREFBa0Q7WUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO2dCQUNyQyxJQUFJLENBQUMseUJBQXlCLEdBQUcsZUFBZSxDQUFDLGdDQUFnQyxDQUNoRixPQUFPLENBQUMsTUFBTSxFQUNkO29CQUNDLGdCQUFnQixFQUFFLENBQUMsR0FBUSxFQUFVLEVBQUU7d0JBQ3RDLElBQUksZUFBZSxFQUFFLENBQUM7NEJBQ3JCLE9BQU8sR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUN0QixDQUFDO3dCQUNELE9BQU8sc0JBQW9CLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQy9ELENBQUM7aUJBQ0QsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AseUJBQXlCO1lBQ3pCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUN6QyxJQUFJLENBQUMseUJBQXlCLEdBQUcsU0FBUyxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLDZCQUE2QixDQUFDLEdBQVE7UUFDcEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ2hDLENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsSUFBSSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQzFDLENBQUM7O0FBeEVXLG9CQUFvQjtJQU05QixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtHQVJSLG9CQUFvQixDQXlFaEM7O0FBRUQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7YUFDUixPQUFFLEdBQUcsdUNBQXVDLEFBQTFDLENBQTBDO0lBSTVELFlBQ29CLGdCQUFtQyxFQUN0QixhQUE0QixFQUN6QixnQkFBa0MsRUFFcEQsNkJBQWtFO1FBSG5ELGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFFcEQsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFxQztRQUVuRixJQUFJLENBQUMsYUFBYSxHQUFHLGdCQUFnQixDQUFDLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDN0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBYTtRQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDcEMsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0UsSUFBSSxNQUFNLEdBQXNCLElBQUksQ0FBQTtRQUVwQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLGFBQWEsR0FBdUI7b0JBQ3pDLE1BQU0sRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFO3dCQUN0QixNQUFNLE1BQU0sR0FBRyxVQUFVLGtDQUEwQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDbEU7d0JBQUMsSUFBSSxDQUFDLFVBQTBCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO3dCQUNoRCxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUF5QixFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQ25GLENBQUM7b0JBQ0QsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFhLEVBQUUsRUFBRTt3QkFDbkMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO29CQUM3RCxDQUFDO2lCQUNELENBQUE7Z0JBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDbkYsTUFBTSxpQkFBaUIsR0FBRyxVQUFVO29CQUNuQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7b0JBQzlDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNO3dCQUNsQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7d0JBQzlDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsMkJBQTJCLENBQ2pELFFBQVEsRUFDUixJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FDakMsQ0FBQTtnQkFDSixNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUNuRixNQUFLO1lBQ04sQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDYixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNyQixNQUFNLENBQUMsYUFBYSxFQUNwQixHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQ2pDLENBQUMsR0FBRyxFQUFFO1lBQ04sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2QsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7O0FBN0VJLG1CQUFtQjtJQU10QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLG1DQUFtQyxDQUFBO0dBVGhDLG1CQUFtQixDQThFeEI7QUFFRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjthQUNaLE9BQUUsR0FBRywyQ0FBMkMsQUFBOUMsQ0FBOEM7SUFJaEUsWUFDb0IsZ0JBQW1DLEVBQ3ZDLGFBQTZDLEVBQzFDLGdCQUFtRCxFQUN0RCxhQUE2QyxFQUU1RCw2QkFBbUY7UUFKbkQsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDekIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUNyQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUUzQyxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQXFDO1FBUm5FLGlCQUFZLEdBQWtCLEVBQUUsQ0FBQTtRQVVoRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FDckIsZ0JBQWdCLENBQUMsZ0NBQWdDLENBQUMsT0FBTyxDQUFDLDBCQUEwQixFQUFFO1lBQ3JGLGtCQUFrQixFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQzlELENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQ3JCLGdCQUFnQixDQUFDLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRTtZQUNuRixrQkFBa0IsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUM1RCxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1lBQ3BDLE1BQU0sRUFBRSxPQUFPLENBQUMsMEJBQTBCO1lBQzFDLFVBQVUsRUFBRTtnQkFDWCxLQUFLLEVBQUUsb0JBQW9CO2dCQUMzQixTQUFTLEVBQUUsR0FBRzthQUNkO1NBQ0QsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FDckIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztZQUNwQyxNQUFNLEVBQUUsT0FBTyxDQUFDLHdCQUF3QjtZQUN4QyxVQUFVLEVBQUU7Z0JBQ1gsS0FBSyxFQUFFLGtCQUFrQjtnQkFDekIsU0FBUyxFQUFFLEdBQUc7YUFDZDtTQUNELENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxLQUFLLENBQUMsMEJBQTBCLENBQUMsUUFBYTtRQUM3QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDdkYsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMzRSxJQUFJLE1BQU0sR0FBc0IsSUFBSSxDQUFBO1FBRXBDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzlDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3pELE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUM5QyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFDMUQsSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FDSixDQUFBO2dCQUNELE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUN2RSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FDckIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUM1QyxJQUNDLE1BQU07d0JBQ04sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ2YsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNULENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxrQkFBa0I7NEJBQ3pELEtBQUssQ0FBQyxJQUFJLEtBQUssdUJBQXVCLENBQUMsa0JBQWtCLENBQUM7NEJBQzNELEtBQUssQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUMxQixFQUNBLENBQUM7d0JBQ0YsTUFBTSxLQUFLLEdBQUcsd0JBQXdCLENBQ3JDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUMxRCxJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUNKLENBQUE7d0JBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssS0FBSyxFQUFFLENBQUM7NEJBQ2pDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQ3ZCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FDRixDQUNELENBQUE7Z0JBQ0QsTUFBSztZQUNOLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2IsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDdEMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3JCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNkLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8saUJBQWlCLENBQ3hCLEVBQWdCO1FBRWhCLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNULE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDeEQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE9BQU87Z0JBQ04sT0FBTyxFQUFFLGdCQUFnQjtnQkFDekIsSUFBSSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUM7YUFDN0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFNO0lBQ1AsQ0FBQztJQUVPLFVBQVUsQ0FDakIsSUFHQyxFQUNELElBQVc7UUFFWCxJQUFJLE1BQU0sR0FBOEQsU0FBUyxDQUFBO1FBRWpGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQzNCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLG1CQUFtQixLQUFLLElBQUksQ0FBQyxRQUFRLENBQ2pGLENBQUE7UUFDRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNuRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsTUFBTSxHQUFHLGdCQUFnQixDQUFBO1lBQ3pCLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtZQUN6QixXQUFXLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDbkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO2FBQzFCLENBQUMsQ0FBQztTQUNILENBQUMsQ0FBQyxDQUFBO1FBRUgsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sR0FBRztZQUNSLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLElBQUk7U0FDSixDQUFBO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsS0FBSyxDQUFDLHlCQUF5QixDQUFDLFFBQWE7UUFDNUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3JGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0UsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFbEYsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2IsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FDM0Msc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsRUFDMUMsSUFBSSxFQUNKLFFBQVEsRUFDUixJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDbEMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQ3JDLElBQUksQ0FBQyxzQkFBc0IsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUN6QyxDQUFDLEdBQUcsRUFBRTtZQUNOLEtBQUssQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNELENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDckMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2QsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDM0IsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMsd0JBQXdCLENBQUMsUUFBYTtRQUMzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNoRCxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMzRSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUMxQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQ1IsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUNsQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUNqRixDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDYixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUxQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDYixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDbkYsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNsQyxJQUFJLENBQUMsa0JBQWtCLElBQUksS0FBSyxDQUFDLElBQUksRUFDckMsSUFBSSxDQUFDLHNCQUFzQixJQUFJLEtBQUssQ0FBQyxJQUFJLENBQ3pDLENBQUMsR0FBRyxFQUFFO1lBQ04sTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFN0MsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixPQUFNO1lBQ1AsQ0FBQztZQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ2pDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM3QyxDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNkLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQzNCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDOztBQTVRSSx1QkFBdUI7SUFNMUIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLG1DQUFtQyxDQUFBO0dBVmhDLHVCQUF1QixDQTZRNUI7QUFFRCxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUErQjthQUNwQixPQUFFLEdBQUcsbURBQW1ELEFBQXRELENBQXNEO0lBSXhFLFlBQ29CLGdCQUFtQyxFQUN2QyxhQUE2QyxFQUMxQyxnQkFBbUQsRUFDdEQsYUFBNkMsRUFFNUQsNkJBQW1GO1FBSm5ELGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDckMsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFFM0Msa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFxQztRQVJuRSxpQkFBWSxHQUFrQixFQUFFLENBQUE7UUFVaEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQ3JCLGdCQUFnQixDQUFDLGdDQUFnQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRTtZQUNqRixrQkFBa0IsRUFBRSxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUM5RCxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1lBQ3BDLE1BQU0sRUFBRSxPQUFPLENBQUMsc0JBQXNCO1lBQ3RDLFVBQVUsRUFBRTtnQkFDWCxLQUFLLEVBQUUsb0JBQW9CO2dCQUMzQixTQUFTLEVBQUUsR0FBRzthQUNkO1NBQ0QsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxRQUFhO1FBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3RELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsRSxJQUFJLE1BQU0sR0FBc0IsSUFBSSxDQUFBO1FBRXBDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLGNBQWMsR0FBRyxnQ0FBZ0MsQ0FDdEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLEVBQzlELEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FDNUIsQ0FBQTtRQUNELE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXZFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNiLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUNyQixXQUFXLENBQUMsR0FBRyxDQUNkLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDNUMsSUFDQyxNQUFNO2dCQUNOLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUNmLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDVCxLQUFLLENBQUMsSUFBSSxLQUFLLHVCQUF1QixDQUFDLGlCQUFpQjtvQkFDeEQsS0FBSyxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxzQkFBc0I7b0JBQzdELEtBQUssQ0FBQyxJQUFJLEtBQUssdUJBQXVCLENBQUMsV0FBVyxDQUNuRCxFQUNBLENBQUM7Z0JBQ0YsTUFBTSxLQUFLLEdBQUcsZ0NBQWdDLENBQzdDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixFQUM5RCxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQzVCLENBQUE7Z0JBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQ2pDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FDRCxDQUFBO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDdEMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3JCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNkLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDOztBQTVGSSwrQkFBK0I7SUFNbEMsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLG1DQUFtQyxDQUFBO0dBVmhDLCtCQUErQixDQTZGcEM7QUFFRCxNQUFNLDJCQUE0QixTQUFRLFVBQVU7YUFDbkMsT0FBRSxHQUFHLHVDQUF1QyxDQUFBO0lBRTVEO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQTRCLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzVGLE1BQU0sY0FBYyxHQUFnQjtZQUNuQyxVQUFVLEVBQUU7Z0JBQ1gsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDYixJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsMkJBQTJCO2lCQUN4QzthQUNEO1lBQ0Qsb0RBQW9EO1lBQ3BELG9CQUFvQixFQUFFLElBQUk7WUFDMUIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixhQUFhLEVBQUUsSUFBSTtTQUNuQixDQUFBO1FBRUQsWUFBWSxDQUFDLGNBQWMsQ0FBQyx3Q0FBd0MsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUN0RixDQUFDOztBQUdGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO2FBQ1YsT0FBRSxHQUFHLHlDQUF5QyxBQUE1QyxDQUE0QztJQUk5RCxZQUNpQixjQUErQyxFQUUvRCwyQkFBaUYsRUFDM0QsWUFBa0M7UUFIdkIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBRTlDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBcUM7UUFMakUsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBVXBELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixLQUFLLENBQUMsUUFBUSxDQUNiLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxnQkFBZ0IsRUFDakQsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQzNELEdBQUcsQ0FDSCxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsQ0FDOUMsQ0FBQTtRQUVELGdFQUFnRTtRQUNoRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FDcEIsMkJBQTJCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN4RCxLQUFLLE1BQU0sS0FBSyxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQzFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDVCxLQUFLLFlBQVksbUJBQW1CO29CQUNwQyxLQUFLLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQyxRQUFRO29CQUM3QixPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQ3BDLENBQUE7Z0JBQ0QsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFTyxnQ0FBZ0MsQ0FBQyxNQUFzQztRQUM5RSxNQUFNLE1BQU0sR0FBMkIsRUFBRSxDQUFBO1FBQ3pDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7WUFDNUIsSUFDQyxLQUFLLENBQUMsT0FBTyxFQUFFO2dCQUNmLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7b0JBQzdCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtvQkFDeEIsTUFBTSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7b0JBQzlCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtpQkFDeEIsQ0FBQztnQkFDRixPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLGNBQWMsRUFDekMsQ0FBQztnQkFDRixNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtvQkFDeEIsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUU7aUJBQ3hGLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLENBQUM7SUFDRixDQUFDOztBQS9ESSxxQkFBcUI7SUFNeEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLG1DQUFtQyxDQUFBO0lBRW5DLFdBQUEsb0JBQW9CLENBQUE7R0FUakIscUJBQXFCLENBZ0UxQjtBQUVELElBQU0sc0NBQXNDLEdBQTVDLE1BQU0sc0NBQ0wsU0FBUSxVQUFVO2FBR0YsT0FBRSxHQUFHLDBEQUEwRCxBQUE3RCxDQUE2RDtJQUUvRSxZQUN5QyxxQkFBNEMsRUFFbkUseUJBQW9ELEVBQ2pDLGlCQUFvQyxFQUNyQyxnQkFBa0M7UUFFckUsS0FBSyxFQUFFLENBQUE7UUFOaUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUVuRSw4QkFBeUIsR0FBekIseUJBQXlCLENBQTJCO1FBQ2pDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDckMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUlyRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBbUM7UUFDaEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLFdBQVcsQ0FBQyxXQUFtQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxLQUFLLGFBQWEsRUFBRSxDQUFDO1lBQzdDLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQW1DLEVBQUUsTUFBbUI7UUFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLENBQ04sTUFBTSxZQUFZLG1CQUFtQjtZQUNyQyxNQUFNLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDO1lBQ2xELE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FDOUMsQ0FBQTtJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsV0FBbUM7UUFDL0MsT0FBTyxtQkFBbUIsQ0FBQyxXQUFXLENBQ3JDLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsV0FBVyxDQUFDLFFBQVEsRUFDcEIsU0FBUyxFQUNULElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFFLENBQy9CLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWU7UUFDNUIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsaUNBQWlDLEVBQUUsQ0FBQTtRQUVoRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRU8sWUFBWSxDQUFDLFdBQW1DO1FBQ3ZELE1BQU0sWUFBWSxHQUFHLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEYsSUFBSSxZQUFZLElBQUksWUFBWSxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDekUsT0FBTyxZQUFZLEVBQUUsUUFBUSxDQUFBO1FBQzlCLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDOztBQXJFSSxzQ0FBc0M7SUFPekMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHlCQUF5QixDQUFBO0lBRXpCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtHQVhiLHNDQUFzQyxDQXNFM0M7QUFFRCxJQUFNLG1DQUFtQyxHQUF6QyxNQUFNLG1DQUFtQzthQUN4QixPQUFFLEdBQUcsdURBQXVELEFBQTFELENBQTBEO0lBRTVFLFlBQ29DLGdCQUFrQyxFQUMzQyx1QkFBaUQ7UUFEeEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUdyRSx1QkFBdUIsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUVPLGdCQUFnQixDQUFDLEdBQVE7UUFDaEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM3RSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsT0FBTztZQUNOLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRztZQUNqQixJQUFJLEVBQUUsUUFBUSxDQUFDLFFBQVE7U0FDdkIsQ0FBQTtJQUNGLENBQUM7O0FBdkJJLG1DQUFtQztJQUl0QyxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsd0JBQXdCLENBQUE7R0FMckIsbUNBQW1DLENBd0J4QztBQUVELE1BQU0sOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDakQsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLG9CQUFvQixDQUFDLEVBQUUsRUFDdkIsb0JBQW9CLHNDQUVwQixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLG1CQUFtQixDQUFDLEVBQUUsRUFDdEIsbUJBQW1CLHNDQUVuQixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLHVCQUF1QixDQUFDLEVBQUUsRUFDMUIsdUJBQXVCLHNDQUV2QixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLCtCQUErQixDQUFDLEVBQUUsRUFDbEMsK0JBQStCLHNDQUUvQixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLDJCQUEyQixDQUFDLEVBQUUsRUFDOUIsMkJBQTJCLHNDQUUzQixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLHFCQUFxQixDQUFDLEVBQUUsRUFDeEIscUJBQXFCLHNDQUVyQixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLG1DQUFtQyxDQUFDLEVBQUUsRUFDdEMsbUNBQW1DLHNDQUVuQyxDQUFBO0FBQ0QsOEJBQThCLENBQzdCLHNDQUFzQyxDQUFDLEVBQUUsRUFDekMsc0NBQXNDLHNDQUV0QyxDQUFBO0FBQ0QsOEJBQThCLENBQUMsNkJBQTZCLENBQzNELGlCQUFpQixvQ0FFakIsQ0FBQTtBQUVELHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQTtBQUM3RCxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSx5QkFBeUIsRUFBRSxDQUFDLENBQUE7QUFFaEUsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxvQ0FBNEIsQ0FBQTtBQUMvRSxpQkFBaUIsQ0FDaEIsNEJBQTRCLEVBQzVCLCtCQUErQixvQ0FFL0IsQ0FBQTtBQUNELGlCQUFpQixDQUNoQixtQ0FBbUMsRUFDbkMsZ0NBQWdDLG9DQUVoQyxDQUFBO0FBQ0QsaUJBQWlCLENBQ2hCLDZCQUE2QixFQUM3Qiw0QkFBNEIsb0NBRTVCLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSwyQkFBMkIsb0NBQTRCLENBQUE7QUFDakcsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLG9DQUE0QixDQUFBO0FBQzNGLGlCQUFpQixDQUNoQiw2QkFBNkIsRUFDN0IsNEJBQTRCLG9DQUU1QixDQUFBO0FBQ0QsaUJBQWlCLENBQUMseUJBQXlCLEVBQUUsd0JBQXdCLG9DQUE0QixDQUFBO0FBQ2pHLGlCQUFpQixDQUNoQiw4QkFBOEIsRUFDOUIsNkJBQTZCLG9DQUU3QixDQUFBO0FBQ0QsaUJBQWlCLENBQ2hCLGlDQUFpQyxFQUNqQyxnQ0FBZ0Msb0NBRWhDLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsb0NBQTRCLENBQUE7QUFDM0YsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsc0JBQXNCLG9DQUE0QixDQUFBO0FBQzdGLGlCQUFpQixDQUNoQixxQ0FBcUMsRUFDckMsb0NBQW9DLG9DQUVwQyxDQUFBO0FBQ0QsaUJBQWlCLENBQ2hCLDRCQUE0QixFQUM1QiwyQkFBMkIsb0NBRTNCLENBQUE7QUFFRCxNQUFNLE9BQU8sR0FBbUIsRUFBRSxDQUFBO0FBQ2xDLFNBQVMsNkJBQTZCLENBQ3JDLENBQWtGO0lBRWxGLE9BQU8sT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxPQUFPLENBQUMsQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUFBO0FBQ3ZFLENBQUM7QUFDRCxLQUFLLE1BQU0sWUFBWSxJQUFJLHFCQUFxQixFQUFFLENBQUM7SUFDbEQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQTtJQUNsQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ1osSUFBSSw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxVQUFVLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQTtRQUNoRCxDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQzFCLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzdDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxnQ0FBZ0MsR0FBaUM7SUFDdEUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLGtEQUFrRCxFQUNsRCxvR0FBb0csQ0FDcEc7SUFDRCxPQUFPLEVBQUUsRUFBRTtJQUNYLEtBQUssRUFBRTtRQUNOO1lBQ0MsVUFBVSxFQUFFLE9BQU87U0FDbkI7UUFDRCxNQUFNO1FBQ04sd0JBQXdCO1FBQ3hCLG9CQUFvQjtRQUNwQixxQkFBcUI7UUFDckIsa0JBQWtCO1FBQ2xCLHlCQUF5QjtRQUN6QixNQUFNO1FBQ04sS0FBSztRQUNMLElBQUk7S0FDSjtJQUNELElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO0NBQ3hCLENBQUE7QUFFRCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUMzRixxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxFQUFFLEVBQUUsVUFBVTtJQUNkLEtBQUssRUFBRSxHQUFHO0lBQ1YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQzdELElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDL0IsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG1DQUFtQyxFQUNuQyxxQ0FBcUMsQ0FDckM7WUFDRCxJQUFJLEVBQUUsT0FBTztZQUNiLEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTthQUNkO1lBQ0QsT0FBTyxFQUFFLEVBQUU7U0FDWDtRQUNELENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7WUFDdEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDBDQUEwQyxFQUMxQyx5RUFBeUUsQ0FDekU7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLG9CQUFvQixFQUFFO2dCQUNyQixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyx1Q0FBdUMsRUFDdkMsaUVBQWlFLENBQ2pFO2dCQUNELElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDO2FBQ2pDO1lBQ0QsT0FBTyxFQUFFO2dCQUNSLE9BQU8sRUFBRSxPQUFPO2FBQ2hCO1lBQ0QsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO1lBQ3BDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix3Q0FBd0MsRUFDeEMsOENBQThDLENBQzlDO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixDQUFDO1lBQ2xELGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUNYLCtDQUErQyxFQUMvQyx1Q0FBdUMsQ0FDdkM7Z0JBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxnREFBZ0QsRUFDaEQsd0NBQXdDLENBQ3hDO2dCQUNELEdBQUcsQ0FBQyxRQUFRLENBQ1gsNERBQTRELEVBQzVELGtIQUFrSCxDQUNsSDthQUNEO1lBQ0QsT0FBTyxFQUFFLFNBQVM7WUFDbEIsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFO1lBQzdDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixpREFBaUQsRUFDakQsMkVBQTJFLENBQzNFO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO1lBQzVCLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUNYLHlEQUF5RCxFQUN6RCx5RkFBeUYsQ0FDekY7Z0JBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FDWCx5REFBeUQsRUFDekQsNkdBQTZHLENBQzdHO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsU0FBUztZQUNsQixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDeEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHlDQUF5QyxFQUN6Qyw0REFBNEQsQ0FDNUQ7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO1lBQ3BDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwrQ0FBK0MsRUFDL0MsdUVBQXVFLENBQ3ZFO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsRUFBRTtZQUN4QyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyw0Q0FBNEMsRUFDNUMsMkRBQTJELENBQzNEO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHNDQUFzQyxFQUN0Qyx3REFBd0QsQ0FDeEQ7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM5QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsa0NBQWtDLEVBQ2xDLGdKQUFnSixDQUNoSjtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ2pDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixxQ0FBcUMsRUFDckMsc0dBQXNHLENBQ3RHO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO1lBQzFCLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsRUFBRTtZQUN4QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsNENBQTRDLEVBQzVDLHNEQUFzRCxDQUN0RDtZQUNELElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUM7WUFDM0QsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsb0NBQW9DLEVBQ3BDLGdEQUFnRCxDQUNoRDtnQkFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLHVDQUF1QyxFQUN2QyxnREFBZ0QsQ0FDaEQ7Z0JBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxnQkFBZ0IsQ0FBQztnQkFDNUQsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSwyQ0FBMkMsQ0FBQzthQUN6RjtZQUNELE9BQU8sRUFBRSxNQUFNO1lBQ2YsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUNoQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsb0NBQW9DLEVBQ3BDLHdFQUF3RSxDQUN4RTtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7WUFDdEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDBDQUEwQyxFQUMxQyxnR0FBZ0csQ0FDaEc7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1lBQ2QsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ25DLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix1Q0FBdUMsRUFDdkMsdUVBQXVFLENBQ3ZFO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDO1lBQzFCLGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGtDQUFrQyxDQUFDO2dCQUNsRixHQUFHLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLHNDQUFzQyxDQUFDO2FBQzFGO1lBQ0QsT0FBTyxFQUFFLFVBQVU7WUFDbkIsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFO1lBQzNDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwrQ0FBK0MsRUFDL0MsMEVBQTBFLENBQzFFO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsRUFBRTtZQUN0QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsMENBQTBDLEVBQzFDLDJEQUEyRCxDQUMzRDtZQUNELElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUM7WUFDdEMsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsMENBQTBDLENBQUM7Z0JBQ3RGLEdBQUcsQ0FBQyxRQUFRLENBQ1gsMkJBQTJCLEVBQzNCLDZEQUE2RCxDQUM3RDtnQkFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLCtCQUErQixFQUMvQixxREFBcUQsQ0FDckQ7YUFDRDtZQUNELE9BQU8sRUFBRSxXQUFXO1lBQ3BCLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsRUFBRTtZQUNyQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsa0NBQWtDLEVBQ2xDLHNGQUFzRixDQUN0RjtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDeEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLDRDQUE0QyxFQUM1QywrRUFBK0UsQ0FDL0U7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1lBQ2QsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQ3pDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixpQ0FBaUMsRUFDakMsaUZBQWlGLENBQ2pGO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQztZQUNwQyxPQUFPLEVBQUUsUUFBUTtZQUNqQixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7WUFDdEMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsOEJBQThCLEVBQzlCLHVKQUF1SixFQUN2SiwrQkFBK0IsQ0FDL0I7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUM7WUFDaEQsT0FBTyxFQUFFLENBQUM7U0FDVjtRQUNELENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLEVBQUU7WUFDekMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHFDQUFxQyxFQUNyQyw0RUFBNEUsQ0FDNUU7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsSUFBSSxFQUFFLENBQUMsc0JBQXNCLENBQUM7U0FDOUI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixnQ0FBZ0MsRUFDaEMsNERBQTRELENBQzVEO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLElBQUksRUFBRSxDQUFDLHNCQUFzQixDQUFDO1NBQzlCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDakMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsMEJBQTBCLEVBQzFCLHlHQUF5RyxFQUN6RyxLQUFLLEVBQ0wscUJBQXFCLENBQ3JCO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQztZQUNWLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsRUFBRTtZQUNyQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyw4QkFBOEIsRUFDOUIsc0dBQXNHLEVBQ3RHLEtBQUssRUFDTCxVQUFVLENBQ1Y7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDO1lBQ1YsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7U0FDeEI7UUFDRCxDQUFDLGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLGdDQUFnQztRQUNuRixDQUFDLGVBQWUsQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFO1lBQ3JELG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLDhDQUE4QyxFQUM5QyxpRkFBaUYsQ0FDakY7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDO1lBQ3ZDLE9BQU8sRUFBRSxZQUFZO1NBQ3JCO1FBQ0QsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUNuQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQywyQkFBMkIsRUFDM0IsMFBBQTBQLENBQzFQO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQztZQUNWLElBQUksRUFBRSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDO1NBQ2hEO1FBQ0QsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDakMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMseUJBQXlCLEVBQ3pCLGtGQUFrRixFQUNsRixxQkFBcUIsQ0FDckI7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDO1lBQ1YsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUM7U0FDaEQ7UUFDRCxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ25DLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLDJCQUEyQixFQUMzQiwrRkFBK0YsRUFDL0YsdUJBQXVCLENBQ3ZCO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxzQkFBc0IsQ0FBQztTQUNoRDtRQUNELENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ2xDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLDBCQUEwQixFQUMxQixzRkFBc0YsQ0FDdEY7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLElBQUksRUFBRSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDO1lBQ2hELE9BQU8sRUFBRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLHFDQUFxQztTQUNuSDtRQUNELENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ2pDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLHlCQUF5QixFQUN6QixtREFBbUQsQ0FDbkQ7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLElBQUksRUFBRSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDO1lBQ2hELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ25DLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QiwyQkFBMkIsRUFDM0IsaUtBQWlLLENBQ2pLO1lBQ0QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztZQUN4QixPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZO1lBQ25DLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxtQkFBbUI7WUFDcEQsd0JBQXdCLEVBQUUsZ0JBQWdCLENBQUMscUJBQXFCO1NBQ2hFO1FBQ0QsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDL0IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsdUJBQXVCLEVBQ3ZCLDRMQUE0TCxFQUM1TCxvQkFBb0IsQ0FDcEI7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1lBQ3hCLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ3JDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLDZCQUE2QixFQUM3QiwwRkFBMEYsQ0FDMUY7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1lBQ3hCLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLGdDQUFnQyxFQUNoQyx1RUFBdUUsQ0FDdkU7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFO1lBQzNDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLG1DQUFtQyxFQUNuQyw2RUFBNkUsQ0FDN0U7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM5QixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyxzQkFBc0IsRUFDdEIsdU9BQXVPLENBQ3ZPO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsWUFBWSxFQUFFO29CQUNiLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxJQUFJO2lCQUNiO2dCQUNELGFBQWEsRUFBRTtvQkFDZCxJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsSUFBSTtpQkFDYjtnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLElBQUk7aUJBQ2I7Z0JBQ0QsVUFBVSxFQUFFO29CQUNYLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxJQUFJO2lCQUNiO2FBQ0Q7WUFDRCxPQUFPLEVBQUU7Z0JBQ1IsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsVUFBVSxFQUFFLElBQUk7YUFDaEI7WUFDRCxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN4QjtRQUNELENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQy9CLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLHVCQUF1QixFQUN2QixxUEFBcVAsQ0FDclA7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLHFDQUFxQztZQUNuSCxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUM7U0FDdEI7UUFDRCxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ3JDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLHdEQUF3RCxFQUN4RCxrRUFBa0UsRUFDbEUscUNBQXFDLENBQ3JDO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQztZQUN2Qyx3QkFBd0IsRUFBRTtnQkFDekIsR0FBRyxDQUFDLFFBQVEsQ0FDWCxpRUFBaUUsRUFDakUsdUNBQXVDLENBQ3ZDO2dCQUNELEdBQUcsQ0FBQyxRQUFRLENBQ1gsa0VBQWtFLEVBQ2xFLG1EQUFtRCxDQUNuRDtnQkFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLDZEQUE2RCxFQUM3RCxnQkFBZ0IsQ0FDaEI7YUFDRDtZQUNELE9BQU8sRUFBRSxVQUFVO1NBQ25CO1FBQ0QsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDL0IsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsdUJBQXVCLEVBQ3ZCLG1GQUFtRixDQUNuRjtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDeEMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsb0NBQW9DLEVBQ3BDLHlFQUF5RSxDQUN6RTtZQUNELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZDtRQUNELENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLEVBQUU7WUFDdkMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsbUNBQW1DLEVBQ25DLGlRQUFpUSxDQUNqUTtZQUNELElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUM7WUFDM0IsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsMEJBQTBCLEVBQzFCLDhLQUE4SyxDQUM5SztnQkFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLDRCQUE0QixFQUM1QixzRUFBc0UsQ0FDdEU7Z0JBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwyQkFBMkIsQ0FBQzthQUN0RTtZQUNELE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQ3pDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLGlDQUFpQyxFQUNqQywrQ0FBK0MsQ0FDL0M7WUFDRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLDJCQUEyQixFQUMzQiwySUFBMkksQ0FDM0k7WUFDRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM5QixtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyw4QkFBOEIsRUFDOUIscU9BQXFPLENBQ3JPO1lBQ0QsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUNuQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyw0QkFBNEIsRUFDNUIsc0lBQXNJLENBQ3RJO1lBQ0QsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsRUFBRTtZQUNYLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3hCO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==