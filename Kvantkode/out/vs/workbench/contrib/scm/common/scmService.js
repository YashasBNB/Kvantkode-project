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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2NvbW1vbi9zY21TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBT04sb0JBQW9CLEdBR3BCLE1BQU0sVUFBVSxDQUFBO0FBQ2pCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFbkUsTUFBTSxRQUFTLFNBQVEsVUFBVTtJQUdoQyxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQU9ELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBSSxXQUFXLENBQUMsV0FBbUI7UUFDbEMsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUE7UUFDL0IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBT0QsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFnQjtRQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUN2QixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFPRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLE9BQWdCO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUtELFFBQVE7UUFDUCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUtELHFCQUFxQixDQUFDLE9BQWlDLEVBQUUsSUFBeUI7UUFDakYsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQVFELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQUksYUFBYSxDQUFDLGFBQThCO1FBQy9DLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO1FBQ25DLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN0QyxDQUFDO0lBUUQsWUFDVSxVQUEwQixFQUNsQixPQUF3QjtRQUV6QyxLQUFLLEVBQUUsQ0FBQTtRQUhFLGVBQVUsR0FBVixVQUFVLENBQWdCO1FBQ2xCLFlBQU8sR0FBUCxPQUFPLENBQWlCO1FBckZsQyxXQUFNLEdBQUcsRUFBRSxDQUFBO1FBTUYsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBd0IsQ0FBQTtRQUMxRCxnQkFBVyxHQUFnQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUVuRSxpQkFBWSxHQUFHLEVBQUUsQ0FBQTtRQVdSLDRCQUF1QixHQUFHLElBQUksT0FBTyxFQUFVLENBQUE7UUFDdkQsMkJBQXNCLEdBQWtCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUE7UUFFM0UsYUFBUSxHQUFHLElBQUksQ0FBQTtRQVdOLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFXLENBQUE7UUFDdkQsMEJBQXFCLEdBQW1CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFFMUUsYUFBUSxHQUFHLElBQUksQ0FBQTtRQVdOLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFXLENBQUE7UUFDdkQsMEJBQXFCLEdBQW1CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFNakUsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUMvQyxxQkFBZ0IsR0FBZ0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQU1wRCxrQ0FBNkIsR0FBRyxJQUFJLE9BQU8sRUFBb0IsQ0FBQTtRQUN2RSxpQ0FBNEIsR0FDcEMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQTtRQUVqQyxtQkFBYyxHQUFvQixHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBV3pELDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDdkQsNkJBQXdCLEdBQWdCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUE7UUFHN0UscUJBQWdCLEdBQVksS0FBSyxDQUFBO1FBUXhDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssRUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUNoQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3hDLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtnQkFDakIsQ0FBQztnQkFFRCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO29CQUMzQixLQUFLLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtnQkFDL0IsQ0FBQztnQkFFRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO1lBQzlCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLGlCQUFpQjtZQUNqQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3pELENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQWEsRUFBRSxTQUFrQixFQUFFLE1BQTZCO1FBQ3hFLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7UUFDN0IsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLE9BQU07UUFDUCxDQUFDO2FBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNwQyxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsd0JBQXdCO1FBQ3ZCLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ2pCLENBQUM7YUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNwRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3BDLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFTyxTQUFTO1FBQ2hCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDMUUsQ0FBQztDQUNEO0FBRUQsTUFBTSxhQUFhO0lBRWxCLElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBT0QsWUFDaUIsRUFBVSxFQUNWLFFBQXNCLEVBQ3JCLFdBQTRCLEVBQzdDLFlBQTZCO1FBSGIsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUNWLGFBQVEsR0FBUixRQUFRLENBQWM7UUFDckIsZ0JBQVcsR0FBWCxXQUFXLENBQWlCO1FBYnRDLGNBQVMsR0FBRyxLQUFLLENBQUE7UUFLUiwwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBVyxDQUFBO1FBQ3RELHlCQUFvQixHQUFtQixJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO1FBVS9FLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBaUI7UUFDNUIsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7UUFDekIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLG9CQUFvQjtJQUExQjtRQUNTLHNCQUFpQixHQUFHLEtBQUssQ0FBQTtJQU9sQyxDQUFDO0lBTkEsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQztJQUNELHNCQUFzQjtRQUNyQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFBO0lBQzlCLENBQUM7Q0FDRDtBQUVELElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7SUFPcEIsWUFDa0IsY0FBdUMsRUFDOUIsdUJBQXlEO1FBRDFELG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN0Qiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBUm5FLGdCQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWtELENBQUE7UUFFckUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQXdCLENBQUMsQ0FBQTtRQUN0RixzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBTXpELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUUxQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FDNUMsYUFBYSxrQ0FFYixFQUFFLENBQ0YsQ0FBQTtRQUVELEtBQUssTUFBTSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDekQsSUFBSSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUV6RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDeEIsaUJBQWlCLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQTtnQkFDckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUE7WUFDckQsQ0FBQztZQUVELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDckIsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUNuQixJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixpQ0FFbkMsYUFBYSxFQUNiLElBQUksQ0FBQyxXQUFXLENBQ2hCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNQLElBQUksQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLGFBQWEsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FDeEMsYUFBYSxrQ0FFYixFQUFFLENBQ0YsQ0FBQTtnQkFFRCxLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUNwRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQTtvQkFFbkQsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7d0JBQ2xELE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3ZCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQ25CLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDekMsTUFBTSxLQUFLLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFBO1lBQ3hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFbkMsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGFBQWE7UUFDcEIsTUFBTSxHQUFHLEdBQThCLEVBQUUsQ0FBQTtRQUV6QyxLQUFLLE1BQU0sQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakUsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNqRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyw2REFBNkMsQ0FBQTtJQUMxRixDQUFDO0lBRUQsVUFBVSxDQUFDLGFBQXFCLEVBQUUsT0FBWTtRQUM3QyxJQUFJLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRXpELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3hCLGlCQUFpQixHQUFHLElBQUksV0FBVyxFQUFFLENBQUE7WUFDckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDckQsQ0FBQztRQUVELElBQUksT0FBTyxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUU1QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQzFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVELDhEQUE4RDtJQUM5RCx1SEFBdUg7SUFDL0csY0FBYztRQUNyQixJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtRQUM5QixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUNsQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksa0VBQWlELEVBQ3pFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUNyQyxDQUFBO1FBRUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLHFDQUE0QixFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUM1RixNQUFNLEtBQUssR0FBRywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBRW5ELElBQ0MsQ0FBQyxLQUFLO29CQUNOLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDO29CQUN0QyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxFQUMxQyxDQUFDO29CQUNGLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLENBQUE7b0JBQ3pELFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxNQUFNLENBQUMsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFBO2dCQUN6QyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUVsQyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUM5RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQTtvQkFFdkQsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFtQixDQUFDLEVBQUUsQ0FBQzt3QkFDekUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDdkIsQ0FBQztvQkFFRCxrQkFBa0IsR0FBRyxJQUFJLENBQUE7b0JBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLENBQUE7Z0JBQzFELENBQUM7WUFDRixDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLENBQUE7WUFDMUQsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLGtCQUFrQixDQUFBO0lBQzFCLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0NBQ0QsQ0FBQTtBQXJKSyxlQUFlO0lBUWxCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSx3QkFBd0IsQ0FBQTtHQVRyQixlQUFlLENBcUpwQjtBQUVNLElBQU0sVUFBVSxHQUFoQixNQUFNLFVBQVU7SUFJdEIsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ25DLENBQUM7SUFDRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQTtJQUMvQixDQUFDO0lBWUQsWUFDYyxVQUF3QyxFQUMzQix1QkFBaUQsRUFDdkQsaUJBQXFDLEVBQ3hDLGNBQStCLEVBQzNCLGtCQUF3RDtRQUovQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBSWYsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQXZCOUUsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQSxDQUFDLGdCQUFnQjtRQVlqRCxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBa0IsQ0FBQTtRQUN6RCx1QkFBa0IsR0FBMEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQUVoRSx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBa0IsQ0FBQTtRQUM1RCwwQkFBcUIsR0FBMEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtRQVN0RixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksZUFBZSxDQUFDLGNBQWMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBRWhGLElBQUksQ0FBQyxhQUFhLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdkYsQ0FBQztJQUVELG1CQUFtQixDQUFDLFFBQXNCO1FBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7UUFFdkQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixRQUFRLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXpDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxFQUFFO1lBQ2pDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUNwRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUN6QyxDQUFDLE1BQU0sQ0FBQTtRQUNULENBQUMsQ0FBQTtRQUVELFdBQVcsQ0FBQyxHQUFHLENBQ2QsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNqQixJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUUxQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9DLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzNGLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFL0MsV0FBVyxDQUFDLEdBQUcsQ0FDZCxXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7WUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUE7UUFDdEQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUE7UUFFckQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUV2QyxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBSUQsYUFBYSxDQUFDLFlBQTBCO1FBQ3ZDLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM1QyxDQUFDO1FBRUQsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDMUYsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksY0FBYyxHQUErQixTQUFTLENBQUE7UUFDMUQsSUFBSSxlQUFlLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFBO1FBRTlDLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzVDLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFBO1lBRXhDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUU1RSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxlQUFlLEVBQUUsQ0FBQztnQkFDbEUsY0FBYyxHQUFHLFVBQVUsQ0FBQTtnQkFDM0IsZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLGNBQWMsQ0FBQTtJQUN0QixDQUFDO0NBQ0QsQ0FBQTtBQTNHWSxVQUFVO0lBc0JwQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsbUJBQW1CLENBQUE7R0ExQlQsVUFBVSxDQTJHdEIifQ==