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
var MultiDiffEditorInput_1;
import { LazyStatefulPromise, raceTimeout } from '../../../../base/common/async.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../base/common/errors.js';
import { Event, ValueWithChangeEvent } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { deepClone } from '../../../../base/common/objects.js';
import { ObservableLazyPromise, ValueWithChangeEventFromObservable, autorun, constObservable, derived, mapObservableArrayCached, observableFromEvent, observableFromValueWithChangeEvent, observableValue, recomputeInitiallyAndOnChange, } from '../../../../base/common/observable.js';
import { isDefined, isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { RefCounted } from '../../../../editor/browser/widget/diffEditor/utils.js';
import { MultiDiffEditorViewModel } from '../../../../editor/browser/widget/multiDiffEditor/multiDiffEditorViewModel.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { DEFAULT_EDITOR_ASSOCIATION, } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { MultiDiffEditorIcon } from './icons.contribution.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem, } from './multiDiffSourceResolverService.js';
let MultiDiffEditorInput = class MultiDiffEditorInput extends EditorInput {
    static { MultiDiffEditorInput_1 = this; }
    static fromResourceMultiDiffEditorInput(input, instantiationService) {
        if (!input.multiDiffSource && !input.resources) {
            throw new BugIndicatingError('MultiDiffEditorInput requires either multiDiffSource or resources');
        }
        const multiDiffSource = input.multiDiffSource ??
            URI.parse(`multi-diff-editor:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
        return instantiationService.createInstance(MultiDiffEditorInput_1, multiDiffSource, input.label, input.resources?.map((resource) => {
            return new MultiDiffEditorItem(resource.original.resource, resource.modified.resource, resource.goToFileResource);
        }), input.isTransient ?? false);
    }
    static fromSerialized(data, instantiationService) {
        return instantiationService.createInstance(MultiDiffEditorInput_1, URI.parse(data.multiDiffSourceUri), data.label, data.resources?.map((resource) => new MultiDiffEditorItem(resource.originalUri ? URI.parse(resource.originalUri) : undefined, resource.modifiedUri ? URI.parse(resource.modifiedUri) : undefined, resource.goToFileUri ? URI.parse(resource.goToFileUri) : undefined)), false);
    }
    static { this.ID = 'workbench.input.multiDiffEditor'; }
    get resource() {
        return this.multiDiffSource;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */;
    }
    get typeId() {
        return MultiDiffEditorInput_1.ID;
    }
    getName() {
        return this._name;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    getIcon() {
        return MultiDiffEditorIcon;
    }
    constructor(multiDiffSource, label, initialResources, isTransient = false, _textModelService, _textResourceConfigurationService, _instantiationService, _multiDiffSourceResolverService, _textFileService) {
        super();
        this.multiDiffSource = multiDiffSource;
        this.label = label;
        this.initialResources = initialResources;
        this.isTransient = isTransient;
        this._textModelService = _textModelService;
        this._textResourceConfigurationService = _textResourceConfigurationService;
        this._instantiationService = _instantiationService;
        this._multiDiffSourceResolverService = _multiDiffSourceResolverService;
        this._textFileService = _textFileService;
        this._name = '';
        this._viewModel = new LazyStatefulPromise(async () => {
            const model = await this._createModel();
            this._register(model);
            const vm = new MultiDiffEditorViewModel(model, this._instantiationService);
            this._register(vm);
            await raceTimeout(vm.waitForDiffs(), 1000);
            return vm;
        });
        this._resolvedSource = new ObservableLazyPromise(async () => {
            const source = this.initialResources
                ? { resources: ValueWithChangeEvent.const(this.initialResources) }
                : await this._multiDiffSourceResolverService.resolve(this.multiDiffSource);
            return {
                source,
                resources: source
                    ? observableFromValueWithChangeEvent(this, source.resources)
                    : constObservable([]),
            };
        });
        this.resources = derived(this, (reader) => this._resolvedSource.cachedPromiseResult.read(reader)?.data?.resources.read(reader));
        this.textFileServiceOnDidChange = new FastEventDispatcher(this._textFileService.files.onDidChangeDirty, (item) => item.resource.toString(), (uri) => uri.toString());
        this._isDirtyObservables = mapObservableArrayCached(this, this.resources.map((r) => r ?? []), (res) => {
            const isModifiedDirty = res.modifiedUri
                ? isUriDirty(this.textFileServiceOnDidChange, this._textFileService, res.modifiedUri)
                : constObservable(false);
            const isOriginalDirty = res.originalUri
                ? isUriDirty(this.textFileServiceOnDidChange, this._textFileService, res.originalUri)
                : constObservable(false);
            return derived((reader) => 
            /** @description modifiedDirty||originalDirty */ isModifiedDirty.read(reader) ||
                isOriginalDirty.read(reader));
        }, (i) => i.getKey());
        this._isDirtyObservable = derived(this, (reader) => this._isDirtyObservables.read(reader).some((isDirty) => isDirty.read(reader))).keepObserved(this._store);
        this.onDidChangeDirty = Event.fromObservableLight(this._isDirtyObservable);
        this.closeHandler = {
            // This is a workaround for not having a better way
            // to figure out if the editors this input wraps
            // around are opened or not
            async confirm() {
                return 1 /* ConfirmResult.DONT_SAVE */;
            },
            showConfirm() {
                return false;
            },
        };
        this._register(autorun((reader) => {
            /** @description Updates name */
            const resources = this.resources.read(reader);
            const label = this.label ?? localize('name', 'Multi Diff Editor');
            if (resources && resources.length === 1) {
                this._name = localize({ key: 'nameWithOneFile', comment: ['{0} is the name of the editor'] }, '{0} (1 file)', label);
            }
            else if (resources) {
                this._name = localize({
                    key: 'nameWithFiles',
                    comment: ['{0} is the name of the editor', '{1} is the number of files being shown'],
                }, '{0} ({1} files)', label, resources.length);
            }
            else {
                this._name = label;
            }
            this._onDidChangeLabel.fire();
        }));
    }
    serialize() {
        return {
            label: this.label,
            multiDiffSourceUri: this.multiDiffSource.toString(),
            resources: this.initialResources?.map((resource) => ({
                originalUri: resource.originalUri?.toString(),
                modifiedUri: resource.modifiedUri?.toString(),
                goToFileUri: resource.goToFileUri?.toString(),
            })),
        };
    }
    setLanguageId(languageId, source) {
        const activeDiffItem = this._viewModel.requireValue().activeDiffItem.get();
        const value = activeDiffItem?.documentDiffItem;
        if (!value) {
            return;
        }
        const target = value.modified ?? value.original;
        if (!target) {
            return;
        }
        target.setLanguage(languageId, source);
    }
    async getViewModel() {
        return this._viewModel.getPromise();
    }
    async _createModel() {
        const source = await this._resolvedSource.getPromise();
        const textResourceConfigurationService = this._textResourceConfigurationService;
        const documentsWithPromises = mapObservableArrayCached(this, source.resources, async (r, store) => {
            /** @description documentsWithPromises */
            let original;
            let modified;
            const multiDiffItemStore = new DisposableStore();
            try {
                ;
                [original, modified] = await Promise.all([
                    r.originalUri ? this._textModelService.createModelReference(r.originalUri) : undefined,
                    r.modifiedUri ? this._textModelService.createModelReference(r.modifiedUri) : undefined,
                ]);
                if (original) {
                    multiDiffItemStore.add(original);
                }
                if (modified) {
                    multiDiffItemStore.add(modified);
                }
            }
            catch (e) {
                // e.g. "File seems to be binary and cannot be opened as text"
                console.error(e);
                onUnexpectedError(e);
                return undefined;
            }
            const uri = (r.modifiedUri ?? r.originalUri);
            const result = {
                multiDiffEditorItem: r,
                original: original?.object.textEditorModel,
                modified: modified?.object.textEditorModel,
                contextKeys: r.contextKeys,
                get options() {
                    return {
                        ...getReadonlyConfiguration(modified?.object.isReadonly() ?? true),
                        ...computeOptions(textResourceConfigurationService.getValue(uri)),
                    };
                },
                onOptionsDidChange: (h) => this._textResourceConfigurationService.onDidChangeConfiguration((e) => {
                    if (e.affectsConfiguration(uri, 'editor') ||
                        e.affectsConfiguration(uri, 'diffEditor')) {
                        h();
                    }
                }),
            };
            return store.add(RefCounted.createOfNonDisposable(result, multiDiffItemStore, this));
        }, (i) => JSON.stringify([i.modifiedUri?.toString(), i.originalUri?.toString()]));
        const documents = observableValue('documents', 'loading');
        const updateDocuments = derived(async (reader) => {
            /** @description Update documents */
            const docsPromises = documentsWithPromises.read(reader);
            const docs = await Promise.all(docsPromises);
            const newDocuments = docs.filter(isDefined);
            documents.set(newDocuments, undefined);
        });
        const a = recomputeInitiallyAndOnChange(updateDocuments);
        await updateDocuments.get();
        const result = {
            dispose: () => a.dispose(),
            documents: new ValueWithChangeEventFromObservable(documents),
            contextKeys: source.source?.contextKeys,
        };
        return result;
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof MultiDiffEditorInput_1) {
            return this.multiDiffSource.toString() === otherInput.multiDiffSource.toString();
        }
        return false;
    }
    isDirty() {
        return this._isDirtyObservable.get();
    }
    async save(group, options) {
        await this.doSaveOrRevert('save', group, options);
        return this;
    }
    revert(group, options) {
        return this.doSaveOrRevert('revert', group, options);
    }
    async doSaveOrRevert(mode, group, options) {
        const items = this._viewModel.currentValue?.items.get();
        if (items) {
            await Promise.all(items.map(async (item) => {
                const model = item.diffEditorViewModel.model;
                const handleOriginal = model.original.uri.scheme !== Schemas.untitled &&
                    this._textFileService.isDirty(model.original.uri); // match diff editor behaviour
                await Promise.all([
                    handleOriginal
                        ? mode === 'save'
                            ? this._textFileService.save(model.original.uri, options)
                            : this._textFileService.revert(model.original.uri, options)
                        : Promise.resolve(),
                    mode === 'save'
                        ? this._textFileService.save(model.modified.uri, options)
                        : this._textFileService.revert(model.modified.uri, options),
                ]);
            }));
        }
        return undefined;
    }
};
MultiDiffEditorInput = MultiDiffEditorInput_1 = __decorate([
    __param(4, ITextModelService),
    __param(5, ITextResourceConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IMultiDiffSourceResolverService),
    __param(8, ITextFileService)
], MultiDiffEditorInput);
export { MultiDiffEditorInput };
/**
 * Uses a map to efficiently dispatch events to listeners that are interested in a specific key.
 */
class FastEventDispatcher {
    constructor(_event, _getEventArgsKey, _keyToString) {
        this._event = _event;
        this._getEventArgsKey = _getEventArgsKey;
        this._keyToString = _keyToString;
        this._count = 0;
        this._buckets = new Map();
        this._handleEventChange = (e) => {
            const key = this._getEventArgsKey(e);
            const bucket = this._buckets.get(key);
            if (bucket) {
                for (const listener of bucket) {
                    listener(e);
                }
            }
        };
    }
    filteredEvent(filter) {
        return (listener) => {
            const key = this._keyToString(filter);
            let bucket = this._buckets.get(key);
            if (!bucket) {
                bucket = new Set();
                this._buckets.set(key, bucket);
            }
            bucket.add(listener);
            this._count++;
            if (this._count === 1) {
                this._eventSubscription = this._event(this._handleEventChange);
            }
            return {
                dispose: () => {
                    bucket.delete(listener);
                    if (bucket.size === 0) {
                        this._buckets.delete(key);
                    }
                    this._count--;
                    if (this._count === 0) {
                        this._eventSubscription?.dispose();
                        this._eventSubscription = undefined;
                    }
                },
            };
        };
    }
}
function isUriDirty(onDidChangeDirty, textFileService, uri) {
    return observableFromEvent(onDidChangeDirty.filteredEvent(uri), () => textFileService.isDirty(uri));
}
function getReadonlyConfiguration(isReadonly) {
    return {
        readOnly: !!isReadonly,
        readOnlyMessage: typeof isReadonly !== 'boolean' ? isReadonly : undefined,
    };
}
function computeOptions(configuration) {
    const editorConfiguration = deepClone(configuration.editor);
    // Handle diff editor specially by merging in diffEditor configuration
    if (isObject(configuration.diffEditor)) {
        const diffEditorConfiguration = deepClone(configuration.diffEditor);
        // User settings defines `diffEditor.codeLens`, but here we rename that to `diffEditor.diffCodeLens` to avoid collisions with `editor.codeLens`.
        diffEditorConfiguration.diffCodeLens = diffEditorConfiguration.codeLens;
        delete diffEditorConfiguration.codeLens;
        // User settings defines `diffEditor.wordWrap`, but here we rename that to `diffEditor.diffWordWrap` to avoid collisions with `editor.wordWrap`.
        diffEditorConfiguration.diffWordWrap = (diffEditorConfiguration.wordWrap);
        delete diffEditorConfiguration.wordWrap;
        Object.assign(editorConfiguration, diffEditorConfiguration);
    }
    return editorConfiguration;
}
let MultiDiffEditorResolverContribution = class MultiDiffEditorResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.multiDiffEditorResolver'; }
    constructor(editorResolverService, instantiationService) {
        super();
        this._register(editorResolverService.registerEditor(`*`, {
            id: DEFAULT_EDITOR_ASSOCIATION.id,
            label: DEFAULT_EDITOR_ASSOCIATION.displayName,
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.builtin,
        }, {}, {
            createMultiDiffEditorInput: (multiDiffEditor) => {
                return {
                    editor: MultiDiffEditorInput.fromResourceMultiDiffEditorInput(multiDiffEditor, instantiationService),
                };
            },
        }));
    }
};
MultiDiffEditorResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], MultiDiffEditorResolverContribution);
export { MultiDiffEditorResolverContribution };
export class MultiDiffEditorSerializer {
    canSerialize(editor) {
        return editor instanceof MultiDiffEditorInput && !editor.isTransient;
    }
    serialize(editor) {
        if (!this.canSerialize(editor)) {
            return undefined;
        }
        return JSON.stringify(editor.serialize());
    }
    deserialize(instantiationService, serializedEditor) {
        try {
            const data = parse(serializedEditor);
            return MultiDiffEditorInput.fromSerialized(data, instantiationService);
        }
        catch (err) {
            onUnexpectedError(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tdWx0aURpZmZFZGl0b3IvYnJvd3Nlci9tdWx0aURpZmZFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU5RSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsR0FHZixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFDTixxQkFBcUIsRUFDckIsa0NBQWtDLEVBQ2xDLE9BQU8sRUFDUCxlQUFlLEVBQ2YsT0FBTyxFQUNQLHdCQUF3QixFQUN4QixtQkFBbUIsRUFDbkIsa0NBQWtDLEVBQ2xDLGVBQWUsRUFDZiw2QkFBNkIsR0FDN0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFLbEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFFeEgsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQ04sMEJBQTBCLEdBUzFCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLFdBQVcsRUFBdUIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RixPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHdCQUF3QixHQUN4QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFHTixnQkFBZ0IsR0FDaEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sK0JBQStCLEVBRS9CLG1CQUFtQixHQUNuQixNQUFNLHFDQUFxQyxDQUFBO0FBRXJDLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsV0FBVzs7SUFDN0MsTUFBTSxDQUFDLGdDQUFnQyxDQUM3QyxLQUFvQyxFQUNwQyxvQkFBMkM7UUFFM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEQsTUFBTSxJQUFJLGtCQUFrQixDQUMzQixtRUFBbUUsQ0FDbkUsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLGVBQWUsR0FDcEIsS0FBSyxDQUFDLGVBQWU7WUFDckIsR0FBRyxDQUFDLEtBQUssQ0FDUixxQkFBcUIsSUFBSSxJQUFJLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDekYsQ0FBQTtRQUNGLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUN6QyxzQkFBb0IsRUFDcEIsZUFBZSxFQUNmLEtBQUssQ0FBQyxLQUFLLEVBQ1gsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNqQyxPQUFPLElBQUksbUJBQW1CLENBQzdCLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUMxQixRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUN6QixDQUFBO1FBQ0YsQ0FBQyxDQUFDLEVBQ0YsS0FBSyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQzFCLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGNBQWMsQ0FDM0IsSUFBcUMsRUFDckMsb0JBQTJDO1FBRTNDLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUN6QyxzQkFBb0IsRUFDcEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFDbEMsSUFBSSxDQUFDLEtBQUssRUFDVixJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FDbEIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUNaLElBQUksbUJBQW1CLENBQ3RCLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQ2xFLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQ2xFLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQ2xFLENBQ0YsRUFDRCxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUM7YUFFZSxPQUFFLEdBQVcsaUNBQWlDLEFBQTVDLENBQTRDO0lBRTlELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBRUQsSUFBYSxZQUFZO1FBQ3hCLGdEQUF1QztJQUN4QyxDQUFDO0lBQ0QsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sc0JBQW9CLENBQUMsRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFHUSxPQUFPO1FBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxJQUFhLFFBQVE7UUFDcEIsT0FBTywwQkFBMEIsQ0FBQyxFQUFFLENBQUE7SUFDckMsQ0FBQztJQUNRLE9BQU87UUFDZixPQUFPLG1CQUFtQixDQUFBO0lBQzNCLENBQUM7SUFFRCxZQUNpQixlQUFvQixFQUNwQixLQUF5QixFQUN6QixnQkFBNEQsRUFDNUQsY0FBdUIsS0FBSyxFQUN6QixpQkFBcUQsRUFFeEUsaUNBQXFGLEVBQzlELHFCQUE2RCxFQUVwRiwrQkFBaUYsRUFDL0QsZ0JBQW1EO1FBRXJFLEtBQUssRUFBRSxDQUFBO1FBWlMsb0JBQWUsR0FBZixlQUFlLENBQUs7UUFDcEIsVUFBSyxHQUFMLEtBQUssQ0FBb0I7UUFDekIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUE0QztRQUM1RCxnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7UUFDUixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBRXZELHNDQUFpQyxHQUFqQyxpQ0FBaUMsQ0FBbUM7UUFDN0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUVuRSxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWlDO1FBQzlDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUF2QjlELFVBQUssR0FBVyxFQUFFLENBQUE7UUFxRlQsZUFBVSxHQUFHLElBQUksbUJBQW1CLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDaEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNyQixNQUFNLEVBQUUsR0FBRyxJQUFJLHdCQUF3QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQTtZQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2xCLE1BQU0sV0FBVyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMxQyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUMsQ0FBQyxDQUFBO1FBcUZlLG9CQUFlLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN2RSxNQUFNLE1BQU0sR0FBeUMsSUFBSSxDQUFDLGdCQUFnQjtnQkFDekUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDbEUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDM0UsT0FBTztnQkFDTixNQUFNO2dCQUNOLFNBQVMsRUFBRSxNQUFNO29CQUNoQixDQUFDLENBQUMsa0NBQWtDLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUM7b0JBQzVELENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO2FBQ3RCLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQWNjLGNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDcEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQ25GLENBQUE7UUFFZ0IsK0JBQTBCLEdBQUcsSUFBSSxtQkFBbUIsQ0FDcEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFDNUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQ2xDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQ3ZCLENBQUE7UUFFZ0Isd0JBQW1CLEdBQUcsd0JBQXdCLENBQzlELElBQUksRUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUNsQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ1AsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLFdBQVc7Z0JBQ3RDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDO2dCQUNyRixDQUFDLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxXQUFXO2dCQUN0QyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQztnQkFDckYsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN6QixPQUFPLE9BQU8sQ0FDYixDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ1YsZ0RBQWdELENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQzdFLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQzdCLENBQUE7UUFDRixDQUFDLEVBQ0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FDakIsQ0FBQTtRQUNnQix1QkFBa0IsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDOUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDN0UsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRVQscUJBQWdCLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBc0RyRSxpQkFBWSxHQUF3QjtZQUNyRCxtREFBbUQ7WUFDbkQsZ0RBQWdEO1lBQ2hELDJCQUEyQjtZQUUzQixLQUFLLENBQUMsT0FBTztnQkFDWix1Q0FBOEI7WUFDL0IsQ0FBQztZQUNELFdBQVc7Z0JBQ1YsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1NBQ0QsQ0FBQTtRQS9RQSxJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2xCLGdDQUFnQztZQUNoQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM3QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtZQUNqRSxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FDcEIsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLENBQUMsK0JBQStCLENBQUMsRUFBRSxFQUN0RSxjQUFjLEVBQ2QsS0FBSyxDQUNMLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUNwQjtvQkFDQyxHQUFHLEVBQUUsZUFBZTtvQkFDcEIsT0FBTyxFQUFFLENBQUMsK0JBQStCLEVBQUUsd0NBQXdDLENBQUM7aUJBQ3BGLEVBQ0QsaUJBQWlCLEVBQ2pCLEtBQUssRUFDTCxTQUFTLENBQUMsTUFBTSxDQUNoQixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ25CLENBQUM7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixrQkFBa0IsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRTtZQUNuRCxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDcEQsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFO2dCQUM3QyxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUU7Z0JBQzdDLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRTthQUM3QyxDQUFDLENBQUM7U0FDSCxDQUFBO0lBQ0YsQ0FBQztJQUVNLGFBQWEsQ0FBQyxVQUFrQixFQUFFLE1BQTJCO1FBQ25FLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFFLE1BQU0sS0FBSyxHQUFHLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQTtRQUM5QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQTtRQUMvQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTSxLQUFLLENBQUMsWUFBWTtRQUN4QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDcEMsQ0FBQztJQVdPLEtBQUssQ0FBQyxZQUFZO1FBQ3pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUN0RCxNQUFNLGdDQUFnQyxHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQTtRQUUvRSxNQUFNLHFCQUFxQixHQUFHLHdCQUF3QixDQUNyRCxJQUFJLEVBQ0osTUFBTSxDQUFDLFNBQVMsRUFDaEIsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNsQix5Q0FBeUM7WUFDekMsSUFBSSxRQUEwRCxDQUFBO1lBQzlELElBQUksUUFBMEQsQ0FBQTtZQUU5RCxNQUFNLGtCQUFrQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7WUFFaEQsSUFBSSxDQUFDO2dCQUNKLENBQUM7Z0JBQUEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO29CQUN6QyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO29CQUN0RixDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2lCQUN0RixDQUFDLENBQUE7Z0JBQ0YsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2pDLENBQUM7Z0JBQ0QsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2pDLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWiw4REFBOEQ7Z0JBQzlELE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hCLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNwQixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBRUQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUUsQ0FBQTtZQUM3QyxNQUFNLE1BQU0sR0FBNkM7Z0JBQ3hELG1CQUFtQixFQUFFLENBQUM7Z0JBQ3RCLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLGVBQWU7Z0JBQzFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLGVBQWU7Z0JBQzFDLFdBQVcsRUFBRSxDQUFDLENBQUMsV0FBVztnQkFDMUIsSUFBSSxPQUFPO29CQUNWLE9BQU87d0JBQ04sR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQzt3QkFDbEUsR0FBRyxjQUFjLENBQUMsZ0NBQWdDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUNwQyxDQUFBO2dCQUMvQixDQUFDO2dCQUNELGtCQUFrQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDekIsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ3JFLElBQ0MsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUM7d0JBQ3JDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLEVBQ3hDLENBQUM7d0JBQ0YsQ0FBQyxFQUFFLENBQUE7b0JBQ0osQ0FBQztnQkFDRixDQUFDLENBQUM7YUFDSCxDQUFBO1lBQ0QsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNyRixDQUFDLEVBQ0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUM3RSxDQUFBO1FBRUQsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUNoQyxXQUFXLEVBQ1gsU0FBUyxDQUNULENBQUE7UUFFRCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ2hELG9DQUFvQztZQUNwQyxNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkQsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzVDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDM0MsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkMsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsR0FBRyw2QkFBNkIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN4RCxNQUFNLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUUzQixNQUFNLE1BQU0sR0FBd0M7WUFDbkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUU7WUFDMUIsU0FBUyxFQUFFLElBQUksa0NBQWtDLENBQUMsU0FBUyxDQUFDO1lBQzVELFdBQVcsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVc7U0FDdkMsQ0FBQTtRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQWNRLE9BQU8sQ0FBQyxVQUE2QztRQUM3RCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMvQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLFVBQVUsWUFBWSxzQkFBb0IsRUFBRSxDQUFDO1lBQ2hELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxVQUFVLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ2pGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFtQ1EsT0FBTztRQUNmLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQWEsRUFBRSxPQUFrQztRQUNwRSxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNqRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFUSxNQUFNLENBQUMsS0FBc0IsRUFBRSxPQUF3QjtRQUMvRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBWU8sS0FBSyxDQUFDLGNBQWMsQ0FDM0IsSUFBdUIsRUFDdkIsS0FBc0IsRUFDdEIsT0FBdUM7UUFFdkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ3ZELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hCLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO2dCQUM1QyxNQUFNLGNBQWMsR0FDbkIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRO29CQUM5QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQyw4QkFBOEI7Z0JBRWpGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztvQkFDakIsY0FBYzt3QkFDYixDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU07NEJBQ2hCLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQzs0QkFDekQsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDO3dCQUM1RCxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtvQkFDcEIsSUFBSSxLQUFLLE1BQU07d0JBQ2QsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDO3dCQUN6RCxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUM7aUJBQzVELENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQzs7QUE1Vlcsb0JBQW9CO0lBZ0Y5QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLCtCQUErQixDQUFBO0lBRS9CLFdBQUEsZ0JBQWdCLENBQUE7R0F0Rk4sb0JBQW9CLENBMFdoQzs7QUFNRDs7R0FFRztBQUNILE1BQU0sbUJBQW1CO0lBTXhCLFlBQ2tCLE1BQWdCLEVBQ2hCLGdCQUFxQyxFQUNyQyxZQUFtQztRQUZuQyxXQUFNLEdBQU4sTUFBTSxDQUFVO1FBQ2hCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBcUI7UUFDckMsaUJBQVksR0FBWixZQUFZLENBQXVCO1FBUjdDLFdBQU0sR0FBRyxDQUFDLENBQUE7UUFDRCxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUE7UUEwQ3JELHVCQUFrQixHQUFHLENBQUMsQ0FBSSxFQUFFLEVBQUU7WUFDOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osS0FBSyxNQUFNLFFBQVEsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDL0IsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNaLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO0lBMUNFLENBQUM7SUFFRyxhQUFhLENBQUMsTUFBWTtRQUNoQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDbkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNyQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNuQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7Z0JBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMvQixDQUFDO1lBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUVwQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDYixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQy9ELENBQUM7WUFFRCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7b0JBQ2IsTUFBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDeEIsSUFBSSxNQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDMUIsQ0FBQztvQkFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7b0JBRWIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUN2QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLENBQUE7d0JBQ2xDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUE7b0JBQ3BDLENBQUM7Z0JBQ0YsQ0FBQzthQUNELENBQUE7UUFDRixDQUFDLENBQUE7SUFDRixDQUFDO0NBV0Q7QUFFRCxTQUFTLFVBQVUsQ0FDbEIsZ0JBQWdFLEVBQ2hFLGVBQWlDLEVBQ2pDLEdBQVE7SUFFUixPQUFPLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FDcEUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FDNUIsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLFVBQWlEO0lBSWxGLE9BQU87UUFDTixRQUFRLEVBQUUsQ0FBQyxDQUFDLFVBQVU7UUFDdEIsZUFBZSxFQUFFLE9BQU8sVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTO0tBQ3pFLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsYUFBbUM7SUFDMUQsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRTNELHNFQUFzRTtJQUN0RSxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUN4QyxNQUFNLHVCQUF1QixHQUF1QixTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRXZGLGdKQUFnSjtRQUNoSix1QkFBdUIsQ0FBQyxZQUFZLEdBQUcsdUJBQXVCLENBQUMsUUFBUSxDQUFBO1FBQ3ZFLE9BQU8sdUJBQXVCLENBQUMsUUFBUSxDQUFBO1FBRXZDLGdKQUFnSjtRQUNoSix1QkFBdUIsQ0FBQyxZQUFZLEdBQXlDLENBQzVFLHVCQUF1QixDQUFDLFFBQVEsQ0FDaEMsQ0FBQTtRQUNELE9BQU8sdUJBQXVCLENBQUMsUUFBUSxDQUFBO1FBRXZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBQ0QsT0FBTyxtQkFBbUIsQ0FBQTtBQUMzQixDQUFDO0FBRU0sSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBb0MsU0FBUSxVQUFVO2FBQ2xELE9BQUUsR0FBRywyQ0FBMkMsQUFBOUMsQ0FBOEM7SUFFaEUsWUFDeUIscUJBQTZDLEVBQzlDLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsY0FBYyxDQUNuQyxHQUFHLEVBQ0g7WUFDQyxFQUFFLEVBQUUsMEJBQTBCLENBQUMsRUFBRTtZQUNqQyxLQUFLLEVBQUUsMEJBQTBCLENBQUMsV0FBVztZQUM3QyxNQUFNLEVBQUUsMEJBQTBCLENBQUMsbUJBQW1CO1lBQ3RELFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxPQUFPO1NBQzFDLEVBQ0QsRUFBRSxFQUNGO1lBQ0MsMEJBQTBCLEVBQUUsQ0FDM0IsZUFBOEMsRUFDckIsRUFBRTtnQkFDM0IsT0FBTztvQkFDTixNQUFNLEVBQUUsb0JBQW9CLENBQUMsZ0NBQWdDLENBQzVELGVBQWUsRUFDZixvQkFBb0IsQ0FDcEI7aUJBQ0QsQ0FBQTtZQUNGLENBQUM7U0FDRCxDQUNELENBQ0QsQ0FBQTtJQUNGLENBQUM7O0FBakNXLG1DQUFtQztJQUk3QyxXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEscUJBQXFCLENBQUE7R0FMWCxtQ0FBbUMsQ0FrQy9DOztBQWNELE1BQU0sT0FBTyx5QkFBeUI7SUFDckMsWUFBWSxDQUFDLE1BQW1CO1FBQy9CLE9BQU8sTUFBTSxZQUFZLG9CQUFvQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQTtJQUNyRSxDQUFDO0lBRUQsU0FBUyxDQUFDLE1BQTRCO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsV0FBVyxDQUNWLG9CQUEyQyxFQUMzQyxnQkFBd0I7UUFFeEIsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFvQyxDQUFBO1lBQ3ZFLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdEIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9