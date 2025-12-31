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
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { SCMInputChangeReason, } from './scm.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { HistoryNavigator2 } from '../../../../base/common/history.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { URI } from '../../../../base/common/uri.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Schemas } from '../../../../base/common/network.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { runOnChange } from '../../../../base/common/observable.js';
class SCMInput extends Disposable {
    get value() {
        return this._value;
    }
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(placeholder) {
        this._placeholder = placeholder;
        this._onDidChangePlaceholder.fire(placeholder);
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(enabled) {
        this._enabled = enabled;
        this._onDidChangeEnablement.fire(enabled);
    }
    get visible() {
        return this._visible;
    }
    set visible(visible) {
        this._visible = visible;
        this._onDidChangeVisibility.fire(visible);
    }
    setFocus() {
        this._onDidChangeFocus.fire();
    }
    showValidationMessage(message, type) {
        this._onDidChangeValidationMessage.fire({ message: message, type: type });
    }
    get validateInput() {
        return this._validateInput;
    }
    set validateInput(validateInput) {
        this._validateInput = validateInput;
        this._onDidChangeValidateInput.fire();
    }
    constructor(repository, history) {
        super();
        this.repository = repository;
        this.history = history;
        this._value = '';
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._placeholder = '';
        this._onDidChangePlaceholder = new Emitter();
        this.onDidChangePlaceholder = this._onDidChangePlaceholder.event;
        this._enabled = true;
        this._onDidChangeEnablement = new Emitter();
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this._visible = true;
        this._onDidChangeVisibility = new Emitter();
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDidChangeFocus = new Emitter();
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidChangeValidationMessage = new Emitter();
        this.onDidChangeValidationMessage = this._onDidChangeValidationMessage.event;
        this._validateInput = () => Promise.resolve(undefined);
        this._onDidChangeValidateInput = new Emitter();
        this.onDidChangeValidateInput = this._onDidChangeValidateInput.event;
        this.didChangeHistory = false;
        if (this.repository.provider.rootUri) {
            this.historyNavigator = history.getHistory(this.repository.provider.label, this.repository.provider.rootUri);
            this._register(this.history.onWillSaveHistory((event) => {
                if (this.historyNavigator.isAtEnd()) {
                    this.saveValue();
                }
                if (this.didChangeHistory) {
                    event.historyDidIndeedChange();
                }
                this.didChangeHistory = false;
            }));
        }
        else {
            // in memory only
            this.historyNavigator = new HistoryNavigator2([''], 100);
        }
        this._value = this.historyNavigator.current();
    }
    setValue(value, transient, reason) {
        if (value === this._value) {
            return;
        }
        if (!transient) {
            this.historyNavigator.replaceLast(this._value);
            this.historyNavigator.add(value);
            this.didChangeHistory = true;
        }
        this._value = value;
        this._onDidChange.fire({ value, reason });
    }
    showNextHistoryValue() {
        if (this.historyNavigator.isAtEnd()) {
            return;
        }
        else if (!this.historyNavigator.has(this.value)) {
            this.saveValue();
            this.historyNavigator.resetCursor();
        }
        const value = this.historyNavigator.next();
        this.setValue(value, true, SCMInputChangeReason.HistoryNext);
    }
    showPreviousHistoryValue() {
        if (this.historyNavigator.isAtEnd()) {
            this.saveValue();
        }
        else if (!this.historyNavigator.has(this._value)) {
            this.saveValue();
            this.historyNavigator.resetCursor();
        }
        const value = this.historyNavigator.previous();
        this.setValue(value, true, SCMInputChangeReason.HistoryPrevious);
    }
    saveValue() {
        const oldValue = this.historyNavigator.replaceLast(this._value);
        this.didChangeHistory = this.didChangeHistory || oldValue !== this._value;
    }
}
class SCMRepository {
    get selected() {
        return this._selected;
    }
    constructor(id, provider, disposables, inputHistory) {
        this.id = id;
        this.provider = provider;
        this.disposables = disposables;
        this._selected = false;
        this._onDidChangeSelection = new Emitter();
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this.input = new SCMInput(this, inputHistory);
    }
    setSelected(selected) {
        if (this._selected === selected) {
            return;
        }
        this._selected = selected;
        this._onDidChangeSelection.fire(selected);
    }
    dispose() {
        this.disposables.dispose();
        this.provider.dispose();
    }
}
class WillSaveHistoryEvent {
    constructor() {
        this._didChangeHistory = false;
    }
    get didChangeHistory() {
        return this._didChangeHistory;
    }
    historyDidIndeedChange() {
        this._didChangeHistory = true;
    }
}
let SCMInputHistory = class SCMInputHistory {
    constructor(storageService, workspaceContextService) {
        this.storageService = storageService;
        this.workspaceContextService = workspaceContextService;
        this.disposables = new DisposableStore();
        this.histories = new Map();
        this._onWillSaveHistory = this.disposables.add(new Emitter());
        this.onWillSaveHistory = this._onWillSaveHistory.event;
        this.histories = new Map();
        const entries = this.storageService.getObject('scm.history', 1 /* StorageScope.WORKSPACE */, []);
        for (const [providerLabel, rootUri, history] of entries) {
            let providerHistories = this.histories.get(providerLabel);
            if (!providerHistories) {
                providerHistories = new ResourceMap();
                this.histories.set(providerLabel, providerHistories);
            }
            providerHistories.set(rootUri, new HistoryNavigator2(history, 100));
        }
        if (this.migrateStorage()) {
            this.saveToStorage();
        }
        this.disposables.add(this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, 'scm.history', this.disposables)((e) => {
            if (e.external && e.key === 'scm.history') {
                const raw = this.storageService.getObject('scm.history', 1 /* StorageScope.WORKSPACE */, []);
                for (const [providerLabel, uri, rawHistory] of raw) {
                    const history = this.getHistory(providerLabel, uri);
                    for (const value of Iterable.reverse(rawHistory)) {
                        history.prepend(value);
                    }
                }
            }
        }));
        this.disposables.add(this.storageService.onWillSaveState((_) => {
            const event = new WillSaveHistoryEvent();
            this._onWillSaveHistory.fire(event);
            if (event.didChangeHistory) {
                this.saveToStorage();
            }
        }));
    }
    saveToStorage() {
        const raw = [];
        for (const [providerLabel, providerHistories] of this.histories) {
            for (const [rootUri, history] of providerHistories) {
                if (!(history.size === 1 && history.current() === '')) {
                    raw.push([providerLabel, rootUri, [...history]]);
                }
            }
        }
        this.storageService.store('scm.history', raw, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    getHistory(providerLabel, rootUri) {
        let providerHistories = this.histories.get(providerLabel);
        if (!providerHistories) {
            providerHistories = new ResourceMap();
            this.histories.set(providerLabel, providerHistories);
        }
        let history = providerHistories.get(rootUri);
        if (!history) {
            history = new HistoryNavigator2([''], 100);
            providerHistories.set(rootUri, history);
        }
        return history;
    }
    // Migrates from Application scope storage to Workspace scope.
    // TODO@joaomoreno: Change from January 2024 onwards such that the only code is to remove all `scm/input:` storage keys
    migrateStorage() {
        let didSomethingChange = false;
        const machineKeys = Iterable.filter(this.storageService.keys(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */), (key) => key.startsWith('scm/input:'));
        for (const key of machineKeys) {
            try {
                const legacyHistory = JSON.parse(this.storageService.get(key, -1 /* StorageScope.APPLICATION */, ''));
                const match = /^scm\/input:([^:]+):(.+)$/.exec(key);
                if (!match ||
                    !Array.isArray(legacyHistory?.history) ||
                    !Number.isInteger(legacyHistory?.timestamp)) {
                    this.storageService.remove(key, -1 /* StorageScope.APPLICATION */);
                    continue;
                }
                const [, providerLabel, rootPath] = match;
                const rootUri = URI.file(rootPath);
                if (this.workspaceContextService.getWorkspaceFolder(rootUri)) {
                    const history = this.getHistory(providerLabel, rootUri);
                    for (const entry of Iterable.reverse(legacyHistory.history)) {
                        history.prepend(entry);
                    }
                    didSomethingChange = true;
                    this.storageService.remove(key, -1 /* StorageScope.APPLICATION */);
                }
            }
            catch {
                this.storageService.remove(key, -1 /* StorageScope.APPLICATION */);
            }
        }
        return didSomethingChange;
    }
    dispose() {
        this.disposables.dispose();
    }
};
SCMInputHistory = __decorate([
    __param(0, IStorageService),
    __param(1, IWorkspaceContextService)
], SCMInputHistory);
let SCMService = class SCMService {
    get repositories() {
        return this._repositories.values();
    }
    get repositoryCount() {
        return this._repositories.size;
    }
    constructor(logService, workspaceContextService, contextKeyService, storageService, uriIdentityService) {
        this.logService = logService;
        this.uriIdentityService = uriIdentityService;
        this._repositories = new Map(); // used in tests
        this._onDidAddProvider = new Emitter();
        this.onDidAddRepository = this._onDidAddProvider.event;
        this._onDidRemoveProvider = new Emitter();
        this.onDidRemoveRepository = this._onDidRemoveProvider.event;
        this.inputHistory = new SCMInputHistory(storageService, workspaceContextService);
        this.providerCount = contextKeyService.createKey('scm.providerCount', 0);
        this.historyProviderCount = contextKeyService.createKey('scm.historyProviderCount', 0);
    }
    registerSCMProvider(provider) {
        this.logService.trace('SCMService#registerSCMProvider');
        if (this._repositories.has(provider.id)) {
            throw new Error(`SCM Provider ${provider.id} already exists.`);
        }
        const disposables = new DisposableStore();
        const historyProviderCount = () => {
            return Array.from(this._repositories.values()).filter((r) => !!r.provider.historyProvider.get()).length;
        };
        disposables.add(toDisposable(() => {
            this._repositories.delete(provider.id);
            this._onDidRemoveProvider.fire(repository);
            this.providerCount.set(this._repositories.size);
            this.historyProviderCount.set(historyProviderCount());
        }));
        const repository = new SCMRepository(provider.id, provider, disposables, this.inputHistory);
        this._repositories.set(provider.id, repository);
        disposables.add(runOnChange(provider.historyProvider, () => {
            this.historyProviderCount.set(historyProviderCount());
        }));
        this.providerCount.set(this._repositories.size);
        this.historyProviderCount.set(historyProviderCount());
        this._onDidAddProvider.fire(repository);
        return repository;
    }
    getRepository(idOrResource) {
        if (typeof idOrResource === 'string') {
            return this._repositories.get(idOrResource);
        }
        if (idOrResource.scheme !== Schemas.file && idOrResource.scheme !== Schemas.vscodeRemote) {
            return undefined;
        }
        let bestRepository = undefined;
        let bestMatchLength = Number.POSITIVE_INFINITY;
        for (const repository of this.repositories) {
            const root = repository.provider.rootUri;
            if (!root) {
                continue;
            }
            const path = this.uriIdentityService.extUri.relativePath(root, idOrResource);
            if (path && !/^\.\./.test(path) && path.length < bestMatchLength) {
                bestRepository = repository;
                bestMatchLength = path.length;
            }
        }
        return bestRepository;
    }
};
SCMService = __decorate([
    __param(0, ILogService),
    __param(1, IWorkspaceContextService),
    __param(2, IContextKeyService),
    __param(3, IStorageService),
    __param(4, IUriIdentityService)
], SCMService);
export { SCMService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9jb21tb24vc2NtU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQU9OLG9CQUFvQixHQUdwQixNQUFNLFVBQVUsQ0FBQTtBQUNqQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRW5FLE1BQU0sUUFBUyxTQUFRLFVBQVU7SUFHaEMsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFPRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUVELElBQUksV0FBVyxDQUFDLFdBQW1CO1FBQ2xDLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFBO1FBQy9CLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQU9ELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsT0FBZ0I7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUE7UUFDdkIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBT0QsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFnQjtRQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUN2QixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFLRCxRQUFRO1FBQ1AsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFLRCxxQkFBcUIsQ0FBQyxPQUFpQyxFQUFFLElBQXlCO1FBQ2pGLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFRRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLGFBQWEsQ0FBQyxhQUE4QjtRQUMvQyxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQTtRQUNuQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDdEMsQ0FBQztJQVFELFlBQ1UsVUFBMEIsRUFDbEIsT0FBd0I7UUFFekMsS0FBSyxFQUFFLENBQUE7UUFIRSxlQUFVLEdBQVYsVUFBVSxDQUFnQjtRQUNsQixZQUFPLEdBQVAsT0FBTyxDQUFpQjtRQXJGbEMsV0FBTSxHQUFHLEVBQUUsQ0FBQTtRQU1GLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQXdCLENBQUE7UUFDMUQsZ0JBQVcsR0FBZ0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFFbkUsaUJBQVksR0FBRyxFQUFFLENBQUE7UUFXUiw0QkFBdUIsR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFBO1FBQ3ZELDJCQUFzQixHQUFrQixJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFBO1FBRTNFLGFBQVEsR0FBRyxJQUFJLENBQUE7UUFXTiwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBVyxDQUFBO1FBQ3ZELDBCQUFxQixHQUFtQixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBRTFFLGFBQVEsR0FBRyxJQUFJLENBQUE7UUFXTiwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBVyxDQUFBO1FBQ3ZELDBCQUFxQixHQUFtQixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBTWpFLHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDL0MscUJBQWdCLEdBQWdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFNcEQsa0NBQTZCLEdBQUcsSUFBSSxPQUFPLEVBQW9CLENBQUE7UUFDdkUsaUNBQTRCLEdBQ3BDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUE7UUFFakMsbUJBQWMsR0FBb0IsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQVd6RCw4QkFBeUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQ3ZELDZCQUF3QixHQUFnQixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFBO1FBRzdFLHFCQUFnQixHQUFZLEtBQUssQ0FBQTtRQVF4QyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQzlCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FDaEMsQ0FBQTtZQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUN4QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO29CQUNyQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7Z0JBQ2pCLENBQUM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDM0IsS0FBSyxDQUFDLHNCQUFzQixFQUFFLENBQUE7Z0JBQy9CLENBQUM7Z0JBRUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtZQUM5QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxpQkFBaUI7WUFDakIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDOUMsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFhLEVBQUUsU0FBa0IsRUFBRSxNQUE2QjtRQUN4RSxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0IsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNoQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO1FBQzdCLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxvQkFBb0I7UUFDbkIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxPQUFNO1FBQ1AsQ0FBQzthQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25ELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtZQUNoQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDcEMsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUMxQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELHdCQUF3QjtRQUN2QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNqQixDQUFDO2FBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNwQyxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzlDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU8sU0FBUztRQUNoQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQzFFLENBQUM7Q0FDRDtBQUVELE1BQU0sYUFBYTtJQUVsQixJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQU9ELFlBQ2lCLEVBQVUsRUFDVixRQUFzQixFQUNyQixXQUE0QixFQUM3QyxZQUE2QjtRQUhiLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDVixhQUFRLEdBQVIsUUFBUSxDQUFjO1FBQ3JCLGdCQUFXLEdBQVgsV0FBVyxDQUFpQjtRQWJ0QyxjQUFTLEdBQUcsS0FBSyxDQUFBO1FBS1IsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQVcsQ0FBQTtRQUN0RCx5QkFBb0IsR0FBbUIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtRQVUvRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWlCO1FBQzVCLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDeEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBb0I7SUFBMUI7UUFDUyxzQkFBaUIsR0FBRyxLQUFLLENBQUE7SUFPbEMsQ0FBQztJQU5BLElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFDRCxzQkFBc0I7UUFDckIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtJQUM5QixDQUFDO0NBQ0Q7QUFFRCxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFlO0lBT3BCLFlBQ2tCLGNBQXVDLEVBQzlCLHVCQUF5RDtRQUQxRCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDdEIsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQVJuRSxnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbkMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFrRCxDQUFBO1FBRXJFLHVCQUFrQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUF3QixDQUFDLENBQUE7UUFDdEYsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQU16RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7UUFFMUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQzVDLGFBQWEsa0NBRWIsRUFBRSxDQUNGLENBQUE7UUFFRCxLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ3pELElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7WUFFekQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3hCLGlCQUFpQixHQUFHLElBQUksV0FBVyxFQUFFLENBQUE7Z0JBQ3JDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1lBQ3JELENBQUM7WUFFRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksaUJBQWlCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3JCLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FDbkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsaUNBRW5DLGFBQWEsRUFDYixJQUFJLENBQUMsV0FBVyxDQUNoQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDUCxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxhQUFhLEVBQUUsQ0FBQztnQkFDM0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQ3hDLGFBQWEsa0NBRWIsRUFBRSxDQUNGLENBQUE7Z0JBRUQsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztvQkFDcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUE7b0JBRW5ELEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO3dCQUNsRCxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUN2QixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUNuQixJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQTtZQUN4QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBRW5DLElBQUksS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxhQUFhO1FBQ3BCLE1BQU0sR0FBRyxHQUE4QixFQUFFLENBQUE7UUFFekMsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pFLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUNwRCxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDdkQsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDakQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsNkRBQTZDLENBQUE7SUFDMUYsQ0FBQztJQUVELFVBQVUsQ0FBQyxhQUFxQixFQUFFLE9BQVk7UUFDN0MsSUFBSSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUV6RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixpQkFBaUIsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFBO1lBQ3JDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFNUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUMxQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFRCw4REFBOEQ7SUFDOUQsdUhBQXVIO0lBQy9HLGNBQWM7UUFDckIsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUE7UUFDOUIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FDbEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLGtFQUFpRCxFQUN6RSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FDckMsQ0FBQTtRQUVELEtBQUssTUFBTSxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDO2dCQUNKLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxxQ0FBNEIsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDNUYsTUFBTSxLQUFLLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUVuRCxJQUNDLENBQUMsS0FBSztvQkFDTixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQztvQkFDdEMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsRUFDMUMsQ0FBQztvQkFDRixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixDQUFBO29CQUN6RCxTQUFRO2dCQUNULENBQUM7Z0JBRUQsTUFBTSxDQUFDLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxHQUFHLEtBQUssQ0FBQTtnQkFDekMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFFbEMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDOUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUE7b0JBRXZELEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBbUIsQ0FBQyxFQUFFLENBQUM7d0JBQ3pFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3ZCLENBQUM7b0JBRUQsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO29CQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixDQUFBO2dCQUMxRCxDQUFDO1lBQ0YsQ0FBQztZQUFDLE1BQU0sQ0FBQztnQkFDUixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixDQUFBO1lBQzFELENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxrQkFBa0IsQ0FBQTtJQUMxQixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDM0IsQ0FBQztDQUNELENBQUE7QUFySkssZUFBZTtJQVFsQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsd0JBQXdCLENBQUE7R0FUckIsZUFBZSxDQXFKcEI7QUFFTSxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFVO0lBSXRCLElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBQ0QsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUE7SUFDL0IsQ0FBQztJQVlELFlBQ2MsVUFBd0MsRUFDM0IsdUJBQWlELEVBQ3ZELGlCQUFxQyxFQUN4QyxjQUErQixFQUMzQixrQkFBd0Q7UUFKL0MsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUlmLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUF2QjlFLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUEsQ0FBQyxnQkFBZ0I7UUFZakQsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUE7UUFDekQsdUJBQWtCLEdBQTBCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFaEUseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUE7UUFDNUQsMEJBQXFCLEdBQTBCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7UUFTdEYsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLGVBQWUsQ0FBQyxjQUFjLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUVoRixJQUFJLENBQUMsYUFBYSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4RSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxRQUFzQjtRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO1FBRXZELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsUUFBUSxDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6QyxNQUFNLG9CQUFvQixHQUFHLEdBQUcsRUFBRTtZQUNqQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FDcEQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FDekMsQ0FBQyxNQUFNLENBQUE7UUFDVCxDQUFDLENBQUE7UUFFRCxXQUFXLENBQUMsR0FBRyxDQUNkLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDakIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ3RDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFFMUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQTtRQUN0RCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMzRixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRS9DLFdBQVcsQ0FBQyxHQUFHLENBQ2QsV0FBVyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1lBQzFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1FBRXJELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFdkMsT0FBTyxVQUFVLENBQUE7SUFDbEIsQ0FBQztJQUlELGFBQWEsQ0FBQyxZQUEwQjtRQUN2QyxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUVELElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzFGLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLGNBQWMsR0FBK0IsU0FBUyxDQUFBO1FBQzFELElBQUksZUFBZSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQTtRQUU5QyxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM1QyxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQTtZQUV4QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFFNUUsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsZUFBZSxFQUFFLENBQUM7Z0JBQ2xFLGNBQWMsR0FBRyxVQUFVLENBQUE7Z0JBQzNCLGVBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxjQUFjLENBQUE7SUFDdEIsQ0FBQztDQUNELENBQUE7QUEzR1ksVUFBVTtJQXNCcEIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0dBMUJULFVBQVUsQ0EyR3RCIn0=