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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2suY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFFTixVQUFVLEVBQ1YsZUFBZSxFQUNmLE9BQU8sR0FDUCxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFPNUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFFTixnQkFBZ0IsR0FDaEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sVUFBVSxHQUdWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxP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