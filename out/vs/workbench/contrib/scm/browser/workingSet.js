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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ1NldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3dvcmtpbmdTZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUNOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsT0FBTyxHQUVQLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDekcsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDMUMsT0FBTyxFQUFrQixXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sbURBQW1ELENBQUE7QUFhM0YsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO2FBQ3RDLE9BQUUsR0FBRyxrQ0FBa0MsQUFBckMsQ0FBcUM7SUFPdkQsWUFDd0Isb0JBQTRELEVBQzdELG1CQUEwRCxFQUNuRSxVQUF3QyxFQUNwQyxjQUFnRCxFQUN4QyxhQUF1RDtRQUVoRixLQUFLLEVBQUUsQ0FBQTtRQU5pQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzVDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDbEQsZUFBVSxHQUFWLFVBQVUsQ0FB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