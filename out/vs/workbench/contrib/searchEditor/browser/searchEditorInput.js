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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaEVkaXRvci9icm93c2VyL3NlYXJjaEVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3BELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBSU4sc0JBQXNCLEdBSXRCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3BELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQiw2QkFBNkIsR0FFN0IsTUFBTSxnQkFBZ0Is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