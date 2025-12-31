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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IUserDataProfilesService, reviveProfile, } from '../../userDataProfile/common/userDataProfile.js';
import { UserDataSyncError, } from './userDataSync.js';
function reviewSyncResource(syncResource, userDataProfilesService) {
    return {
        ...syncResource,
        profile: reviveProfile(syncResource.profile, userDataProfilesService.profilesHome.scheme),
    };
}
function reviewSyncResourceHandle(syncResourceHandle) {
    return { created: syncResourceHandle.created, uri: URI.revive(syncResourceHandle.uri) };
}
export class UserDataSyncServiceChannel {
    constructor(service, userDataProfilesService, logService) {
        this.service = service;
        this.userDataProfilesService = userDataProfilesService;
        this.logService = logService;
        this.manualSyncTasks = new Map();
        this.onManualSynchronizeResources = new Emitter();
    }
    listen(_, event) {
        switch (event) {
            // sync
            case 'onDidChangeStatus':
                return this.service.onDidChangeStatus;
            case 'onDidChangeConflicts':
                return this.service.onDidChangeConflicts;
            case 'onDidChangeLocal':
                return this.service.onDidChangeLocal;
            case 'onDidChangeLastSyncTime':
                return this.service.onDidChangeLastSyncTime;
            case 'onSyncErrors':
                return this.service.onSyncErrors;
            case 'onDidResetLocal':
                return this.service.onDidResetLocal;
            case 'onDidResetRemote':
                return this.service.onDidResetRemote;
            // manual sync
            case 'manualSync/onSynchronizeResources':
                return this.onManualSynchronizeResources.event;
        }
        throw new Error(`[UserDataSyncServiceChannel] Event not found: ${event}`);
    }
    async call(context, command, args) {
        try {
            const result = await this._call(context, command, args);
            return result;
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    async _call(context, command, args) {
        switch (command) {
            // sync
            case '_getInitialData':
                return Promise.resolve([
                    this.service.status,
                    this.service.conflicts,
                    this.service.lastSyncTime,
                ]);
            case 'reset':
                return this.service.reset();
            case 'resetRemote':
                return this.service.resetRemote();
            case 'resetLocal':
                return this.service.resetLocal();
            case 'hasPreviouslySynced':
                return this.service.hasPreviouslySynced();
            case 'hasLocalData':
                return this.service.hasLocalData();
            case 'resolveContent':
                return this.service.resolveContent(URI.revive(args[0]));
            case 'accept':
                return this.service.accept(reviewSyncResource(args[0], this.userDataProfilesService), URI.revive(args[1]), args[2], args[3]);
            case 'replace':
                return this.service.replace(reviewSyncResourceHandle(args[0]));
            case 'cleanUpRemoteData':
                return this.service.cleanUpRemoteData();
            case 'getRemoteActivityData':
                return this.service.saveRemoteActivityData(URI.revive(args[0]));
            case 'extractActivityData':
                return this.service.extractActivityData(URI.revive(args[0]), URI.revive(args[1]));
            case 'createManualSyncTask':
                return this.createManualSyncTask();
        }
        // manual sync
        if (command.startsWith('manualSync/')) {
            const manualSyncTaskCommand = command.substring('manualSync/'.length);
            const manualSyncTaskId = args[0];
            const manualSyncTask = this.getManualSyncTask(manualSyncTaskId);
            args = args.slice(1);
            switch (manualSyncTaskCommand) {
                case 'merge':
                    return manualSyncTask.merge();
                case 'apply':
                    return manualSyncTask
                        .apply()
                        .then(() => this.manualSyncTasks.delete(this.createKey(manualSyncTask.id)));
                case 'stop':
                    return manualSyncTask
                        .stop()
                        .finally(() => this.manualSyncTasks.delete(this.createKey(manualSyncTask.id)));
            }
        }
        throw new Error('Invalid call');
    }
    getManualSyncTask(manualSyncTaskId) {
        const manualSyncTask = this.manualSyncTasks.get(this.createKey(manualSyncTaskId));
        if (!manualSyncTask) {
            throw new Error(`Manual sync taks not found: ${manualSyncTaskId}`);
        }
        return manualSyncTask;
    }
    async createManualSyncTask() {
        const manualSyncTask = await this.service.createManualSyncTask();
        this.manualSyncTasks.set(this.createKey(manualSyncTask.id), manualSyncTask);
        return manualSyncTask.id;
    }
    createKey(manualSyncTaskId) {
        return `manualSyncTask-${manualSyncTaskId}`;
    }
}
let UserDataSyncServiceChannelClient = class UserDataSyncServiceChannelClient extends Disposable {
    get status() {
        return this._status;
    }
    get onDidChangeLocal() {
        return this.channel.listen('onDidChangeLocal');
    }
    get conflicts() {
        return this._conflicts;
    }
    get lastSyncTime() {
        return this._lastSyncTime;
    }
    get onDidResetLocal() {
        return this.channel.listen('onDidResetLocal');
    }
    get onDidResetRemote() {
        return this.channel.listen('onDidResetRemote');
    }
    constructor(userDataSyncChannel, userDataProfilesService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this._status = "uninitialized" /* SyncStatus.Uninitialized */;
        this._onDidChangeStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._conflicts = [];
        this._onDidChangeConflicts = this._register(new Emitter());
        this.onDidChangeConflicts = this._onDidChangeConflicts.event;
        this._lastSyncTime = undefined;
        this._onDidChangeLastSyncTime = this._register(new Emitter());
        this.onDidChangeLastSyncTime = this._onDidChangeLastSyncTime.event;
        this._onSyncErrors = this._register(new Emitter());
        this.onSyncErrors = this._onSyncErrors.event;
        this.channel = {
            call(command, arg, cancellationToken) {
                return userDataSyncChannel.call(command, arg, cancellationToken).then(null, (error) => {
                    throw UserDataSyncError.toUserDataSyncError(error);
                });
            },
            listen(event, arg) {
                return userDataSyncChannel.listen(event, arg);
            },
        };
        this.channel
            .call('_getInitialData')
            .then(([status, conflicts, lastSyncTime]) => {
            this.updateStatus(status);
            this.updateConflicts(conflicts);
            if (lastSyncTime) {
                this.updateLastSyncTime(lastSyncTime);
            }
            this._register(this.channel.listen('onDidChangeStatus')((status) => this.updateStatus(status)));
            this._register(this.channel.listen('onDidChangeLastSyncTime')((lastSyncTime) => this.updateLastSyncTime(lastSyncTime)));
        });
        this._register(this.channel.listen('onDidChangeConflicts')((conflicts) => this.updateConflicts(conflicts)));
        this._register(this.channel.listen('onSyncErrors')((errors) => this._onSyncErrors.fire(errors.map((syncError) => ({
            ...syncError,
            error: UserDataSyncError.toUserDataSyncError(syncError.error),
        })))));
    }
    createSyncTask() {
        throw new Error('not supported');
    }
    async createManualSyncTask() {
        const id = await this.channel.call('createManualSyncTask');
        const that = this;
        const manualSyncTaskChannelClient = new ManualSyncTaskChannelClient(id, {
            async call(command, arg, cancellationToken) {
                return that.channel.call(`manualSync/${command}`, [id, ...(Array.isArray(arg) ? arg : [arg])], cancellationToken);
            },
            listen() {
                throw new Error('not supported');
            },
        });
        return manualSyncTaskChannelClient;
    }
    reset() {
        return this.channel.call('reset');
    }
    resetRemote() {
        return this.channel.call('resetRemote');
    }
    resetLocal() {
        return this.channel.call('resetLocal');
    }
    hasPreviouslySynced() {
        return this.channel.call('hasPreviouslySynced');
    }
    hasLocalData() {
        return this.channel.call('hasLocalData');
    }
    accept(syncResource, resource, content, apply) {
        return this.channel.call('accept', [syncResource, resource, content, apply]);
    }
    resolveContent(resource) {
        return this.channel.call('resolveContent', [resource]);
    }
    cleanUpRemoteData() {
        return this.channel.call('cleanUpRemoteData');
    }
    replace(syncResourceHandle) {
        return this.channel.call('replace', [syncResourceHandle]);
    }
    saveRemoteActivityData(location) {
        return this.channel.call('getRemoteActivityData', [location]);
    }
    extractActivityData(activityDataResource, location) {
        return this.channel.call('extractActivityData', [activityDataResource, location]);
    }
    async updateStatus(status) {
        this._status = status;
        this._onDidChangeStatus.fire(status);
    }
    async updateConflicts(conflicts) {
        // Revive URIs
        this._conflicts = conflicts.map((syncConflict) => ({
            syncResource: syncConflict.syncResource,
            profile: reviveProfile(syncConflict.profile, this.userDataProfilesService.profilesHome.scheme),
            conflicts: syncConflict.conflicts.map((r) => ({
                ...r,
                baseResource: URI.revive(r.baseResource),
                localResource: URI.revive(r.localResource),
                remoteResource: URI.revive(r.remoteResource),
                previewResource: URI.revive(r.previewResource),
            })),
        }));
        this._onDidChangeConflicts.fire(this._conflicts);
    }
    updateLastSyncTime(lastSyncTime) {
        if (this._lastSyncTime !== lastSyncTime) {
            this._lastSyncTime = lastSyncTime;
            this._onDidChangeLastSyncTime.fire(lastSyncTime);
        }
    }
};
UserDataSyncServiceChannelClient = __decorate([
    __param(1, IUserDataProfilesService)
], UserDataSyncServiceChannelClient);
export { UserDataSyncServiceChannelClient };
class ManualSyncTaskChannelClient extends Disposable {
    constructor(id, channel) {
        super();
        this.id = id;
        this.channel = channel;
    }
    async merge() {
        return this.channel.call('merge');
    }
    async apply() {
        return this.channel.call('apply');
    }
    stop() {
        return this.channel.call('stop');
    }
    dispose() {
        this.channel.call('dispose');
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jU2VydmljZUlwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUdqRCxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGFBQWEsR0FDYixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFVTixpQkFBaUIsR0FDakIsTUFBTSxtQkFBbUIsQ0FBQTtBQUkxQixTQUFTLGtCQUFrQixDQUMxQixZQUFtQyxFQUNuQyx1QkFBaUQ7SUFFakQsT0FBTztRQUNOLEdBQUcsWUFBWTtRQUNmLE9BQU8sRUFBRSxhQUFhLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO0tBQ3pGLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxrQkFBdUM7SUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQTtBQUN4RixDQUFDO0FBRUQsTUFBTSxPQUFPLDBCQUEwQjtJQU10QyxZQUNrQixPQUE2QixFQUM3Qix1QkFBaUQsRUFDakQsVUFBdUI7UUFGdkIsWUFBTyxHQUFQLE9BQU8sQ0FBc0I7UUFDN0IsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtR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