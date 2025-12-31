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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9xdWlja0RpZmZNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBR04scUJBQXFCLEVBRXJCLGdCQUFnQixHQUNoQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFFZixtQkFBbUIsR0FDbkIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFHNUYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBYyxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsd0JBQXdCLEVBQ3hCLGlCQUFpQixHQUlqQixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBa0IsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLG1CQUFtQixFQUF3QixNQUFNLHlDQUF5QyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWpGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUE7QUFPbEUsTUFBTSw4QkFBOEIsR0FBMEI7SUFDN0QsU0FBUyxFQUFFLFFBQVE7SUFDbkIsb0JBQW9CLEVBQUUsSUFBSTtDQUMxQixDQUFBO0FBaUJELElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWtDLFNBQVEsbUJBQW1DO0lBQ2xGLFlBQ3lDLHFCQUE0QztRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUZpQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO0lBR3JGLENBQUM7SUFFa0Isc0JBQXNCLENBQ3hDLElBQVksRUFDWixhQUEyQyxFQUMzQyxPQUE4QjtRQUU5QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBRWtCLHVCQUF1QixDQUFDLElBQVksRUFBRSxNQUFzQjtRQUM5RSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDakIsQ0FBQztDQUNELENBQUE7QUFsQkssaUNBQWlDO0lBRXBDLFdBQUEscUJBQXFCLENBQUE7R0FGbEIsaUNBQWlDLENBa0J0QztBQUVNLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBS2pDLFlBQ3lDLG9CQUEyQyxFQUNoRCxlQUFpQyxFQUM5QixrQkFBdUM7UUFGckMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNoRCxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDOUIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUU3RSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtJQUMvRixDQUFDO0lBRUQsNkJBQTZCLENBQzVCLFFBQWEsRUFDYixVQUFpQyw4QkFBOEI7UUFFL0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlELElBQUksQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNsQyxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsUUFBUSxHQUFHLElBQUksQ0FBQyxrQkFBa0I7YUFDaEMsY0FBYyxDQUFDLFFBQVEsQ0FBQzthQUN4QixJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzdFLENBQUM7Q0FDRCxDQUFBO0FBM0JZLHFCQUFxQjtJQU0vQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxtQkFBbUIsQ0FBQTtHQVJULHFCQUFxQixDQTJCakM7O0FBRU0sSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7SUFLN0MsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLEVBQ25DLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUM1QyxDQUFBO0lBQ0YsQ0FBQztJQWVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBTUQsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQztJQUlELFlBQ0MsYUFBMkMsRUFDMUIsT0FBOEIsRUFDbEMsVUFBd0MsRUFDbEMsZ0JBQW9ELEVBQ2pELG1CQUEwRCxFQUN6RCxvQkFBNEQsRUFDaEUsd0JBQTRELEVBQzFELG1CQUF5RCxFQUM1RCxlQUFrRDtRQUVwRSxLQUFLLEVBQUUsQ0FBQTtRQVRVLFlBQU8sR0FBUCxPQUFPLENBQXVCO1FBQ2pCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDakIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNoQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQ3hDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0MsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUFtQjtRQUN6Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQzNDLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQTdDcEQsMEJBQXFCLEdBQUcsSUFBSSxXQUFXLEVBQTRCLENBQUE7UUFDbkUscUNBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFRakYsY0FBUyxHQUFHLEtBQUssQ0FBQTtRQUNqQixnQkFBVyxHQUFnQixFQUFFLENBQUE7UUFFN0IsaUJBQVksR0FBRyxJQUFJLGdCQUFnQixDQUFPLEdBQUcsQ0FBQyxDQUFBO1FBRXJDLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBR3ZDLENBQUE7UUFDSyxnQkFBVyxHQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUVoQixhQUFRLEdBQXNCLEVBQUUsQ0FBQTtRQUt4Qzs7V0FFRztRQUNLLHNCQUFpQixHQUEwQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBSzNDLDJCQUFzQixHQUFHLElBQUksYUFBYSxFQUFrQixDQUFBO1FBYzVFLElBQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFBO1FBRTNCLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFGLElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLE1BQU0sQ0FDWCxvQkFBb0IsQ0FBQyx3QkFBd0IsRUFDN0MsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx5Q0FBeUMsQ0FBQztZQUNqRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsaUNBQWlDLENBQUMsQ0FDMUQsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUN6QixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDNUUsS0FBSyxNQUFNLENBQUMsSUFBSSxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFO1lBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7WUFDckIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2xDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUE7WUFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQzlCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNuQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsNkJBQTZCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU3RixJQUFJLENBQUMsU0FBUyxDQUNiLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzdCLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMzRSxLQUFLLENBQUMsR0FBRyxDQUNSLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUNiLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDN0MsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyxTQUFTO29CQUM5QixDQUFDO29CQUNELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtnQkFDbkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBRWpGLE9BQU87Z0JBQ04sS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLO2dCQUN0QixRQUFRLEVBQUUsU0FBUyxDQUFDLGdCQUFnQjtnQkFDcEMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUTtnQkFDOUIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQy9DLFFBQVEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO2FBQ2pELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxXQUFnQjtRQUN6QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQy9ELE9BQU8sV0FBVztZQUNqQixDQUFDLENBQUM7Z0JBQ0EsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZ0I7Z0JBQ3RDLFFBQVEsRUFBRSxXQUFXLENBQUMsZUFBZTthQUNyQztZQUNGLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDYixDQUFDO0lBRU8sa0JBQWtCLENBQUMsVUFBMEI7UUFDcEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6QyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRWpGLE1BQU0scUJBQXFCLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsRUFDckMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxVQUFVLENBQ3ZCLENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUNyRixDQUFBO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFeEQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFTyxXQUFXO1FBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWTthQUNmLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNuQixNQUFNLE1BQU0sR0FDWCxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUVsQixNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1lBQ3BFLElBQ0MsQ0FBQyxNQUFNO2dCQUNQLElBQUksQ0FBQyxTQUFTO2dCQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFO2dCQUN4QixZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUMsRUFDM0QsQ0FBQztnQkFDRixPQUFNLENBQUMsV0FBVztZQUNuQixDQUFDO1lBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVPLFVBQVUsQ0FBQyxPQUEwQixFQUFFLFVBQWlDO1FBQy9FLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVGLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxVQUFVLENBQUE7UUFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sSUFBSTtRQUlYLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQ3ZDLEVBQUUsUUFBUSw4QkFBc0IsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQzlDLEtBQUssSUFBSSxFQUFFO1lBQ1YsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUN0RCxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM3RSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLFdBQVc7WUFDM0UsQ0FBQztZQUVELE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQzVELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FDM0MsU0FBUyxDQUFDLGdCQUFnQixFQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FDcEIsQ0FDRCxDQUFBO1lBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsMEJBQTBCO1lBQzFGLENBQUM7WUFFRCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBRXBFLHlDQUF5QyxDQUFDLENBQUE7WUFDNUMsTUFBTSxvQkFBb0IsR0FDekIsMkJBQTJCLEtBQUssU0FBUztnQkFDeEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVUsaUNBQWlDLENBQUM7Z0JBQ2hGLENBQUMsQ0FBQywyQkFBMkIsS0FBSyxPQUFPLENBQUE7WUFFM0MsTUFBTSxRQUFRLEdBQXNCLEVBQUUsQ0FBQTtZQUN0QyxLQUFLLE1BQU0sU0FBUyxJQUFJLGtCQUFrQixFQUFFLENBQUM7Z0JBQzVDLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FDNUIsU0FBUyxDQUFDLGdCQUFnQixFQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFDcEIsb0JBQW9CLENBQ3BCLENBQUE7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDbkYsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7d0JBQzFELFFBQVEsQ0FBQyxJQUFJLENBQUM7NEJBQ2IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLOzRCQUN0QixRQUFRLEVBQUUsU0FBUyxDQUFDLGdCQUFnQjs0QkFDcEMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUTs0QkFDOUIsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDOzRCQUMzQixPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7eUJBQzdCLENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sR0FBRyxHQUEwQixJQUFJLEdBQUcsRUFBRSxDQUFBO1lBQzVDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7Z0JBQzdCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3JCLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUNuQixDQUFDO2dCQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLENBQUM7WUFDRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUE7UUFDNUMsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUssQ0FDbEIsUUFBYSxFQUNiLFFBQWEsRUFDYixvQkFBNkI7UUFFN0IsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUV6RixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQ3hELFFBQVEsRUFDUixRQUFRLEVBQ1I7WUFDQyxZQUFZLEVBQUUsS0FBSztZQUNuQixvQkFBb0I7WUFDcEIsb0JBQW9CO1NBQ3BCLEVBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQ3RCLENBQUE7UUFFRCxPQUFPO1lBQ04sT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUN4RSxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sSUFBSSxJQUFJO1NBQ2pDLENBQUE7SUFDRixDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUE7UUFDL0IsQ0FBQztRQUVELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFO1lBQzlFLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixXQUFXO2dCQUNYLE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztZQUVELElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7Z0JBQ3JCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDbEMsT0FBTyxFQUFFLENBQUE7WUFDVixDQUFDO1lBRUQsSUFDQyxNQUFNLENBQ0wsSUFBSSxDQUFDLFdBQVcsRUFDaEIsVUFBVSxFQUNWLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQ1IsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQ3ZGLEVBQ0EsQ0FBQztnQkFDRixPQUFPLFVBQVUsQ0FBQTtZQUNsQixDQUFDO1lBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7WUFFN0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2xDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUM3QyxPQUFPLENBQ04sTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNoQixVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRTtnQkFDbEMsSUFBSSxDQUFDO29CQUNKLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUNuRSxTQUFTLENBQUMsZ0JBQWdCLENBQzFCLENBQUE7b0JBQ0QsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ3BCLFdBQVc7d0JBQ1gsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO3dCQUNiLE9BQU8sRUFBRSxDQUFBO29CQUNWLENBQUM7b0JBRUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUV0RSxJQUFJLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO3dCQUN2QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFBO3dCQUUxQyxJQUFJLFFBQVEsRUFBRSxDQUFDOzRCQUNkLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsOEJBQXNCLENBQUE7d0JBQ3RELENBQUM7b0JBQ0YsQ0FBQztvQkFFRCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUM5QyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxDQUN4QyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FDdkUsQ0FBQTtvQkFFRCxPQUFPLFNBQVMsQ0FBQTtnQkFDakIsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixPQUFPLEVBQUUsQ0FBQSxDQUFDLDZCQUE2QjtnQkFDeEMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQ0QsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNULENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUMzQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQkFBbUI7UUFDaEMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQTtRQUVoQywyQ0FBMkM7UUFDM0MsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsa0JBQWtCO2FBQzVFLEdBQUcsRUFBRTthQUNMLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLDBDQUFrQyxDQUFDLENBQUE7UUFDekYsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlO1lBQ2pELENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztZQUNyRCxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzdGLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxVQUFrQixFQUFFLFNBQVMsR0FBRyxJQUFJLEVBQUUsUUFBaUI7UUFDNUUsSUFBSSxpQkFBcUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQzVCLGlCQUFpQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFBO1FBQ3hFLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBYSxFQUFFLENBQUE7UUFDcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUMsSUFBSSxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3BELFNBQVE7WUFDVCxDQUFDO1lBRUQsd0NBQXdDO1lBQ3hDLElBQ0MsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sRUFDdkYsQ0FBQztnQkFDRixTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUIsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFBO1lBRXBELElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsSUFBSSx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQzNELElBQUksaUJBQWlCLElBQUksTUFBTSxDQUFDLEtBQUssS0FBSyxpQkFBaUIsRUFBRSxDQUFDO3dCQUM3RCxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUN4QixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsT0FBTyxDQUFDLENBQUE7b0JBQ1QsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLEVBQUUsQ0FBQztvQkFDeEQsT0FBTyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUsscUJBQXFCLEVBQUUsQ0FBQztnQkFDcEYsT0FBTyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQseUJBQXlCLENBQUMsVUFBa0IsRUFBRSxTQUFTLEdBQUcsSUFBSSxFQUFFLFFBQWlCO1FBQ2hGLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDcEQsU0FBUTtZQUNULENBQUM7WUFFRCx3Q0FBd0M7WUFDeEMsSUFDQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxFQUN2RixDQUFDO2dCQUNGLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7WUFFckMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLE1BQU0sQ0FBQyx1QkFBdUIsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDbEQsT0FBTyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxHQUFHLFVBQVUsRUFBRSxDQUFDO29CQUNuRCxPQUFPLENBQUMsQ0FBQTtnQkFDVCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO1FBRXJCLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVyQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNELENBQUE7QUF2YlksY0FBYztJQTBDeEIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxnQkFBZ0IsQ0FBQTtHQWhETixjQUFjLENBdWIxQiJ9