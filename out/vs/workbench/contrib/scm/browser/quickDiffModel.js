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
import { ResourceMap } from '../../../../base/common/map.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { isTextFileEditorModel, ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { Disposable, DisposableMap, DisposableStore, ReferenceCollection, } from '../../../../base/common/lifecycle.js';
import { IEditorWorkerService, } from '../../../../editor/common/services/editorWorker.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { shouldSynchronizeModel } from '../../../../editor/common/model.js';
import { compareChanges, getModifiedEndLineNumber, IQuickDiffService, } from '../common/quickDiff.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { ISCMService } from '../common/scm.js';
import { sortedDiff, equals } from '../../../../base/common/arrays.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DiffState } from '../../../../editor/browser/widget/diffEditor/diffEditorViewModel.js';
import { toLineChanges } from '../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IChatEditingService } from '../../chat/common/chatEditingService.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { autorun, autorunWithStore } from '../../../../base/common/observable.js';
export const IQuickDiffModelService = createDecorator('IQuickDiffModelService');
const decoratorQuickDiffModelOptions = {
    algorithm: 'legacy',
    maxComputationTimeMs: 1000,
};
let QuickDiffModelReferenceCollection = class QuickDiffModelReferenceCollection extends ReferenceCollection {
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
    }
    createReferencedObject(_key, textFileModel, options) {
        return this._instantiationService.createInstance(QuickDiffModel, textFileModel, options);
    }
    destroyReferencedObject(_key, object) {
        object.dispose();
    }
};
QuickDiffModelReferenceCollection = __decorate([
    __param(0, IInstantiationService)
], QuickDiffModelReferenceCollection);
let QuickDiffModelService = class QuickDiffModelService {
    constructor(instantiationService, textFileService, uriIdentityService) {
        this.instantiationService = instantiationService;
        this.textFileService = textFileService;
        this.uriIdentityService = uriIdentityService;
        this._references = this.instantiationService.createInstance(QuickDiffModelReferenceCollection);
    }
    createQuickDiffModelReference(resource, options = decoratorQuickDiffModelOptions) {
        const textFileModel = this.textFileService.files.get(resource);
        if (!textFileModel?.isResolved()) {
            return undefined;
        }
        resource = this.uriIdentityService
            .asCanonicalUri(resource)
            .with({ query: JSON.stringify(options) });
        return this._references.acquire(resource.toString(), textFileModel, options);
    }
};
QuickDiffModelService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextFileService),
    __param(2, IUriIdentityService)
], QuickDiffModelService);
export { QuickDiffModelService };
let QuickDiffModel = class QuickDiffModel extends Disposable {
    get originalTextModels() {
        return Iterable.map(this._originalEditorModels.values(), (editorModel) => editorModel.textEditorModel);
    }
    get changes() {
        return this._changes;
    }
    get quickDiffChanges() {
        return this._quickDiffChanges;
    }
    constructor(textFileModel, options, scmService, quickDiffService, editorWorkerService, configurationService, textModelResolverService, _chatEditingService, progressService) {
        super();
        this.options = options;
        this.scmService = scmService;
        this.quickDiffService = quickDiffService;
        this.editorWorkerService = editorWorkerService;
        this.configurationService = configurationService;
        this.textModelResolverService = textModelResolverService;
        this._chatEditingService = _chatEditingService;
        this.progressService = progressService;
        this._originalEditorModels = new ResourceMap();
        this._originalEditorModelsDisposables = this._register(new DisposableStore());
        this._disposed = false;
        this._quickDiffs = [];
        this._diffDelayer = new ThrottledDelayer(200);
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._changes = [];
        /**
         * Map of quick diff name to the index of the change in `this.changes`
         */
        this._quickDiffChanges = new Map();
        this._repositoryDisposables = new DisposableMap();
        this._model = textFileModel;
        this._register(textFileModel.textEditorModel.onDidChangeContent(() => this.triggerDiff()));
        this._register(Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.diffDecorationsIgnoreTrimWhitespace') ||
            e.affectsConfiguration('diffEditor.ignoreTrimWhitespace'))(this.triggerDiff, this));
        this._register(scmService.onDidAddRepository(this.onDidAddRepository, this));
        for (const r of scmService.repositories) {
            this.onDidAddRepository(r);
        }
        this._register(this._model.onDidChangeEncoding(() => {
            this._diffDelayer.cancel();
            this._quickDiffs = [];
            this._originalEditorModels.clear();
            this._quickDiffsPromise = undefined;
            this.setChanges([], new Map());
            this.triggerDiff();
        }));
        this._register(this.quickDiffService.onDidChangeQuickDiffProviders(() => this.triggerDiff()));
        this._register(autorunWithStore((r, store) => {
            for (const session of this._chatEditingService.editingSessionsObs.read(r)) {
                store.add(autorun((r) => {
                    for (const entry of session.entries.read(r)) {
                        entry.state.read(r); // signal
                    }
                    this.triggerDiff();
                }));
            }
        }));
        this.triggerDiff();
    }
    get quickDiffs() {
        return this._quickDiffs;
    }
    getQuickDiffResults() {
        return this._quickDiffs.map((quickDiff) => {
            const changes = this.changes.filter((change) => change.label === quickDiff.label);
            return {
                label: quickDiff.label,
                original: quickDiff.originalResource,
                modified: this._model.resource,
                changes: changes.map((change) => change.change),
                changes2: changes.map((change) => change.change2),
            };
        });
    }
    getDiffEditorModel(originalUri) {
        const editorModel = this._originalEditorModels.get(originalUri);
        return editorModel
            ? {
                modified: this._model.textEditorModel,
                original: editorModel.textEditorModel,
            }
            : undefined;
    }
    onDidAddRepository(repository) {
        const disposables = new DisposableStore();
        disposables.add(repository.provider.onDidChangeResources(this.triggerDiff, this));
        const onDidRemoveRepository = Event.filter(this.scmService.onDidRemoveRepository, (r) => r === repository);
        disposables.add(onDidRemoveRepository(() => this._repositoryDisposables.deleteAndDispose(repository)));
        this._repositoryDisposables.set(repository, disposables);
        this.triggerDiff();
    }
    triggerDiff() {
        if (!this._diffDelayer) {
            return;
        }
        this._diffDelayer
            .trigger(async () => {
            const result = await this.diff();
            const editorModels = Array.from(this._originalEditorModels.values());
            if (!result ||
                this._disposed ||
                this._model.isDisposed() ||
                editorModels.some((editorModel) => editorModel.isDisposed())) {
                return; // disposed
            }
            this.setChanges(result.changes, result.mapChanges);
        })
            .catch((err) => onUnexpectedError(err));
    }
    setChanges(changes, mapChanges) {
        const diff = sortedDiff(this.changes, changes, (a, b) => compareChanges(a.change, b.change));
        this._changes = changes;
        this._quickDiffChanges = mapChanges;
        this._onDidChange.fire({ changes, diff });
    }
    diff() {
        return this.progressService.withProgress({ location: 3 /* ProgressLocation.Scm */, delay: 250 }, async () => {
            const originalURIs = await this.getQuickDiffsPromise();
            if (this._disposed || this._model.isDisposed() || originalURIs.length === 0) {
                return Promise.resolve({ changes: [], mapChanges: new Map() }); // disposed
            }
            const filteredToDiffable = originalURIs.filter((quickDiff) => this.editorWorkerService.canComputeDirtyDiff(quickDiff.originalResource, this._model.resource));
            if (filteredToDiffable.length === 0) {
                return Promise.resolve({ changes: [], mapChanges: new Map() }); // All files are too large
            }
            const ignoreTrimWhitespaceSetting = this.configurationService.getValue('scm.diffDecorationsIgnoreTrimWhitespace');
            const ignoreTrimWhitespace = ignoreTrimWhitespaceSetting === 'inherit'
                ? this.configurationService.getValue('diffEditor.ignoreTrimWhitespace')
                : ignoreTrimWhitespaceSetting !== 'false';
            const allDiffs = [];
            for (const quickDiff of filteredToDiffable) {
                const diff = await this._diff(quickDiff.originalResource, this._model.resource, ignoreTrimWhitespace);
                if (diff.changes && diff.changes2 && diff.changes.length === diff.changes2.length) {
                    for (let index = 0; index < diff.changes.length; index++) {
                        allDiffs.push({
                            label: quickDiff.label,
                            original: quickDiff.originalResource,
                            modified: this._model.resource,
                            change: diff.changes[index],
                            change2: diff.changes2[index],
                        });
                    }
                }
            }
            const sorted = allDiffs.sort((a, b) => compareChanges(a.change, b.change));
            const map = new Map();
            for (let i = 0; i < sorted.length; i++) {
                const label = sorted[i].label;
                if (!map.has(label)) {
                    map.set(label, []);
                }
                map.get(label).push(i);
            }
            return { changes: sorted, mapChanges: map };
        });
    }
    async _diff(original, modified, ignoreTrimWhitespace) {
        const maxComputationTimeMs = this.options.maxComputationTimeMs ?? Number.MAX_SAFE_INTEGER;
        const result = await this.editorWorkerService.computeDiff(original, modified, {
            computeMoves: false,
            ignoreTrimWhitespace,
            maxComputationTimeMs,
        }, this.options.algorithm);
        return {
            changes: result ? toLineChanges(DiffState.fromDiffResult(result)) : null,
            changes2: result?.changes ?? null,
        };
    }
    getQuickDiffsPromise() {
        if (this._quickDiffsPromise) {
            return this._quickDiffsPromise;
        }
        this._quickDiffsPromise = this.getOriginalResource().then(async (quickDiffs) => {
            if (this._disposed) {
                // disposed
                return [];
            }
            if (quickDiffs.length === 0) {
                this._quickDiffs = [];
                this._originalEditorModels.clear();
                return [];
            }
            if (equals(this._quickDiffs, quickDiffs, (a, b) => a.originalResource.toString() === b.originalResource.toString() && a.label === b.label)) {
                return quickDiffs;
            }
            this._quickDiffs = quickDiffs;
            this._originalEditorModels.clear();
            this._originalEditorModelsDisposables.clear();
            return (await Promise.all(quickDiffs.map(async (quickDiff) => {
                try {
                    const ref = await this.textModelResolverService.createModelReference(quickDiff.originalResource);
                    if (this._disposed) {
                        // disposed
                        ref.dispose();
                        return [];
                    }
                    this._originalEditorModels.set(quickDiff.originalResource, ref.object);
                    if (isTextFileEditorModel(ref.object)) {
                        const encoding = this._model.getEncoding();
                        if (encoding) {
                            ref.object.setEncoding(encoding, 1 /* EncodingMode.Decode */);
                        }
                    }
                    this._originalEditorModelsDisposables.add(ref);
                    this._originalEditorModelsDisposables.add(ref.object.textEditorModel.onDidChangeContent(() => this.triggerDiff()));
                    return quickDiff;
                }
                catch (error) {
                    return []; // possibly invalid reference
                }
            }))).flat();
        });
        return this._quickDiffsPromise.finally(() => {
            this._quickDiffsPromise = undefined;
        });
    }
    async getOriginalResource() {
        if (this._disposed) {
            return Promise.resolve([]);
        }
        const uri = this._model.resource;
        // disable dirty diff when doing chat edits
        const isBeingModifiedByChatEdits = this._chatEditingService.editingSessionsObs
            .get()
            .some((session) => session.getEntry(uri)?.state.get() === 0 /* WorkingSetEntryState.Modified */);
        if (isBeingModifiedByChatEdits) {
            return Promise.resolve([]);
        }
        const isSynchronized = this._model.textEditorModel
            ? shouldSynchronizeModel(this._model.textEditorModel)
            : undefined;
        return this.quickDiffService.getQuickDiffs(uri, this._model.getLanguageId(), isSynchronized);
    }
    findNextClosestChange(lineNumber, inclusive = true, provider) {
        let preferredProvider;
        if (!provider && inclusive) {
            preferredProvider = this.quickDiffs.find((value) => value.isSCM)?.label;
        }
        const possibleChanges = [];
        for (let i = 0; i < this.changes.length; i++) {
            if (provider && this.changes[i].label !== provider) {
                continue;
            }
            // Skip quick diffs that are not visible
            if (!this.quickDiffs.find((quickDiff) => quickDiff.label === this.changes[i].label)?.visible) {
                continue;
            }
            const change = this.changes[i];
            const possibleChangesLength = possibleChanges.length;
            if (inclusive) {
                if (getModifiedEndLineNumber(change.change) >= lineNumber) {
                    if (preferredProvider && change.label !== preferredProvider) {
                        possibleChanges.push(i);
                    }
                    else {
                        return i;
                    }
                }
            }
            else {
                if (change.change.modifiedStartLineNumber > lineNumber) {
                    return i;
                }
            }
            if (possibleChanges.length > 0 && possibleChanges.length === possibleChangesLength) {
                return possibleChanges[0];
            }
        }
        return possibleChanges.length > 0 ? possibleChanges[0] : 0;
    }
    findPreviousClosestChange(lineNumber, inclusive = true, provider) {
        for (let i = this.changes.length - 1; i >= 0; i--) {
            if (provider && this.changes[i].label !== provider) {
                continue;
            }
            // Skip quick diffs that are not visible
            if (!this.quickDiffs.find((quickDiff) => quickDiff.label === this.changes[i].label)?.visible) {
                continue;
            }
            const change = this.changes[i].change;
            if (inclusive) {
                if (change.modifiedStartLineNumber <= lineNumber) {
                    return i;
                }
            }
            else {
                if (getModifiedEndLineNumber(change) < lineNumber) {
                    return i;
                }
            }
        }
        return this.changes.length - 1;
    }
    dispose() {
        this._disposed = true;
        this._quickDiffs = [];
        this._diffDelayer.cancel();
        this._originalEditorModels.clear();
        this._repositoryDisposables.dispose();
        super.dispose();
    }
};
QuickDiffModel = __decorate([
    __param(2, ISCMService),
    __param(3, IQuickDiffService),
    __param(4, IEditorWorkerService),
    __param(5, IConfigurationService),
    __param(6, ITextModelService),
    __param(7, IChatEditingService),
    __param(8, IProgressService)
], QuickDiffModel);
export { QuickDiffModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3F1aWNrRGlmZk1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sZUFBZSxFQUNmLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFHTixxQkFBcUIsRUFFckIsZ0JBQWdCLEdBQ2hCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxFQUVmLG1CQUFtQixHQUNuQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUc1RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFjLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkYsT0FBTyxFQUNOLGNBQWMsRUFDZCx3QkFBd0IsRUFDeEIsaUJBQWlCLEdBSWpCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFrQixXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8s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