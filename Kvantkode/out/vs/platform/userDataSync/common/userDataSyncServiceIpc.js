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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNTZXJ2aWNlSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBR2pELE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsYUFBYSxHQUNiLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQVVOLGlCQUFpQixHQUNqQixNQUFNLG1CQUFtQixDQUFBO0FBSTFCLFNBQVMsa0JBQWtCLENBQzFCLFlBQW1DLEVBQ25DLHVCQUFpRDtJQUVqRCxPQUFPO1FBQ04sR0FBRyxZQUFZO1FBQ2YsT0FBTyxFQUFFLGFBQWEsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7S0FDekYsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLGtCQUF1QztJQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO0FBQ3hGLENBQUM7QUFFRCxNQUFNLE9BQU8sMEJBQTBCO0lBTXRDLFlBQ2tCLE9BQTZCLEVBQzdCLHVCQUFpRCxFQUNqRCxVQUF1QjtRQUZ2QixZQUFPLEdBQVAsT0FBTyxDQUFzQjtRQUM3Qiw0QkFBdUIsR0FBdkIsdUJBQXVCLENB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