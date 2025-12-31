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
var SearchEditorInput_1;
import './media/searchEditor.css';
import { Emitter } from '../../../../base/common/event.js';
import { basename } from '../../../../base/common/path.js';
import { extname, isEqual, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { EditorResourceAccessor, } from '../../../common/editor.js';
import { Memento } from '../../../common/memento.js';
import { SearchEditorFindMatchClass, SearchEditorInputTypeId, SearchEditorScheme, SearchEditorWorkingCopyTypeId, } from './constants.js';
import { SearchEditorModel, searchEditorModelFactory, } from './searchEditorModel.js';
import { defaultSearchConfig, parseSavedSearchEditor, serializeSearchConfiguration, } from './searchEditorSerialization.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { bufferToReadable, VSBuffer } from '../../../../base/common/buffer.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const SEARCH_EDITOR_EXT = '.code-search';
const SearchEditorIcon = registerIcon('search-editor-label-icon', Codicon.search, localize('searchEditorLabelIcon', 'Icon of the search editor label.'));
let SearchEditorInput = class SearchEditorInput extends EditorInput {
    static { SearchEditorInput_1 = this; }
    static { this.ID = SearchEditorInputTypeId; }
    get typeId() {
        return SearchEditorInput_1.ID;
    }
    get editorId() {
        return this.typeId;
    }
    getIcon() {
        return SearchEditorIcon;
    }
    get capabilities() {
        let capabilities = 8 /* EditorInputCapabilities.Singleton */;
        if (!this.backingUri) {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        return capabilities;
    }
    get resource() {
        return this.backingUri || this.modelUri;
    }
    constructor(modelUri, backingUri, modelService, textFileService, fileDialogService, instantiationService, workingCopyService, telemetryService, pathService, storageService) {
        super();
        this.modelUri = modelUri;
        this.backingUri = backingUri;
        this.modelService = modelService;
        this.textFileService = textFileService;
        this.fileDialogService = fileDialogService;
        this.instantiationService = instantiationService;
        this.workingCopyService = workingCopyService;
        this.telemetryService = telemetryService;
        this.pathService = pathService;
        this.dirty = false;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this.oldDecorationsIDs = [];
        this.model = instantiationService.createInstance(SearchEditorModel, modelUri);
        if (this.modelUri.scheme !== SearchEditorScheme) {
            throw Error('SearchEditorInput must be invoked with a SearchEditorScheme uri');
        }
        this.memento = new Memento(SearchEditorInput_1.ID, storageService);
        this._register(storageService.onWillSaveState(() => this.memento.saveMemento()));
        const input = this;
        const workingCopyAdapter = new (class {
            constructor() {
                this.typeId = SearchEditorWorkingCopyTypeId;
                this.resource = input.modelUri;
                this.capabilities = input.hasCapability(4 /* EditorInputCapabilities.Untitled */)
                    ? 2 /* WorkingCopyCapabilities.Untitled */
                    : 0 /* WorkingCopyCapabilities.None */;
                this.onDidChangeDirty = input.onDidChangeDirty;
                this.onDidChangeContent = input.onDidChangeContent;
                this.onDidSave = input.onDidSave;
            }
            get name() {
                return input.getName();
            }
            isDirty() {
                return input.isDirty();
            }
            isModified() {
                return input.isDirty();
            }
            backup(token) {
                return input.backup(token);
            }
            save(options) {
                return input.save(0, options).then((editor) => !!editor);
            }
            revert(options) {
                return input.revert(0, options);
            }
        })();
        this._register(this.workingCopyService.registerWorkingCopy(workingCopyAdapter));
    }
    async save(group, options) {
        if ((await this.resolveModels()).resultsModel.isDisposed()) {
            return;
        }
        if (this.backingUri) {
            await this.textFileService.write(this.backingUri, await this.serializeForDisk(), options);
            this.setDirty(false);
            this._onDidSave.fire({ reason: options?.reason, source: options?.source });
            return this;
        }
        else {
            return this.saveAs(group, options);
        }
    }
    tryReadConfigSync() {
        return this._cachedConfigurationModel?.config;
    }
    async serializeForDisk() {
        const { configurationModel, resultsModel } = await this.resolveModels();
        return serializeSearchConfiguration(configurationModel.config) + '\n' + resultsModel.getValue();
    }
    registerConfigChangeListeners(model) {
        this.configChangeListenerDisposable?.dispose();
        if (!this.isDisposed()) {
            this.configChangeListenerDisposable = model.onConfigDidUpdate(() => {
                if (this.lastLabel !== this.getName()) {
                    this._onDidChangeLabel.fire();
                    this.lastLabel = this.getName();
                }
                this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */).searchConfig =
                    model.config;
            });
            this._register(this.configChangeListenerDisposable);
        }
    }
    async resolveModels() {
        return this.model.resolve().then((data) => {
            this._cachedResultsModel = data.resultsModel;
            this._cachedConfigurationModel = data.configurationModel;
            if (this.lastLabel !== this.getName()) {
                this._onDidChangeLabel.fire();
                this.lastLabel = this.getName();
            }
            this.registerConfigChangeListeners(data.configurationModel);
            return data;
        });
    }
    async saveAs(group, options) {
        const path = await this.fileDialogService.pickFileToSave(await this.suggestFileName(), options?.availableFileSystems);
        if (path) {
            this.telemetryService.publicLog2('searchEditor/saveSearchResults');
            const toWrite = await this.serializeForDisk();
            if (await this.textFileService.create([
                { resource: path, value: toWrite, options: { overwrite: true } },
            ])) {
                this.setDirty(false);
                if (!isEqual(path, this.modelUri)) {
                    const input = this.instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
                        fileUri: path,
                        from: 'existingFile',
                    });
                    input.setMatchRanges(this.getMatchRanges());
                    return input;
                }
                return this;
            }
        }
        return undefined;
    }
    getName(maxLength = 12) {
        const trimToMax = (label) => label.length < maxLength ? label : `${label.slice(0, maxLength - 3)}...`;
        if (this.backingUri) {
            const originalURI = EditorResourceAccessor.getOriginalUri(this);
            return localize('searchTitle.withQuery', 'Search: {0}', basename((originalURI ?? this.backingUri).path, SEARCH_EDITOR_EXT));
        }
        const query = this._cachedConfigurationModel?.config?.query?.trim();
        if (query) {
            return localize('searchTitle.withQuery', 'Search: {0}', trimToMax(query));
        }
        return localize('searchTitle', 'Search');
    }
    setDirty(dirty) {
        const wasDirty = this.dirty;
        this.dirty = dirty;
        if (wasDirty !== dirty) {
            this._onDidChangeDirty.fire();
        }
    }
    isDirty() {
        return this.dirty;
    }
    async rename(group, target) {
        if (extname(target) === SEARCH_EDITOR_EXT) {
            return {
                editor: this.instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
                    from: 'existingFile',
                    fileUri: target,
                }),
            };
        }
        // Ignore move if editor was renamed to a different file extension
        return undefined;
    }
    dispose() {
        this.modelService.destroyModel(this.modelUri);
        super.dispose();
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        if (other instanceof SearchEditorInput_1) {
            return (!!(other.modelUri.fragment && other.modelUri.fragment === this.modelUri.fragment) ||
                !!(other.backingUri && isEqual(other.backingUri, this.backingUri)));
        }
        return false;
    }
    getMatchRanges() {
        return (this._cachedResultsModel?.getAllDecorations() ?? [])
            .filter((decoration) => decoration.options.className === SearchEditorFindMatchClass)
            .filter(({ range }) => !(range.startColumn === 1 && range.endColumn === 1))
            .map(({ range }) => range);
    }
    async setMatchRanges(ranges) {
        this.oldDecorationsIDs = (await this.resolveModels()).resultsModel.deltaDecorations(this.oldDecorationsIDs, ranges.map((range) => ({
            range,
            options: {
                description: 'search-editor-find-match',
                className: SearchEditorFindMatchClass,
                stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            },
        })));
    }
    async revert(group, options) {
        if (options?.soft) {
            this.setDirty(false);
            return;
        }
        if (this.backingUri) {
            const { config, text } = await this.instantiationService.invokeFunction(parseSavedSearchEditor, this.backingUri);
            const { resultsModel, configurationModel } = await this.resolveModels();
            resultsModel.setValue(text);
            configurationModel.updateConfig(config);
        }
        else {
            ;
            (await this.resolveModels()).resultsModel.setValue('');
        }
        super.revert(group, options);
        this.setDirty(false);
    }
    async backup(token) {
        const contents = await this.serializeForDisk();
        if (token.isCancellationRequested) {
            return {};
        }
        return {
            content: bufferToReadable(VSBuffer.fromString(contents)),
        };
    }
    async suggestFileName() {
        const query = (await this.resolveModels()).configurationModel.config.query;
        const searchFileName = (query.replace(/[^\w \-_]+/g, '_') || 'Search') + SEARCH_EDITOR_EXT;
        return joinPath(await this.fileDialogService.defaultFilePath(this.pathService.defaultUriScheme), searchFileName);
    }
    toUntyped() {
        if (this.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
            return undefined;
        }
        return {
            resource: this.resource,
            options: {
                override: SearchEditorInput_1.ID,
            },
        };
    }
};
SearchEditorInput = SearchEditorInput_1 = __decorate([
    __param(2, IModelService),
    __param(3, ITextFileService),
    __param(4, IFileDialogService),
    __param(5, IInstantiationService),
    __param(6, IWorkingCopyService),
    __param(7, ITelemetryService),
    __param(8, IPathService),
    __param(9, IStorageService)
], SearchEditorInput);
export { SearchEditorInput };
export const getOrMakeSearchEditorInput = (accessor, existingData) => {
    const storageService = accessor.get(IStorageService);
    const configurationService = accessor.get(IConfigurationService);
    const instantiationService = accessor.get(IInstantiationService);
    const modelUri = existingData.from === 'model'
        ? existingData.modelUri
        : URI.from({ scheme: SearchEditorScheme, fragment: `${Math.random()}` });
    if (!searchEditorModelFactory.models.has(modelUri)) {
        if (existingData.from === 'existingFile') {
            instantiationService.invokeFunction((accessor) => searchEditorModelFactory.initializeModelFromExistingFile(accessor, modelUri, existingData.fileUri));
        }
        else {
            const searchEditorSettings = configurationService.getValue('search').searchEditor;
            const reuseOldSettings = searchEditorSettings.reusePriorSearchConfiguration;
            const defaultNumberOfContextLines = searchEditorSettings.defaultNumberOfContextLines;
            const priorConfig = reuseOldSettings
                ? new Memento(SearchEditorInput.ID, storageService).getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */).searchConfig
                : {};
            const defaultConfig = defaultSearchConfig();
            const config = { ...defaultConfig, ...priorConfig, ...existingData.config };
            if (defaultNumberOfContextLines !== null && defaultNumberOfContextLines !== undefined) {
                config.contextLines = existingData?.config?.contextLines ?? defaultNumberOfContextLines;
            }
            if (existingData.from === 'rawData') {
                if (existingData.resultsContents) {
                    config.contextLines = 0;
                }
                instantiationService.invokeFunction((accessor) => searchEditorModelFactory.initializeModelFromRawData(accessor, modelUri, config, existingData.resultsContents));
            }
            else {
                instantiationService.invokeFunction((accessor) => searchEditorModelFactory.initializeModelFromExistingModel(accessor, modelUri, config));
            }
        }
    }
    return instantiationService.createInstance(SearchEditorInput, modelUri, existingData.from === 'existingFile'
        ? existingData.fileUri
        : existingData.from === 'model'
            ? existingData.backupOf
            : undefined);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2hFZGl0b3IvYnJvd3Nlci9zZWFyY2hFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUdwRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUlOLHNCQUFzQixHQUl0QixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHVCQUF1QixFQUN2QixrQkFBa0IsRUFDbEIsNkJBQTZCLEdBRTdCLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkIsT0FBTyxFQUVOLGlC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