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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ISCMViewService, ISCMService, } from '../common/scm.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SCMMenus } from './menus.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { debounce } from '../../../../base/common/decorators.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { compareFileNames, comparePaths } from '../../../../base/common/comparers.js';
import { basename } from '../../../../base/common/resources.js';
import { binarySearch } from '../../../../base/common/arrays.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { derivedObservableWithCache, derivedOpts, latestChangedValue, observableFromEventOpts, observableValue, } from '../../../../base/common/observable.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
function getProviderStorageKey(provider) {
    return `${provider.contextValue}:${provider.label}${provider.rootUri ? `:${provider.rootUri.toString()}` : ''}`;
}
function getRepositoryName(workspaceContextService, repository) {
    if (!repository.provider.rootUri) {
        return repository.provider.label;
    }
    const folder = workspaceContextService.getWorkspaceFolder(repository.provider.rootUri);
    return folder?.uri.toString() === repository.provider.rootUri.toString()
        ? folder.name
        : basename(repository.provider.rootUri);
}
export const RepositoryContextKeys = {
    RepositorySortKey: new RawContextKey('scmRepositorySortKey', "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */),
};
let RepositoryPicker = class RepositoryPicker {
    constructor(_placeHolder, _autoQuickItemDescription, _quickInputService, _scmViewService) {
        this._placeHolder = _placeHolder;
        this._autoQuickItemDescription = _autoQuickItemDescription;
        this._quickInputService = _quickInputService;
        this._scmViewService = _scmViewService;
        this._autoQuickPickItem = {
            label: localize('auto', 'Auto'),
            description: this._autoQuickItemDescription,
            repository: 'auto',
        };
    }
    async pickRepository() {
        const picks = [
            this._autoQuickPickItem,
            { type: 'separator' },
        ];
        picks.push(...this._scmViewService.repositories.map((r) => ({
            label: r.provider.name,
            description: r.provider.rootUri?.fsPath,
            iconClass: ThemeIcon.asClassName(Codicon.repo),
            repository: r,
        })));
        return this._quickInputService.pick(picks, { placeHolder: this._placeHolder });
    }
};
RepositoryPicker = __decorate([
    __param(2, IQuickInputService),
    __param(3, ISCMViewService)
], RepositoryPicker);
export { RepositoryPicker };
let SCMViewService = class SCMViewService {
    get repositories() {
        return this._repositories.map((r) => r.repository);
    }
    get visibleRepositories() {
        // In order to match the legacy behaviour, when the repositories are sorted by discovery time,
        // the visible repositories are sorted by the selection index instead of the discovery time.
        if (this._repositoriesSortKey === "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */) {
            return this._repositories
                .filter((r) => r.selectionIndex !== -1)
                .sort((r1, r2) => r1.selectionIndex - r2.selectionIndex)
                .map((r) => r.repository);
        }
        return this._repositories.filter((r) => r.selectionIndex !== -1).map((r) => r.repository);
    }
    set visibleRepositories(visibleRepositories) {
        const set = new Set(visibleRepositories);
        const added = new Set();
        const removed = new Set();
        for (const repositoryView of this._repositories) {
            // Selected -> !Selected
            if (!set.has(repositoryView.repository) && repositoryView.selectionIndex !== -1) {
                repositoryView.selectionIndex = -1;
                removed.add(repositoryView.repository);
            }
            // Selected | !Selected -> Selected
            if (set.has(repositoryView.repository)) {
                if (repositoryView.selectionIndex === -1) {
                    added.add(repositoryView.repository);
                }
                repositoryView.selectionIndex = visibleRepositories.indexOf(repositoryView.repository);
            }
        }
        if (added.size === 0 && removed.size === 0) {
            return;
        }
        this._onDidSetVisibleRepositories.fire({ added, removed });
        // Update focus if the focused repository is not visible anymore
        if (this._repositories.find((r) => r.focused && r.selectionIndex === -1)) {
            this.focus(this._repositories.find((r) => r.selectionIndex !== -1)?.repository);
        }
    }
    get focusedRepository() {
        return this._repositories.find((r) => r.focused)?.repository;
    }
    constructor(scmService, contextKeyService, editorService, extensionService, instantiationService, configurationService, storageService, workspaceContextService) {
        this.scmService = scmService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.storageService = storageService;
        this.workspaceContextService = workspaceContextService;
        this.didFinishLoading = false;
        this.didSelectRepository = false;
        this.disposables = new DisposableStore();
        this._repositories = [];
        this._onDidChangeRepositories = new Emitter();
        this.onDidChangeRepositories = this._onDidChangeRepositories.event;
        this._onDidSetVisibleRepositories = new Emitter();
        this.onDidChangeVisibleRepositories = Event.any(this._onDidSetVisibleRepositories.event, Event.debounce(this._onDidChangeRepositories.event, (last, e) => {
            if (!last) {
                return e;
            }
            const added = new Set(last.added);
            const removed = new Set(last.removed);
            for (const repository of e.added) {
                if (removed.has(repository)) {
                    removed.delete(repository);
                }
                else {
                    added.add(repository);
                }
            }
            for (const repository of e.removed) {
                if (added.has(repository)) {
                    added.delete(repository);
                }
                else {
                    removed.add(repository);
                }
            }
            return { added, removed };
        }, 0, undefined, undefined, undefined, this.disposables));
        this._onDidFocusRepository = new Emitter();
        this.onDidFocusRepository = this._onDidFocusRepository.event;
        this.menus = instantiationService.createInstance(SCMMenus);
        this._focusedRepositoryObs = observableFromEventOpts({
            owner: this,
            equalsFn: () => false,
        }, this.onDidFocusRepository, () => this.focusedRepository);
        this._activeEditorObs = observableFromEventOpts({
            owner: this,
            equalsFn: () => false,
        }, this.editorService.onDidActiveEditorChange, () => this.editorService.activeEditor);
        this._activeEditorRepositoryObs = derivedObservableWithCache(this, (reader, lastValue) => {
            const activeEditor = this._activeEditorObs.read(reader);
            const activeResource = EditorResourceAccessor.getOriginalUri(activeEditor);
            if (!activeResource) {
                return lastValue;
            }
            const repository = this.scmService.getRepository(activeResource);
            if (!repository) {
                return lastValue;
            }
            return Object.create(repository);
        });
        this._activeRepositoryPinnedObs = observableValue(this, undefined);
        this._activeRepositoryObs = latestChangedValue(this, [
            this._activeEditorRepositoryObs,
            this._focusedRepositoryObs,
        ]);
        this.activeRepository = derivedOpts({
            owner: this,
            equalsFn: (r1, r2) => r1?.id === r2?.id,
        }, (reader) => {
            const activeRepository = this._activeRepositoryObs.read(reader);
            const activeRepositoryPinned = this._activeRepositoryPinnedObs.read(reader);
            return activeRepositoryPinned ?? activeRepository;
        });
        try {
            this.previousState = JSON.parse(storageService.get('scm:view:visibleRepositories', 1 /* StorageScope.WORKSPACE */, ''));
        }
        catch {
            // noop
        }
        this._repositoriesSortKey = this.previousState?.sortKey ?? this.getViewSortOrder();
        this._sortKeyContextKey = RepositoryContextKeys.RepositorySortKey.bindTo(contextKeyService);
        this._sortKeyContextKey.set(this._repositoriesSortKey);
        scmService.onDidAddRepository(this.onDidAddRepository, this, this.disposables);
        scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposables);
        for (const repository of scmService.repositories) {
            this.onDidAddRepository(repository);
        }
        storageService.onWillSaveState(this.onWillSaveState, this, this.disposables);
        // Maintain repository selection when the extension host restarts.
        // Extension host is restarted after installing an extension update
        // or during a profile switch.
        extensionService.onWillStop(() => {
            this.onWillSaveState();
            this.didFinishLoading = false;
        }, this, this.disposables);
    }
    onDidAddRepository(repository) {
        if (!this.didFinishLoading) {
            this.eventuallyFinishLoading();
        }
        const repositoryView = {
            repository,
            discoveryTime: Date.now(),
            focused: false,
            selectionIndex: -1,
        };
        let removed = Iterable.empty();
        if (this.previousState && !this.didFinishLoading) {
            const index = this.previousState.all.indexOf(getProviderStorageKey(repository.provider));
            if (index === -1) {
                // This repository is not part of the previous state which means that it
                // was either manually closed in the previous session, or the repository
                // was added after the previous session.In this case, we should select all
                // of the repositories.
                const added = [];
                this.insertRepositoryView(this._repositories, repositoryView);
                this._repositories.forEach((repositoryView, index) => {
                    if (repositoryView.selectionIndex === -1) {
                        added.push(repositoryView.repository);
                    }
                    repositoryView.selectionIndex = index;
                });
                this._onDidChangeRepositories.fire({ added, removed: Iterable.empty() });
                this.didSelectRepository = false;
                return;
            }
            if (this.previousState.visible.indexOf(index) === -1) {
                // Explicit selection started
                if (this.didSelectRepository) {
                    this.insertRepositoryView(this._repositories, repositoryView);
                    this._onDidChangeRepositories.fire({ added: Iterable.empty(), removed: Iterable.empty() });
                    return;
                }
            }
            else {
                // First visible repository
                if (!this.didSelectRepository) {
                    removed = [...this.visibleRepositories];
                    this._repositories.forEach((r) => {
                        r.focused = false;
                        r.selectionIndex = -1;
                    });
                    this.didSelectRepository = true;
                }
            }
        }
        const maxSelectionIndex = this.getMaxSelectionIndex();
        this.insertRepositoryView(this._repositories, {
            ...repositoryView,
            selectionIndex: maxSelectionIndex + 1,
        });
        this._onDidChangeRepositories.fire({ added: [repositoryView.repository], removed });
        if (!this._repositories.find((r) => r.focused)) {
            this.focus(repository);
        }
    }
    onDidRemoveRepository(repository) {
        if (!this.didFinishLoading) {
            this.eventuallyFinishLoading();
        }
        const repositoriesIndex = this._repositories.findIndex((r) => r.repository === repository);
        if (repositoriesIndex === -1) {
            return;
        }
        let added = Iterable.empty();
        const repositoryView = this._repositories.splice(repositoriesIndex, 1);
        if (this._repositories.length > 0 && this.visibleRepositories.length === 0) {
            this._repositories[0].selectionIndex = 0;
            added = [this._repositories[0].repository];
        }
        this._onDidChangeRepositories.fire({ added, removed: repositoryView.map((r) => r.repository) });
        if (repositoryView.length === 1 &&
            repositoryView[0].focused &&
            this.visibleRepositories.length > 0) {
            this.focus(this.visibleRepositories[0]);
        }
    }
    isVisible(repository) {
        return this._repositories.find((r) => r.repository === repository)?.selectionIndex !== -1;
    }
    toggleVisibility(repository, visible) {
        if (typeof visible === 'undefined') {
            visible = !this.isVisible(repository);
        }
        else if (this.isVisible(repository) === visible) {
            return;
        }
        if (visible) {
            this.visibleRepositories = [...this.visibleRepositories, repository];
        }
        else {
            const index = this.visibleRepositories.indexOf(repository);
            if (index > -1) {
                this.visibleRepositories = [
                    ...this.visibleRepositories.slice(0, index),
                    ...this.visibleRepositories.slice(index + 1),
                ];
            }
        }
    }
    toggleSortKey(sortKey) {
        this._repositoriesSortKey = sortKey;
        this._sortKeyContextKey.set(this._repositoriesSortKey);
        this._repositories.sort(this.compareRepositories.bind(this));
        this._onDidChangeRepositories.fire({ added: Iterable.empty(), removed: Iterable.empty() });
    }
    focus(repository) {
        if (repository && !this.isVisible(repository)) {
            return;
        }
        this._repositories.forEach((r) => (r.focused = r.repository === repository));
        if (this._repositories.find((r) => r.focused)) {
            this._onDidFocusRepository.fire(repository);
        }
    }
    pinActiveRepository(repository) {
        this._activeRepositoryPinnedObs.set(repository, undefined);
    }
    compareRepositories(op1, op2) {
        // Sort by discovery time
        if (this._repositoriesSortKey === "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */) {
            return op1.discoveryTime - op2.discoveryTime;
        }
        // Sort by path
        if (this._repositoriesSortKey === 'path' &&
            op1.repository.provider.rootUri &&
            op2.repository.provider.rootUri) {
            return comparePaths(op1.repository.provider.rootUri.fsPath, op2.repository.provider.rootUri.fsPath);
        }
        // Sort by name, path
        const name1 = getRepositoryName(this.workspaceContextService, op1.repository);
        const name2 = getRepositoryName(this.workspaceContextService, op2.repository);
        const nameComparison = compareFileNames(name1, name2);
        if (nameComparison === 0 &&
            op1.repository.provider.rootUri &&
            op2.repository.provider.rootUri) {
            return comparePaths(op1.repository.provider.rootUri.fsPath, op2.repository.provider.rootUri.fsPath);
        }
        return nameComparison;
    }
    getMaxSelectionIndex() {
        return this._repositories.length === 0
            ? -1
            : Math.max(...this._repositories.map((r) => r.selectionIndex));
    }
    getViewSortOrder() {
        const sortOder = this.configurationService.getValue('scm.repositories.sortOrder');
        switch (sortOder) {
            case 'discovery time':
                return "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */;
            case 'name':
                return "name" /* ISCMRepositorySortKey.Name */;
            case 'path':
                return "path" /* ISCMRepositorySortKey.Path */;
            default:
                return "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */;
        }
    }
    insertRepositoryView(repositories, repositoryView) {
        const index = binarySearch(repositories, repositoryView, this.compareRepositories.bind(this));
        repositories.splice(index < 0 ? ~index : index, 0, repositoryView);
    }
    onWillSaveState() {
        if (!this.didFinishLoading) {
            // don't remember state, if the workbench didn't really finish loading
            return;
        }
        const all = this.repositories.map((r) => getProviderStorageKey(r.provider));
        const visible = this.visibleRepositories.map((r) => all.indexOf(getProviderStorageKey(r.provider)));
        this.previousState = { all, sortKey: this._repositoriesSortKey, visible };
        this.storageService.store('scm:view:visibleRepositories', JSON.stringify(this.previousState), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    eventuallyFinishLoading() {
        this.finishLoading();
    }
    finishLoading() {
        if (this.didFinishLoading) {
            return;
        }
        this.didFinishLoading = true;
    }
    dispose() {
        this.disposables.dispose();
        this._onDidChangeRepositories.dispose();
        this._onDidSetVisibleRepositories.dispose();
    }
};
__decorate([
    debounce(5000)
], SCMViewService.prototype, "eventuallyFinishLoading", null);
SCMViewService = __decorate([
    __param(0, ISCMService),
    __param(1, IContextKeyService),
    __param(2, IEditorService),
    __param(3, IExtensionService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, IStorageService),
    __param(7, IWorkspaceContextService)
], SCMViewService);
export { SCMViewService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtVmlld1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9zY21WaWV3U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sZUFBZSxFQUVmLFdBQVcsR0FLWCxNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3JDLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFB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