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
import { Barrier } from '../../../base/common/async.js';
import { isUriComponents, URI } from '../../../base/common/uri.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { observableValue, observableValueOpts, transaction, } from '../../../base/common/observable.js';
import { DisposableStore, combinedDisposable, dispose, Disposable, } from '../../../base/common/lifecycle.js';
import { ISCMService, ISCMViewService, } from '../../contrib/scm/common/scm.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { IQuickDiffService } from '../../contrib/scm/common/quickDiff.js';
import { ResourceTree } from '../../../base/common/resourceTree.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { basename } from '../../../base/common/resources.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ITextModelService, } from '../../../editor/common/services/resolverService.js';
import { Schemas } from '../../../base/common/network.js';
import { structuralEquals } from '../../../base/common/equals.js';
import { historyItemBaseRefColor, historyItemRefColor, historyItemRemoteRefColor, } from '../../contrib/scm/browser/scmHistory.js';
function getIconFromIconDto(iconDto) {
    if (iconDto === undefined) {
        return undefined;
    }
    else if (ThemeIcon.isThemeIcon(iconDto)) {
        return iconDto;
    }
    else if (isUriComponents(iconDto)) {
        return URI.revive(iconDto);
    }
    else {
        const icon = iconDto;
        return { light: URI.revive(icon.light), dark: URI.revive(icon.dark) };
    }
}
function toISCMHistoryItem(historyItemDto) {
    const authorIcon = getIconFromIconDto(historyItemDto.authorIcon);
    const references = historyItemDto.references?.map((r) => ({
        ...r,
        icon: getIconFromIconDto(r.icon),
    }));
    return { ...historyItemDto, authorIcon, references };
}
function toISCMHistoryItemRef(historyItemRefDto, color) {
    return historyItemRefDto
        ? { ...historyItemRefDto, icon: getIconFromIconDto(historyItemRefDto.icon), color: color }
        : undefined;
}
class SCMInputBoxContentProvider extends Disposable {
    constructor(textModelService, modelService, languageService) {
        super();
        this.modelService = modelService;
        this.languageService = languageService;
        this._register(textModelService.registerTextModelContentProvider(Schemas.vscodeSourceControl, this));
    }
    async provideTextContent(resource) {
        const existing = this.modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        return this.modelService.createModel('', this.languageService.createById('scminput'), resource);
    }
}
class MainThreadSCMResourceGroup {
    get resourceTree() {
        if (!this._resourceTree) {
            const rootUri = this.provider.rootUri ?? URI.file('/');
            this._resourceTree = new ResourceTree(this, rootUri, this._uriIdentService.extUri);
            for (const resource of this.resources) {
                this._resourceTree.add(resource.sourceUri, resource);
            }
        }
        return this._resourceTree;
    }
    get hideWhenEmpty() {
        return !!this.features.hideWhenEmpty;
    }
    get contextValue() {
        return this.features.contextValue;
    }
    constructor(sourceControlHandle, handle, provider, features, label, id, multiDiffEditorEnableViewChanges, _uriIdentService) {
        this.sourceControlHandle = sourceControlHandle;
        this.handle = handle;
        this.provider = provider;
        this.features = features;
        this.label = label;
        this.id = id;
        this.multiDiffEditorEnableViewChanges = multiDiffEditorEnableViewChanges;
        this._uriIdentService = _uriIdentService;
        this.resources = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeResources = new Emitter();
        this.onDidChangeResources = this._onDidChangeResources.event;
    }
    toJSON() {
        return {
            $mid: 4 /* MarshalledId.ScmResourceGroup */,
            sourceControlHandle: this.sourceControlHandle,
            groupHandle: this.handle,
        };
    }
    splice(start, deleteCount, toInsert) {
        this.resources.splice(start, deleteCount, ...toInsert);
        this._resourceTree = undefined;
        this._onDidChangeResources.fire();
    }
    $updateGroup(features) {
        this.features = { ...this.features, ...features };
        this._onDidChange.fire();
    }
    $updateGroupLabel(label) {
        this.label = label;
        this._onDidChange.fire();
    }
}
class MainThreadSCMResource {
    constructor(proxy, sourceControlHandle, groupHandle, handle, sourceUri, resourceGroup, decorations, contextValue, command, multiDiffEditorOriginalUri, multiDiffEditorModifiedUri) {
        this.proxy = proxy;
        this.sourceControlHandle = sourceControlHandle;
        this.groupHandle = groupHandle;
        this.handle = handle;
        this.sourceUri = sourceUri;
        this.resourceGroup = resourceGroup;
        this.decorations = decorations;
        this.contextValue = contextValue;
        this.command = command;
        this.multiDiffEditorOriginalUri = multiDiffEditorOriginalUri;
        this.multiDiffEditorModifiedUri = multiDiffEditorModifiedUri;
    }
    open(preserveFocus) {
        return this.proxy.$executeResourceCommand(this.sourceControlHandle, this.groupHandle, this.handle, preserveFocus);
    }
    toJSON() {
        return {
            $mid: 3 /* MarshalledId.ScmResource */,
            sourceControlHandle: this.sourceControlHandle,
            groupHandle: this.groupHandle,
            handle: this.handle,
        };
    }
}
class MainThreadSCMHistoryProvider {
    get historyItemRef() {
        return this._historyItemRef;
    }
    get historyItemRemoteRef() {
        return this._historyItemRemoteRef;
    }
    get historyItemBaseRef() {
        return this._historyItemBaseRef;
    }
    get historyItemRefChanges() {
        return this._historyItemRefChanges;
    }
    constructor(proxy, handle) {
        this.proxy = proxy;
        this.handle = handle;
        this._historyItemRef = observableValueOpts({
            owner: this,
            equalsFn: structuralEquals,
        }, undefined);
        this._historyItemRemoteRef = observableValueOpts({
            owner: this,
            equalsFn: structuralEquals,
        }, undefined);
        this._historyItemBaseRef = observableValueOpts({
            owner: this,
            equalsFn: structuralEquals,
        }, undefined);
        this._historyItemRefChanges = observableValue(this, {
            added: [],
            modified: [],
            removed: [],
            silent: false,
        });
    }
    async resolveHistoryItemRefsCommonAncestor(historyItemRefs) {
        return this.proxy.$resolveHistoryItemRefsCommonAncestor(this.handle, historyItemRefs, CancellationToken.None);
    }
    async provideHistoryItemRefs(historyItemsRefs) {
        const historyItemRefs = await this.proxy.$provideHistoryItemRefs(this.handle, historyItemsRefs, CancellationToken.None);
        return historyItemRefs?.map((ref) => ({ ...ref, icon: getIconFromIconDto(ref.icon) }));
    }
    async provideHistoryItems(options) {
        const historyItems = await this.proxy.$provideHistoryItems(this.handle, options, CancellationToken.None);
        return historyItems?.map((historyItem) => toISCMHistoryItem(historyItem));
    }
    async provideHistoryItemChanges(historyItemId, historyItemParentId) {
        const changes = await this.proxy.$provideHistoryItemChanges(this.handle, historyItemId, historyItemParentId, CancellationToken.None);
        return changes?.map((change) => ({
            uri: URI.revive(change.uri),
            originalUri: change.originalUri && URI.revive(change.originalUri),
            modifiedUri: change.modifiedUri && URI.revive(change.modifiedUri),
        }));
    }
    $onDidChangeCurrentHistoryItemRefs(historyItemRef, historyItemRemoteRef, historyItemBaseRef) {
        transaction((tx) => {
            this._historyItemRef.set(toISCMHistoryItemRef(historyItemRef, historyItemRefColor), tx);
            this._historyItemRemoteRef.set(toISCMHistoryItemRef(historyItemRemoteRef, historyItemRemoteRefColor), tx);
            this._historyItemBaseRef.set(toISCMHistoryItemRef(historyItemBaseRef, historyItemBaseRefColor), tx);
        });
    }
    $onDidChangeHistoryItemRefs(historyItemRefs) {
        const added = historyItemRefs.added.map((ref) => toISCMHistoryItemRef(ref));
        const modified = historyItemRefs.modified.map((ref) => toISCMHistoryItemRef(ref));
        const removed = historyItemRefs.removed.map((ref) => toISCMHistoryItemRef(ref));
        this._historyItemRefChanges.set({ added, modified, removed, silent: historyItemRefs.silent }, undefined);
    }
}
class MainThreadSCMProvider {
    static { this.ID_HANDLE = 0; }
    get id() {
        return this._id;
    }
    get handle() {
        return this._handle;
    }
    get label() {
        return this._label;
    }
    get rootUri() {
        return this._rootUri;
    }
    get inputBoxTextModel() {
        return this._inputBoxTextModel;
    }
    get contextValue() {
        return this._providerId;
    }
    get acceptInputCommand() {
        return this.features.acceptInputCommand;
    }
    get count() {
        return this._count;
    }
    get statusBarCommands() {
        return this._statusBarCommands;
    }
    get name() {
        return this._name ?? this._label;
    }
    get commitTemplate() {
        return this._commitTemplate;
    }
    get actionButton() {
        return this._actionButton;
    }
    get historyProvider() {
        return this._historyProvider;
    }
    constructor(proxy, _handle, _providerId, _label, _rootUri, _inputBoxTextModel, _quickDiffService, _uriIdentService, _workspaceContextService) {
        this.proxy = proxy;
        this._handle = _handle;
        this._providerId = _providerId;
        this._label = _label;
        this._rootUri = _rootUri;
        this._inputBoxTextModel = _inputBoxTextModel;
        this._quickDiffService = _quickDiffService;
        this._uriIdentService = _uriIdentService;
        this._workspaceContextService = _workspaceContextService;
        this._id = `scm${MainThreadSCMProvider.ID_HANDLE++}`;
        this.groups = [];
        this._onDidChangeResourceGroups = new Emitter();
        this.onDidChangeResourceGroups = this._onDidChangeResourceGroups.event;
        this._onDidChangeResources = new Emitter();
        this.onDidChangeResources = this._onDidChangeResources.event;
        this._groupsByHandle = Object.create(null);
        // get groups(): ISequence<ISCMResourceGroup> {
        // 	return {
        // 		elements: this._groups,
        // 		onDidSplice: this._onDidSplice.event
        // 	};
        // 	// return this._groups
        // 	// 	.filter(g => g.resources.elements.length > 0 || !g.features.hideWhenEmpty);
        // }
        this.features = {};
        this._count = observableValue(this, undefined);
        this._statusBarCommands = observableValue(this, undefined);
        this._commitTemplate = observableValue(this, '');
        this._actionButton = observableValue(this, undefined);
        this.isSCM = true;
        this.visible = true;
        this._historyProvider = observableValue(this, undefined);
        if (_rootUri) {
            const folder = this._workspaceContextService.getWorkspaceFolder(_rootUri);
            if (folder?.uri.toString() === _rootUri.toString()) {
                this._name = folder.name;
            }
            else if (_rootUri.path !== '/') {
                this._name = basename(_rootUri);
            }
        }
    }
    $updateSourceControl(features) {
        this.features = { ...this.features, ...features };
        if (typeof features.commitTemplate !== 'undefined') {
            this._commitTemplate.set(features.commitTemplate, undefined);
        }
        if (typeof features.actionButton !== 'undefined') {
            this._actionButton.set(features.actionButton ?? undefined, undefined);
        }
        if (typeof features.count !== 'undefined') {
            this._count.set(features.count, undefined);
        }
        if (typeof features.statusBarCommands !== 'undefined') {
            this._statusBarCommands.set(features.statusBarCommands, undefined);
        }
        if (features.hasQuickDiffProvider && !this._quickDiff) {
            this._quickDiff = this._quickDiffService.addQuickDiffProvider({
                label: features.quickDiffLabel ?? this.label,
                rootUri: this.rootUri,
                isSCM: this.isSCM,
                visible: this.visible,
                getOriginalResource: (uri) => this.getOriginalResource(uri),
            });
        }
        else if (features.hasQuickDiffProvider === false && this._quickDiff) {
            this._quickDiff.dispose();
            this._quickDiff = undefined;
        }
        if (features.hasHistoryProvider && !this.historyProvider.get()) {
            const historyProvider = new MainThreadSCMHistoryProvider(this.proxy, this.handle);
            this._historyProvider.set(historyProvider, undefined);
        }
        else if (features.hasHistoryProvider === false && this.historyProvider.get()) {
            this._historyProvider.set(undefined, undefined);
        }
    }
    $registerGroups(_groups) {
        const groups = _groups.map(([handle, id, label, features, multiDiffEditorEnableViewChanges]) => {
            const group = new MainThreadSCMResourceGroup(this.handle, handle, this, features, label, id, multiDiffEditorEnableViewChanges, this._uriIdentService);
            this._groupsByHandle[handle] = group;
            return group;
        });
        this.groups.splice(this.groups.length, 0, ...groups);
        this._onDidChangeResourceGroups.fire();
    }
    $updateGroup(handle, features) {
        const group = this._groupsByHandle[handle];
        if (!group) {
            return;
        }
        group.$updateGroup(features);
    }
    $updateGroupLabel(handle, label) {
        const group = this._groupsByHandle[handle];
        if (!group) {
            return;
        }
        group.$updateGroupLabel(label);
    }
    $spliceGroupResourceStates(splices) {
        for (const [groupHandle, groupSlices] of splices) {
            const group = this._groupsByHandle[groupHandle];
            if (!group) {
                console.warn(`SCM group ${groupHandle} not found in provider ${this.label}`);
                continue;
            }
            // reverse the splices sequence in order to apply them correctly
            groupSlices.reverse();
            for (const [start, deleteCount, rawResources] of groupSlices) {
                const resources = rawResources.map((rawResource) => {
                    const [handle, sourceUri, icons, tooltip, strikeThrough, faded, contextValue, command, multiDiffEditorOriginalUri, multiDiffEditorModifiedUri,] = rawResource;
                    const [light, dark] = icons;
                    const icon = ThemeIcon.isThemeIcon(light) ? light : URI.revive(light);
                    const iconDark = (ThemeIcon.isThemeIcon(dark) ? dark : URI.revive(dark)) || icon;
                    const decorations = {
                        icon: icon,
                        iconDark: iconDark,
                        tooltip,
                        strikeThrough,
                        faded,
                    };
                    return new MainThreadSCMResource(this.proxy, this.handle, groupHandle, handle, URI.revive(sourceUri), group, decorations, contextValue || undefined, command, URI.revive(multiDiffEditorOriginalUri), URI.revive(multiDiffEditorModifiedUri));
                });
                group.splice(start, deleteCount, resources);
            }
        }
        this._onDidChangeResources.fire();
    }
    $unregisterGroup(handle) {
        const group = this._groupsByHandle[handle];
        if (!group) {
            return;
        }
        delete this._groupsByHandle[handle];
        this.groups.splice(this.groups.indexOf(group), 1);
        this._onDidChangeResourceGroups.fire();
    }
    async getOriginalResource(uri) {
        if (!this.features.hasQuickDiffProvider) {
            return null;
        }
        const result = await this.proxy.$provideOriginalResource(this.handle, uri, CancellationToken.None);
        return result && URI.revive(result);
    }
    $onDidChangeHistoryProviderCurrentHistoryItemRefs(historyItemRef, historyItemRemoteRef, historyItemBaseRef) {
        if (!this.historyProvider.get()) {
            return;
        }
        this._historyProvider
            .get()
            ?.$onDidChangeCurrentHistoryItemRefs(historyItemRef, historyItemRemoteRef, historyItemBaseRef);
    }
    $onDidChangeHistoryProviderHistoryItemRefs(historyItemRefs) {
        if (!this.historyProvider.get()) {
            return;
        }
        this._historyProvider.get()?.$onDidChangeHistoryItemRefs(historyItemRefs);
    }
    toJSON() {
        return {
            $mid: 5 /* MarshalledId.ScmProvider */,
            handle: this.handle,
        };
    }
    dispose() {
        this._quickDiff?.dispose();
    }
}
let MainThreadSCM = class MainThreadSCM {
    constructor(extHostContext, scmService, scmViewService, languageService, modelService, textModelService, quickDiffService, _uriIdentService, workspaceContextService) {
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.textModelService = textModelService;
        this.quickDiffService = quickDiffService;
        this._uriIdentService = _uriIdentService;
        this.workspaceContextService = workspaceContextService;
        this._repositories = new Map();
        this._repositoryBarriers = new Map();
        this._repositoryDisposables = new Map();
        this._disposables = new DisposableStore();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostSCM);
        this._disposables.add(new SCMInputBoxContentProvider(this.textModelService, this.modelService, this.languageService));
    }
    dispose() {
        dispose(this._repositories.values());
        this._repositories.clear();
        dispose(this._repositoryDisposables.values());
        this._repositoryDisposables.clear();
        this._disposables.dispose();
    }
    async $registerSourceControl(handle, id, label, rootUri, inputBoxDocumentUri) {
        this._repositoryBarriers.set(handle, new Barrier());
        const inputBoxTextModelRef = await this.textModelService.createModelReference(URI.revive(inputBoxDocumentUri));
        const provider = new MainThreadSCMProvider(this._proxy, handle, id, label, rootUri ? URI.revive(rootUri) : undefined, inputBoxTextModelRef.object.textEditorModel, this.quickDiffService, this._uriIdentService, this.workspaceContextService);
        const repository = this.scmService.registerSCMProvider(provider);
        this._repositories.set(handle, repository);
        const disposable = combinedDisposable(inputBoxTextModelRef, Event.filter(this.scmViewService.onDidFocusRepository, (r) => r === repository)((_) => this._proxy.$setSelectedSourceControl(handle)), repository.input.onDidChange(({ value }) => this._proxy.$onInputBoxValueChange(handle, value)));
        this._repositoryDisposables.set(handle, disposable);
        if (this.scmViewService.focusedRepository === repository) {
            setTimeout(() => this._proxy.$setSelectedSourceControl(handle), 0);
        }
        if (repository.input.value) {
            setTimeout(() => this._proxy.$onInputBoxValueChange(handle, repository.input.value), 0);
        }
        this._repositoryBarriers.get(handle)?.open();
    }
    async $updateSourceControl(handle, features) {
        await this._repositoryBarriers.get(handle)?.wait();
        const repository = this._repositories.get(handle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$updateSourceControl(features);
    }
    async $unregisterSourceControl(handle) {
        await this._repositoryBarriers.get(handle)?.wait();
        const repository = this._repositories.get(handle);
        if (!repository) {
            return;
        }
        this._repositoryDisposables.get(handle).dispose();
        this._repositoryDisposables.delete(handle);
        repository.dispose();
        this._repositories.delete(handle);
    }
    async $registerGroups(sourceControlHandle, groups, splices) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$registerGroups(groups);
        provider.$spliceGroupResourceStates(splices);
    }
    async $updateGroup(sourceControlHandle, groupHandle, features) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$updateGroup(groupHandle, features);
    }
    async $updateGroupLabel(sourceControlHandle, groupHandle, label) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$updateGroupLabel(groupHandle, label);
    }
    async $spliceResourceStates(sourceControlHandle, splices) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$spliceGroupResourceStates(splices);
    }
    async $unregisterGroup(sourceControlHandle, handle) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$unregisterGroup(handle);
    }
    async $setInputBoxValue(sourceControlHandle, value) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.setValue(value, false);
    }
    async $setInputBoxPlaceholder(sourceControlHandle, placeholder) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.placeholder = placeholder;
    }
    async $setInputBoxEnablement(sourceControlHandle, enabled) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.enabled = enabled;
    }
    async $setInputBoxVisibility(sourceControlHandle, visible) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.visible = visible;
    }
    async $showValidationMessage(sourceControlHandle, message, type) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        repository.input.showValidationMessage(message, type);
    }
    async $setValidationProviderIsEnabled(sourceControlHandle, enabled) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        if (enabled) {
            repository.input.validateInput = async (value, pos) => {
                const result = await this._proxy.$validateInput(sourceControlHandle, value, pos);
                return result && { message: result[0], type: result[1] };
            };
        }
        else {
            repository.input.validateInput = async () => undefined;
        }
    }
    async $onDidChangeHistoryProviderCurrentHistoryItemRefs(sourceControlHandle, historyItemRef, historyItemRemoteRef, historyItemBaseRef) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$onDidChangeHistoryProviderCurrentHistoryItemRefs(historyItemRef, historyItemRemoteRef, historyItemBaseRef);
    }
    async $onDidChangeHistoryProviderHistoryItemRefs(sourceControlHandle, historyItemRefs) {
        await this._repositoryBarriers.get(sourceControlHandle)?.wait();
        const repository = this._repositories.get(sourceControlHandle);
        if (!repository) {
            return;
        }
        const provider = repository.provider;
        provider.$onDidChangeHistoryProviderHistoryItemRefs(historyItemRefs);
    }
};
MainThreadSCM = __decorate([
    extHostNamedCustomer(MainContext.MainThreadSCM),
    __param(1, ISCMService),
    __param(2, ISCMViewService),
    __param(3, ILanguageService),
    __param(4, IModelService),
    __param(5, ITextModelService),
    __param(6, IQuickDiffService),
    __param(7, IUriIdentityService),
    __param(8, IWorkspaceContextService)
], MainThreadSCM);
export { MainThreadSCM };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNDTS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkU0NNLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRixPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFFTixlQUFlLEVBQ2YsbUJBQW1CLEVBQ25CLFdBQVcsR0FDWCxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFFTixlQUFlLEVBQ2Ysa0JBQWtCLEVBQ2xCLE9BQU8sRUFDUCxVQUFVLEdBQ1YsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sV0FBVyxFQU9YLGVBQWUsR0FHZixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFDTixjQUFjLEVBTWQsV0FBVyxHQUlYLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0sdUNBQXVDLENBQUE7QUFTNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFN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