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
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { getProviderKey } from './util.js';
import { ISCMService } from '../common/scm.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
let SCMWorkingSetController = class SCMWorkingSetController extends Disposable {
    static { this.ID = 'workbench.contrib.scmWorkingSets'; }
    constructor(configurationService, editorGroupsService, scmService, storageService, layoutService) {
        super();
        this.configurationService = configurationService;
        this.editorGroupsService = editorGroupsService;
        this.scmService = scmService;
        this.storageService = storageService;
        this.layoutService = layoutService;
        this._repositoryDisposables = new DisposableMap();
        this._enabledConfig = observableConfigValue('scm.workingSets.enabled', false, this.configurationService);
        this._store.add(autorunWithStore((reader, store) => {
            if (!this._enabledConfig.read(reader)) {
                this.storageService.remove('scm.workingSets', 1 /* StorageScope.WORKSPACE */);
                this._repositoryDisposables.clearAndDisposeAll();
                return;
            }
            this._workingSets = this._loadWorkingSets();
            this.scmService.onDidAddRepository(this._onDidAddRepository, this, store);
            this.scmService.onDidRemoveRepository(this._onDidRemoveRepository, this, store);
            for (const repository of this.scmService.repositories) {
                this._onDidAddRepository(repository);
            }
        }));
    }
    _onDidAddRepository(repository) {
        const disposables = new DisposableStore();
        const historyItemRefId = derived((reader) => {
            const historyProvider = repository.provider.historyProvider.read(reader);
            const historyItemRef = historyProvider?.historyItemRef.read(reader);
            return historyItemRef?.id;
        });
        disposables.add(autorun(async (reader) => {
            const historyItemRefIdValue = historyItemRefId.read(reader);
            if (!historyItemRefIdValue) {
                return;
            }
            const providerKey = getProviderKey(repository.provider);
            const repositoryWorkingSets = this._workingSets.get(providerKey);
            if (!repositoryWorkingSets) {
                this._workingSets.set(providerKey, {
                    currentHistoryItemGroupId: historyItemRefIdValue,
                    editorWorkingSets: new Map(),
                });
                return;
            }
            // Editors for the current working set are automatically restored
            if (repositoryWorkingSets.currentHistoryItemGroupId === historyItemRefIdValue) {
                return;
            }
            // Save the working set
            this._saveWorkingSet(providerKey, historyItemRefIdValue, repositoryWorkingSets);
            // Restore the working set
            await this._restoreWorkingSet(providerKey, historyItemRefIdValue);
        }));
        this._repositoryDisposables.set(repository, disposables);
    }
    _onDidRemoveRepository(repository) {
        this._repositoryDisposables.deleteAndDispose(repository);
    }
    _loadWorkingSets() {
        const workingSets = new Map();
        const workingSetsRaw = this.storageService.get('scm.workingSets', 1 /* StorageScope.WORKSPACE */);
        if (!workingSetsRaw) {
            return workingSets;
        }
        for (const serializedWorkingSet of JSON.parse(workingSetsRaw)) {
            workingSets.set(serializedWorkingSet.providerKey, {
                currentHistoryItemGroupId: serializedWorkingSet.currentHistoryItemGroupId,
                editorWorkingSets: new Map(serializedWorkingSet.editorWorkingSets),
            });
        }
        return workingSets;
    }
    _saveWorkingSet(providerKey, currentHistoryItemGroupId, repositoryWorkingSets) {
        const previousHistoryItemGroupId = repositoryWorkingSets.currentHistoryItemGroupId;
        const editorWorkingSets = repositoryWorkingSets.editorWorkingSets;
        const editorWorkingSet = this.editorGroupsService.saveWorkingSet(previousHistoryItemGroupId);
        this._workingSets.set(providerKey, {
            currentHistoryItemGroupId,
            editorWorkingSets: editorWorkingSets.set(previousHistoryItemGroupId, editorWorkingSet),
        });
        // Save to storage
        const workingSets = [];
        for (const [providerKey, { currentHistoryItemGroupId, editorWorkingSets }] of this
            ._workingSets) {
            workingSets.push({
                providerKey,
                currentHistoryItemGroupId,
                editorWorkingSets: [...editorWorkingSets],
            });
        }
        this.storageService.store('scm.workingSets', JSON.stringify(workingSets), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async _restoreWorkingSet(providerKey, currentHistoryItemGroupId) {
        const workingSets = this._workingSets.get(providerKey);
        if (!workingSets) {
            return;
        }
        let editorWorkingSetId = workingSets.editorWorkingSets.get(currentHistoryItemGroupId);
        if (!editorWorkingSetId &&
            this.configurationService.getValue('scm.workingSets.default') === 'empty') {
            editorWorkingSetId = 'empty';
        }
        if (editorWorkingSetId) {
            // Applying a working set can be the result of a user action that has been
            // initiated from the terminal (ex: switching branches). As such, we want
            // to preserve the focus in the terminal. This does not cover the scenario
            // in which the terminal is in the editor part.
            const preserveFocus = this.layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
            await this.editorGroupsService.applyWorkingSet(editorWorkingSetId, { preserveFocus });
        }
    }
    dispose() {
        this._repositoryDisposables.dispose();
        super.dispose();
    }
};
SCMWorkingSetController = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorGroupsService),
    __param(2, ISCMService),
    __param(3, IStorageService),
    __param(4, IWorkbenchLayoutService)
], SCMWorkingSetController);
export { SCMWorkingSetController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ1NldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvd29ya2luZ1NldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEdBRVAsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUN6RyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUMxQyxPQUFPLEVBQWtCLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzlELE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQVMsTUFBTSxtREFBbUQsQ0FBQTtBQWEzRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7YUFDdEMsT0FBRSxHQUFHLGtDQUFrQyxBQUFyQyxDQUFxQztJQU92RCxZQUN3QixvQkFBNEQsRUFDN0QsbUJBQTBELEVBQ25FLFVBQXdDLEVBQ3BDLGNBQWdELEVBQ3hDLGFBQXVEO1FBRWhGLEtBQUssRUFBRSxDQUFBO1FBTmlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDNUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUNsRCxlQUFVLEdBQVYsVUFB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