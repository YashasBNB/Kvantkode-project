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
var NotebookProviderInfoStore_1, NotebookService_1;
import { localize } from '../../../../../nls.js';
import { toAction } from '../../../../../base/common/actions.js';
import { createErrorWithActions } from '../../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { isDefined } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { Memento } from '../../../../common/memento.js';
import { notebookPreloadExtensionPoint, notebookRendererExtensionPoint, notebooksExtensionPoint, } from '../notebookExtensionPoint.js';
import { NotebookDiffEditorInput } from '../../common/notebookDiffEditorInput.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER, CellUri, NotebookSetting, MimeTypeDisplayOrder, NotebookEditorPriority, NOTEBOOK_DISPLAY_ORDER, RENDERER_EQUIVALENT_EXTENSIONS, RENDERER_NOT_AVAILABLE, } from '../../common/notebookCommon.js';
import { NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { INotebookEditorModelResolverService } from '../../common/notebookEditorModelResolverService.js';
import { NotebookOutputRendererInfo, NotebookStaticPreloadInfo as NotebookStaticPreloadInfo, } from '../../common/notebookOutputRenderer.js';
import { NotebookProviderInfo } from '../../common/notebookProvider.js';
import { SimpleNotebookProviderInfo, } from '../../common/notebookService.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../../services/editor/common/editorResolverService.js';
import { IExtensionService, isProposedApiEnabled, } from '../../../../services/extensions/common/extensions.js';
import { InstallRecommendedExtensionAction } from '../../../extensions/browser/extensionsActions.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { INotebookDocumentService, } from '../../../../services/notebook/common/notebookDocumentService.js';
import { MergeEditorInput } from '../../../mergeEditor/browser/mergeEditorInput.js';
import { bufferToStream, streamToBuffer, VSBuffer, } from '../../../../../base/common/buffer.js';
import { NotebookMultiDiffEditorInput } from '../diff/notebookMultiDiffEditorInput.js';
import { CancellationError } from '../../../../../base/common/errors.js';
let NotebookProviderInfoStore = class NotebookProviderInfoStore extends Disposable {
    static { NotebookProviderInfoStore_1 = this; }
    static { this.CUSTOM_EDITORS_STORAGE_ID = 'notebookEditors'; }
    static { this.CUSTOM_EDITORS_ENTRY_ID = 'editors'; }
    constructor(storageService, extensionService, _editorResolverService, _configurationService, _accessibilityService, _instantiationService, _fileService, _notebookEditorModelResolverService, uriIdentService) {
        super();
        this._editorResolverService = _editorResolverService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._instantiationService = _instantiationService;
        this._fileService = _fileService;
        this._notebookEditorModelResolverService = _notebookEditorModelResolverService;
        this.uriIdentService = uriIdentService;
        this._handled = false;
        this._contributedEditors = new Map();
        this._contributedEditorDisposables = this._register(new DisposableStore());
        this._memento = new Memento(NotebookProviderInfoStore_1.CUSTOM_EDITORS_STORAGE_ID, storageService);
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        // Process the notebook contributions but buffer changes from the resolver
        this._editorResolverService.bufferChangeEvents(() => {
            for (const info of (mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] ||
                [])) {
                this.add(new NotebookProviderInfo(info), false);
            }
        });
        this._register(extensionService.onDidRegisterExtensions(() => {
            if (!this._handled) {
                // there is no extension point registered for notebook content provider
                // clear the memento and cache
                this._clear();
                mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = [];
                this._memento.saveMemento();
            }
        }));
        notebooksExtensionPoint.setHandler((extensions) => this._setupHandler(extensions));
    }
    dispose() {
        this._clear();
        super.dispose();
    }
    _setupHandler(extensions) {
        this._handled = true;
        const builtins = [...this._contributedEditors.values()].filter((info) => !info.extension);
        this._clear();
        const builtinProvidersFromCache = new Map();
        builtins.forEach((builtin) => {
            builtinProvidersFromCache.set(builtin.id, this.add(builtin));
        });
        for (const extension of extensions) {
            for (const notebookContribution of extension.value) {
                if (!notebookContribution.type) {
                    extension.collector.error(`Notebook does not specify type-property`);
                    continue;
                }
                const existing = this.get(notebookContribution.type);
                if (existing) {
                    if (!existing.extension &&
                        extension.description.isBuiltin &&
                        builtins.find((builtin) => builtin.id === notebookContribution.type)) {
                        // we are registering an extension which is using the same view type which is already cached
                        builtinProvidersFromCache.get(notebookContribution.type)?.dispose();
                    }
                    else {
                        extension.collector.error(`Notebook type '${notebookContribution.type}' already used`);
                        continue;
                    }
                }
                this.add(new NotebookProviderInfo({
                    extension: extension.description.identifier,
                    id: notebookContribution.type,
                    displayName: notebookContribution.displayName,
                    selectors: notebookContribution.selector || [],
                    priority: this._convertPriority(notebookContribution.priority),
                    providerDisplayName: extension.description.displayName ?? extension.description.identifier.value,
                }));
            }
        }
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._contributedEditors.values());
        this._memento.saveMemento();
    }
    clearEditorCache() {
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = [];
        this._memento.saveMemento();
    }
    _convertPriority(priority) {
        if (!priority) {
            return RegisteredEditorPriority.default;
        }
        if (priority === NotebookEditorPriority.default) {
            return RegisteredEditorPriority.default;
        }
        return RegisteredEditorPriority.option;
    }
    _registerContributionPoint(notebookProviderInfo) {
        const disposables = new DisposableStore();
        for (const selector of notebookProviderInfo.selectors) {
            const globPattern = selector.include ||
                selector;
            const notebookEditorInfo = {
                id: notebookProviderInfo.id,
                label: notebookProviderInfo.displayName,
                detail: notebookProviderInfo.providerDisplayName,
                priority: notebookProviderInfo.priority,
            };
            const notebookEditorOptions = {
                canHandleDiff: () => !!this._configurationService.getValue(NotebookSetting.textDiffEditorPreview) &&
                    !this._accessibilityService.isScreenReaderOptimized(),
                canSupportResource: (resource) => {
                    if (resource.scheme === Schemas.vscodeNotebookCellOutput) {
                        const params = new URLSearchParams(resource.query);
                        return params.get('openIn') === 'notebook';
                    }
                    return (resource.scheme === Schemas.untitled ||
                        resource.scheme === Schemas.vscodeNotebookCell ||
                        this._fileService.hasProvider(resource));
                },
            };
            const notebookEditorInputFactory = async ({ resource, options, }) => {
                let data;
                if (resource.scheme === Schemas.vscodeNotebookCellOutput) {
                    const outputUriData = CellUri.parseCellOutputUri(resource);
                    if (!outputUriData || !outputUriData.notebook || outputUriData.cellHandle === undefined) {
                        throw new Error('Invalid cell output uri');
                    }
                    data = {
                        notebook: outputUriData.notebook,
                        handle: outputUriData.cellHandle,
                    };
                }
                else {
                    data = CellUri.parse(resource);
                }
                let notebookUri;
                let cellOptions;
                if (data) {
                    // resource is a notebook cell
                    notebookUri = this.uriIdentService.asCanonicalUri(data.notebook);
                    cellOptions = { resource, options };
                }
                else {
                    notebookUri = this.uriIdentService.asCanonicalUri(resource);
                }
                if (!cellOptions) {
                    cellOptions = options?.cellOptions;
                }
                let notebookOptions;
                if (resource.scheme === Schemas.vscodeNotebookCellOutput) {
                    if (data?.handle === undefined || !data?.notebook) {
                        throw new Error('Invalid cell handle');
                    }
                    const cellUri = CellUri.generate(data.notebook, data.handle);
                    cellOptions = { resource: cellUri, options };
                    const cellIndex = await this._notebookEditorModelResolverService
                        .resolve(notebookUri)
                        .then((model) => model.object.notebook.cells.findIndex((cell) => cell.handle === data?.handle))
                        .then((index) => (index >= 0 ? index : 0));
                    const cellIndexesToRanges = [{ start: cellIndex, end: cellIndex + 1 }];
                    notebookOptions = {
                        ...options,
                        cellOptions,
                        viewState: undefined,
                        cellSelections: cellIndexesToRanges,
                    };
                }
                else {
                    notebookOptions = {
                        ...options,
                        cellOptions,
                        viewState: undefined,
                    };
                }
                const preferredResourceParam = cellOptions?.resource;
                const editor = NotebookEditorInput.getOrCreate(this._instantiationService, notebookUri, preferredResourceParam, notebookProviderInfo.id);
                return { editor, options: notebookOptions };
            };
            const notebookUntitledEditorFactory = async ({ resource, options, }) => {
                const ref = await this._notebookEditorModelResolverService.resolve({ untitledResource: resource }, notebookProviderInfo.id);
                // untitled notebooks are disposed when they get saved. we should not hold a reference
                // to such a disposed notebook and therefore dispose the reference as well
                Event.once(ref.object.notebook.onWillDispose)(() => {
                    ref.dispose();
                });
                return {
                    editor: NotebookEditorInput.getOrCreate(this._instantiationService, ref.object.resource, undefined, notebookProviderInfo.id),
                    options,
                };
            };
            const notebookDiffEditorInputFactory = (diffEditorInput, group) => {
                const { modified, original, label, description } = diffEditorInput;
                if (this._configurationService.getValue('notebook.experimental.enableNewDiffEditor')) {
                    return {
                        editor: NotebookMultiDiffEditorInput.create(this._instantiationService, modified.resource, label, description, original.resource, notebookProviderInfo.id),
                    };
                }
                return {
                    editor: NotebookDiffEditorInput.create(this._instantiationService, modified.resource, label, description, original.resource, notebookProviderInfo.id),
                };
            };
            const mergeEditorInputFactory = (mergeEditor) => {
                return {
                    editor: this._instantiationService.createInstance(MergeEditorInput, mergeEditor.base.resource, {
                        uri: mergeEditor.input1.resource,
                        title: mergeEditor.input1.label ?? basename(mergeEditor.input1.resource),
                        description: mergeEditor.input1.description ?? '',
                        detail: mergeEditor.input1.detail,
                    }, {
                        uri: mergeEditor.input2.resource,
                        title: mergeEditor.input2.label ?? basename(mergeEditor.input2.resource),
                        description: mergeEditor.input2.description ?? '',
                        detail: mergeEditor.input2.detail,
                    }, mergeEditor.result.resource),
                };
            };
            const notebookFactoryObject = {
                createEditorInput: notebookEditorInputFactory,
                createDiffEditorInput: notebookDiffEditorInputFactory,
                createUntitledEditorInput: notebookUntitledEditorFactory,
                createMergeEditorInput: mergeEditorInputFactory,
            };
            const notebookCellFactoryObject = {
                createEditorInput: notebookEditorInputFactory,
                createDiffEditorInput: notebookDiffEditorInputFactory,
            };
            // TODO @lramos15 find a better way to toggle handling diff editors than needing these listeners for every registration
            // This is a lot of event listeners especially if there are many notebooks
            disposables.add(this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(NotebookSetting.textDiffEditorPreview)) {
                    const canHandleDiff = !!this._configurationService.getValue(NotebookSetting.textDiffEditorPreview) &&
                        !this._accessibilityService.isScreenReaderOptimized();
                    if (canHandleDiff) {
                        notebookFactoryObject.createDiffEditorInput = notebookDiffEditorInputFactory;
                        notebookCellFactoryObject.createDiffEditorInput = notebookDiffEditorInputFactory;
                    }
                    else {
                        notebookFactoryObject.createDiffEditorInput = undefined;
                        notebookCellFactoryObject.createDiffEditorInput = undefined;
                    }
                }
            }));
            disposables.add(this._accessibilityService.onDidChangeScreenReaderOptimized(() => {
                const canHandleDiff = !!this._configurationService.getValue(NotebookSetting.textDiffEditorPreview) &&
                    !this._accessibilityService.isScreenReaderOptimized();
                if (canHandleDiff) {
                    notebookFactoryObject.createDiffEditorInput = notebookDiffEditorInputFactory;
                    notebookCellFactoryObject.createDiffEditorInput = notebookDiffEditorInputFactory;
                }
                else {
                    notebookFactoryObject.createDiffEditorInput = undefined;
                    notebookCellFactoryObject.createDiffEditorInput = undefined;
                }
            }));
            // Register the notebook editor
            disposables.add(this._editorResolverService.registerEditor(globPattern, notebookEditorInfo, notebookEditorOptions, notebookFactoryObject));
            // Then register the schema handler as exclusive for that notebook
            disposables.add(this._editorResolverService.registerEditor(`${Schemas.vscodeNotebookCell}:/**/${globPattern}`, { ...notebookEditorInfo, priority: RegisteredEditorPriority.exclusive }, notebookEditorOptions, notebookCellFactoryObject));
        }
        return disposables;
    }
    _clear() {
        this._contributedEditors.clear();
        this._contributedEditorDisposables.clear();
    }
    get(viewType) {
        return this._contributedEditors.get(viewType);
    }
    add(info, saveMemento = true) {
        if (this._contributedEditors.has(info.id)) {
            throw new Error(`notebook type '${info.id}' ALREADY EXISTS`);
        }
        this._contributedEditors.set(info.id, info);
        let editorRegistration;
        // built-in notebook providers contribute their own editors
        if (info.extension) {
            editorRegistration = this._registerContributionPoint(info);
            this._contributedEditorDisposables.add(editorRegistration);
        }
        if (saveMemento) {
            const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._contributedEditors.values());
            this._memento.saveMemento();
        }
        return this._register(toDisposable(() => {
            const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._contributedEditors.values());
            this._memento.saveMemento();
            editorRegistration?.dispose();
            this._contributedEditors.delete(info.id);
        }));
    }
    getContributedNotebook(resource) {
        const result = [];
        for (const info of this._contributedEditors.values()) {
            if (info.matches(resource)) {
                result.push(info);
            }
        }
        if (result.length === 0 && resource.scheme === Schemas.untitled) {
            // untitled resource and no path-specific match => all providers apply
            return Array.from(this._contributedEditors.values());
        }
        return result;
    }
    [Symbol.iterator]() {
        return this._contributedEditors.values();
    }
};
NotebookProviderInfoStore = NotebookProviderInfoStore_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IExtensionService),
    __param(2, IEditorResolverService),
    __param(3, IConfigurationService),
    __param(4, IAccessibilityService),
    __param(5, IInstantiationService),
    __param(6, IFileService),
    __param(7, INotebookEditorModelResolverService),
    __param(8, IUriIdentityService)
], NotebookProviderInfoStore);
export { NotebookProviderInfoStore };
let NotebookOutputRendererInfoStore = class NotebookOutputRendererInfoStore {
    constructor(storageService) {
        this.contributedRenderers = new Map();
        this.preferredMimetype = new Lazy(() => this.preferredMimetypeMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */));
        this.preferredMimetypeMemento = new Memento('workbench.editor.notebook.preferredRenderer2', storageService);
    }
    clear() {
        this.contributedRenderers.clear();
    }
    get(rendererId) {
        return this.contributedRenderers.get(rendererId);
    }
    getAll() {
        return Array.from(this.contributedRenderers.values());
    }
    add(info) {
        if (this.contributedRenderers.has(info.id)) {
            return;
        }
        this.contributedRenderers.set(info.id, info);
    }
    /** Update and remember the preferred renderer for the given mimetype in this workspace */
    setPreferred(notebookProviderInfo, mimeType, rendererId) {
        const mementoObj = this.preferredMimetype.value;
        const forNotebook = mementoObj[notebookProviderInfo.id];
        if (forNotebook) {
            forNotebook[mimeType] = rendererId;
        }
        else {
            mementoObj[notebookProviderInfo.id] = { [mimeType]: rendererId };
        }
        this.preferredMimetypeMemento.saveMemento();
    }
    findBestRenderers(notebookProviderInfo, mimeType, kernelProvides) {
        let ReuseOrder;
        (function (ReuseOrder) {
            ReuseOrder[ReuseOrder["PreviouslySelected"] = 256] = "PreviouslySelected";
            ReuseOrder[ReuseOrder["SameExtensionAsNotebook"] = 512] = "SameExtensionAsNotebook";
            ReuseOrder[ReuseOrder["OtherRenderer"] = 768] = "OtherRenderer";
            ReuseOrder[ReuseOrder["BuiltIn"] = 1024] = "BuiltIn";
        })(ReuseOrder || (ReuseOrder = {}));
        const preferred = notebookProviderInfo && this.preferredMimetype.value[notebookProviderInfo.id]?.[mimeType];
        const notebookExtId = notebookProviderInfo?.extension?.value;
        const notebookId = notebookProviderInfo?.id;
        const renderers = Array.from(this.contributedRenderers.values())
            .map((renderer) => {
            const ownScore = kernelProvides === undefined
                ? renderer.matchesWithoutKernel(mimeType)
                : renderer.matches(mimeType, kernelProvides);
            if (ownScore === 3 /* NotebookRendererMatch.Never */) {
                return undefined;
            }
            const rendererExtId = renderer.extensionId.value;
            const reuseScore = preferred === renderer.id
                ? 256 /* ReuseOrder.PreviouslySelected */
                : rendererExtId === notebookExtId ||
                    RENDERER_EQUIVALENT_EXTENSIONS.get(rendererExtId)?.has(notebookId)
                    ? 512 /* ReuseOrder.SameExtensionAsNotebook */
                    : renderer.isBuiltin
                        ? 1024 /* ReuseOrder.BuiltIn */
                        : 768 /* ReuseOrder.OtherRenderer */;
            return {
                ordered: { mimeType, rendererId: renderer.id, isTrusted: true },
                score: reuseScore | ownScore,
            };
        })
            .filter(isDefined);
        if (renderers.length === 0) {
            return [{ mimeType, rendererId: RENDERER_NOT_AVAILABLE, isTrusted: true }];
        }
        return renderers.sort((a, b) => a.score - b.score).map((r) => r.ordered);
    }
};
NotebookOutputRendererInfoStore = __decorate([
    __param(0, IStorageService)
], NotebookOutputRendererInfoStore);
export { NotebookOutputRendererInfoStore };
class ModelData {
    get uri() {
        return this.model.uri;
    }
    constructor(model, onWillDispose) {
        this.model = model;
        this._modelEventListeners = new DisposableStore();
        this._modelEventListeners.add(model.onWillDispose(() => onWillDispose(model)));
    }
    getCellIndex(cellUri) {
        return this.model.cells.findIndex((cell) => isEqual(cell.uri, cellUri));
    }
    dispose() {
        this._modelEventListeners.dispose();
    }
}
let NotebookService = class NotebookService extends Disposable {
    static { NotebookService_1 = this; }
    static { this._storageNotebookViewTypeProvider = 'notebook.viewTypeProvider'; }
    get notebookProviderInfoStore() {
        if (!this._notebookProviderInfoStore) {
            this._notebookProviderInfoStore = this._register(this._instantiationService.createInstance(NotebookProviderInfoStore));
        }
        return this._notebookProviderInfoStore;
    }
    constructor(_extensionService, _configurationService, _accessibilityService, _instantiationService, _storageService, _notebookDocumentService) {
        super();
        this._extensionService = _extensionService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._notebookDocumentService = _notebookDocumentService;
        this._notebookProviders = new Map();
        this._notebookProviderInfoStore = undefined;
        this._notebookRenderersInfoStore = this._instantiationService.createInstance(NotebookOutputRendererInfoStore);
        this._onDidChangeOutputRenderers = this._register(new Emitter());
        this.onDidChangeOutputRenderers = this._onDidChangeOutputRenderers.event;
        this._notebookStaticPreloadInfoStore = new Set();
        this._models = new ResourceMap();
        this._onWillAddNotebookDocument = this._register(new Emitter());
        this._onDidAddNotebookDocument = this._register(new Emitter());
        this._onWillRemoveNotebookDocument = this._register(new Emitter());
        this._onDidRemoveNotebookDocument = this._register(new Emitter());
        this.onWillAddNotebookDocument = this._onWillAddNotebookDocument.event;
        this.onDidAddNotebookDocument = this._onDidAddNotebookDocument.event;
        this.onDidRemoveNotebookDocument = this._onDidRemoveNotebookDocument.event;
        this.onWillRemoveNotebookDocument = this._onWillRemoveNotebookDocument.event;
        this._onAddViewType = this._register(new Emitter());
        this.onAddViewType = this._onAddViewType.event;
        this._onWillRemoveViewType = this._register(new Emitter());
        this.onWillRemoveViewType = this._onWillRemoveViewType.event;
        this._onDidChangeEditorTypes = this._register(new Emitter());
        this.onDidChangeEditorTypes = this._onDidChangeEditorTypes.event;
        this._lastClipboardIsCopy = true;
        notebookRendererExtensionPoint.setHandler((renderers) => {
            this._notebookRenderersInfoStore.clear();
            for (const extension of renderers) {
                for (const notebookContribution of extension.value) {
                    if (!notebookContribution.entrypoint) {
                        // avoid crashing
                        extension.collector.error(`Notebook renderer does not specify entry point`);
                        continue;
                    }
                    const id = notebookContribution.id;
                    if (!id) {
                        extension.collector.error(`Notebook renderer does not specify id-property`);
                        continue;
                    }
                    this._notebookRenderersInfoStore.add(new NotebookOutputRendererInfo({
                        id,
                        extension: extension.description,
                        entrypoint: notebookContribution.entrypoint,
                        displayName: notebookContribution.displayName,
                        mimeTypes: notebookContribution.mimeTypes || [],
                        dependencies: notebookContribution.dependencies,
                        optionalDependencies: notebookContribution.optionalDependencies,
                        requiresMessaging: notebookContribution.requiresMessaging,
                    }));
                }
            }
            this._onDidChangeOutputRenderers.fire();
        });
        notebookPreloadExtensionPoint.setHandler((extensions) => {
            this._notebookStaticPreloadInfoStore.clear();
            for (const extension of extensions) {
                if (!isProposedApiEnabled(extension.description, 'contribNotebookStaticPreloads')) {
                    continue;
                }
                for (const notebookContribution of extension.value) {
                    if (!notebookContribution.entrypoint) {
                        // avoid crashing
                        extension.collector.error(`Notebook preload does not specify entry point`);
                        continue;
                    }
                    const type = notebookContribution.type;
                    if (!type) {
                        extension.collector.error(`Notebook preload does not specify type-property`);
                        continue;
                    }
                    this._notebookStaticPreloadInfoStore.add(new NotebookStaticPreloadInfo({
                        type,
                        extension: extension.description,
                        entrypoint: notebookContribution.entrypoint,
                        localResourceRoots: notebookContribution.localResourceRoots ?? [],
                    }));
                }
            }
        });
        const updateOrder = () => {
            this._displayOrder = new MimeTypeDisplayOrder(this._configurationService.getValue(NotebookSetting.displayOrder) || [], this._accessibilityService.isScreenReaderOptimized()
                ? ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER
                : NOTEBOOK_DISPLAY_ORDER);
        };
        updateOrder();
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.displayOrder)) {
                updateOrder();
            }
        }));
        this._register(this._accessibilityService.onDidChangeScreenReaderOptimized(() => {
            updateOrder();
        }));
        this._memento = new Memento(NotebookService_1._storageNotebookViewTypeProvider, this._storageService);
        this._viewTypeCache = this._memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    getEditorTypes() {
        return [...this.notebookProviderInfoStore].map((info) => ({
            id: info.id,
            displayName: info.displayName,
            providerDisplayName: info.providerDisplayName,
        }));
    }
    clearEditorCache() {
        this.notebookProviderInfoStore.clearEditorCache();
    }
    _postDocumentOpenActivation(viewType) {
        // send out activations on notebook text model creation
        this._extensionService.activateByEvent(`onNotebook:${viewType}`);
        this._extensionService.activateByEvent(`onNotebook:*`);
    }
    async canResolve(viewType) {
        if (this._notebookProviders.has(viewType)) {
            return true;
        }
        await this._extensionService.whenInstalledExtensionsRegistered();
        await this._extensionService.activateByEvent(`onNotebookSerializer:${viewType}`);
        return this._notebookProviders.has(viewType);
    }
    registerContributedNotebookType(viewType, data) {
        const info = new NotebookProviderInfo({
            extension: data.extension,
            id: viewType,
            displayName: data.displayName,
            providerDisplayName: data.providerDisplayName,
            priority: data.priority || RegisteredEditorPriority.default,
            selectors: [],
        });
        info.update({ selectors: data.filenamePattern });
        const reg = this.notebookProviderInfoStore.add(info);
        this._onDidChangeEditorTypes.fire();
        return toDisposable(() => {
            reg.dispose();
            this._onDidChangeEditorTypes.fire();
        });
    }
    _registerProviderData(viewType, data) {
        if (this._notebookProviders.has(viewType)) {
            throw new Error(`notebook provider for viewtype '${viewType}' already exists`);
        }
        this._notebookProviders.set(viewType, data);
        this._onAddViewType.fire(viewType);
        return toDisposable(() => {
            this._onWillRemoveViewType.fire(viewType);
            this._notebookProviders.delete(viewType);
        });
    }
    registerNotebookSerializer(viewType, extensionData, serializer) {
        this.notebookProviderInfoStore.get(viewType)?.update({ options: serializer.options });
        this._viewTypeCache[viewType] = extensionData.id.value;
        this._persistMementos();
        return this._registerProviderData(viewType, new SimpleNotebookProviderInfo(viewType, serializer, extensionData));
    }
    async withNotebookDataProvider(viewType) {
        const selected = this.notebookProviderInfoStore.get(viewType);
        if (!selected) {
            const knownProvider = this.getViewTypeProvider(viewType);
            const actions = knownProvider
                ? [
                    toAction({
                        id: 'workbench.notebook.action.installMissingViewType',
                        label: localize('notebookOpenInstallMissingViewType', "Install extension for '{0}'", viewType),
                        run: async () => {
                            await this._instantiationService
                                .createInstance(InstallRecommendedExtensionAction, knownProvider)
                                .run();
                        },
                    }),
                ]
                : [];
            throw createErrorWithActions(`UNKNOWN notebook type '${viewType}'`, actions);
        }
        await this.canResolve(selected.id);
        const result = this._notebookProviders.get(selected.id);
        if (!result) {
            throw new Error(`NO provider registered for view type: '${selected.id}'`);
        }
        return result;
    }
    tryGetDataProviderSync(viewType) {
        const selected = this.notebookProviderInfoStore.get(viewType);
        if (!selected) {
            return undefined;
        }
        return this._notebookProviders.get(selected.id);
    }
    _persistMementos() {
        this._memento.saveMemento();
    }
    getViewTypeProvider(viewType) {
        return this._viewTypeCache[viewType];
    }
    getRendererInfo(rendererId) {
        return this._notebookRenderersInfoStore.get(rendererId);
    }
    updateMimePreferredRenderer(viewType, mimeType, rendererId, otherMimetypes) {
        const info = this.notebookProviderInfoStore.get(viewType);
        if (info) {
            this._notebookRenderersInfoStore.setPreferred(info, mimeType, rendererId);
        }
        this._displayOrder.prioritize(mimeType, otherMimetypes);
    }
    saveMimeDisplayOrder(target) {
        this._configurationService.updateValue(NotebookSetting.displayOrder, this._displayOrder.toArray(), target);
    }
    getRenderers() {
        return this._notebookRenderersInfoStore.getAll();
    }
    *getStaticPreloads(viewType) {
        for (const preload of this._notebookStaticPreloadInfoStore) {
            if (preload.type === viewType) {
                yield preload;
            }
        }
    }
    // --- notebook documents: create, destory, retrieve, enumerate
    async createNotebookTextModel(viewType, uri, stream) {
        if (this._models.has(uri)) {
            throw new Error(`notebook for ${uri} already exists`);
        }
        const info = await this.withNotebookDataProvider(viewType);
        if (!(info instanceof SimpleNotebookProviderInfo)) {
            throw new Error('CANNOT open file notebook with this provider');
        }
        const bytes = stream ? await streamToBuffer(stream) : VSBuffer.fromByteArray([]);
        const data = await info.serializer.dataToNotebook(bytes);
        const notebookModel = this._instantiationService.createInstance(NotebookTextModel, info.viewType, uri, data.cells, data.metadata, info.serializer.options);
        const modelData = new ModelData(notebookModel, this._onWillDisposeDocument.bind(this));
        this._models.set(uri, modelData);
        this._notebookDocumentService.addNotebookDocument(modelData);
        this._onWillAddNotebookDocument.fire(notebookModel);
        this._onDidAddNotebookDocument.fire(notebookModel);
        this._postDocumentOpenActivation(info.viewType);
        return notebookModel;
    }
    async createNotebookTextDocumentSnapshot(uri, context, token) {
        const model = this.getNotebookTextModel(uri);
        if (!model) {
            throw new Error(`notebook for ${uri} doesn't exist`);
        }
        const info = await this.withNotebookDataProvider(model.viewType);
        if (!(info instanceof SimpleNotebookProviderInfo)) {
            throw new Error('CANNOT open file notebook with this provider');
        }
        const serializer = info.serializer;
        const outputSizeLimit = this._configurationService.getValue(NotebookSetting.outputBackupSizeLimit) * 1024;
        const data = model.createSnapshot({
            context: context,
            outputSizeLimit: outputSizeLimit,
            transientOptions: serializer.options,
        });
        const indentAmount = model.metadata.indentAmount;
        if (typeof indentAmount === 'string' && indentAmount) {
            // This is required for ipynb serializer to preserve the whitespace in the notebook.
            data.metadata.indentAmount = indentAmount;
        }
        const bytes = await serializer.notebookToData(data);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        return bufferToStream(bytes);
    }
    async restoreNotebookTextModelFromSnapshot(uri, viewType, snapshot) {
        const model = this.getNotebookTextModel(uri);
        if (!model) {
            throw new Error(`notebook for ${uri} doesn't exist`);
        }
        const info = await this.withNotebookDataProvider(model.viewType);
        if (!(info instanceof SimpleNotebookProviderInfo)) {
            throw new Error('CANNOT open file notebook with this provider');
        }
        const serializer = info.serializer;
        const bytes = await streamToBuffer(snapshot);
        const data = await info.serializer.dataToNotebook(bytes);
        model.restoreSnapshot(data, serializer.options);
        return model;
    }
    getNotebookTextModel(uri) {
        return this._models.get(uri)?.model;
    }
    getNotebookTextModels() {
        return Iterable.map(this._models.values(), (data) => data.model);
    }
    listNotebookDocuments() {
        return [...this._models].map((e) => e[1].model);
    }
    _onWillDisposeDocument(model) {
        const modelData = this._models.get(model.uri);
        if (modelData) {
            this._onWillRemoveNotebookDocument.fire(modelData.model);
            this._models.delete(model.uri);
            this._notebookDocumentService.removeNotebookDocument(modelData);
            modelData.dispose();
            this._onDidRemoveNotebookDocument.fire(modelData.model);
        }
    }
    getOutputMimeTypeInfo(textModel, kernelProvides, output) {
        const sorted = this._displayOrder.sort(new Set(output.outputs.map((op) => op.mime)));
        const notebookProviderInfo = this.notebookProviderInfoStore.get(textModel.viewType);
        return sorted
            .flatMap((mimeType) => this._notebookRenderersInfoStore.findBestRenderers(notebookProviderInfo, mimeType, kernelProvides))
            .sort((a, b) => (a.rendererId === RENDERER_NOT_AVAILABLE ? 1 : 0) -
            (b.rendererId === RENDERER_NOT_AVAILABLE ? 1 : 0));
    }
    getContributedNotebookTypes(resource) {
        if (resource) {
            return this.notebookProviderInfoStore.getContributedNotebook(resource);
        }
        return [...this.notebookProviderInfoStore];
    }
    hasSupportedNotebooks(resource) {
        if (this._models.has(resource)) {
            // it might be untitled
            return true;
        }
        const contribution = this.notebookProviderInfoStore.getContributedNotebook(resource);
        if (!contribution.length) {
            return false;
        }
        return contribution.some((info) => info.matches(resource) &&
            (info.priority === RegisteredEditorPriority.default ||
                info.priority === RegisteredEditorPriority.exclusive));
    }
    getContributedNotebookType(viewType) {
        return this.notebookProviderInfoStore.get(viewType);
    }
    getNotebookProviderResourceRoots() {
        const ret = [];
        this._notebookProviders.forEach((val) => {
            if (val.extensionData.location) {
                ret.push(URI.revive(val.extensionData.location));
            }
        });
        return ret;
    }
    // --- copy & paste
    setToCopy(items, isCopy) {
        this._cutItems = items;
        this._lastClipboardIsCopy = isCopy;
    }
    getToCopy() {
        if (this._cutItems) {
            return { items: this._cutItems, isCopy: this._lastClipboardIsCopy };
        }
        return undefined;
    }
};
NotebookService = NotebookService_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IConfigurationService),
    __param(2, IAccessibilityService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, INotebookDocumentService)
], NotebookService);
export { NotebookService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLCtEQUErRCxDQUFBO0FBRXRFLE9BQU8sRUFB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