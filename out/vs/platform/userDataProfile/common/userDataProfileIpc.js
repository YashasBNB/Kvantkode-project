/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { reviveProfile, } from './userDataProfile.js';
import { transformIncomingURIs, transformOutgoingURIs, } from '../../../base/common/uriIpc.js';
export class RemoteUserDataProfilesServiceChannel {
    constructor(service, getUriTransformer) {
        this.service = service;
        this.getUriTransformer = getUriTransformer;
    }
    listen(context, event) {
        const uriTransformer = this.getUriTransformer(context);
        switch (event) {
            case 'onDidChangeProfiles':
                return Event.map(this.service.onDidChangeProfiles, (e) => {
                    return {
                        all: e.all.map((p) => transformOutgoingURIs({ ...p }, uriTransformer)),
                        added: e.added.map((p) => transformOutgoingURIs({ ...p }, uriTransformer)),
                        removed: e.removed.map((p) => transformOutgoingURIs({ ...p }, uriTransformer)),
                        updated: e.updated.map((p) => transformOutgoingURIs({ ...p }, uriTransformer)),
                    };
                });
        }
        throw new Error(`Invalid listen ${event}`);
    }
    async call(context, command, args) {
        const uriTransformer = this.getUriTransformer(context);
        switch (command) {
            case 'createProfile': {
                const profile = await this.service.createProfile(args[0], args[1], args[2]);
                return transformOutgoingURIs({ ...profile }, uriTransformer);
            }
            case 'updateProfile': {
                let profile = reviveProfile(transformIncomingURIs(args[0], uriTransformer), this.service.profilesHome.scheme);
                profile = await this.service.updateProfile(profile, args[1]);
                return transformOutgoingURIs({ ...profile }, uriTransformer);
            }
            case 'removeProfile': {
                const profile = reviveProfile(transformIncomingURIs(args[0], uriTransformer), this.service.profilesHome.scheme);
                return this.service.removeProfile(profile);
            }
        }
        throw new Error(`Invalid call ${command}`);
    }
}
export class UserDataProfilesService extends Disposable {
    get defaultProfile() {
        return this.profiles[0];
    }
    get profiles() {
        return this._profiles;
    }
    constructor(profiles, profilesHome, channel) {
        super();
        this.profilesHome = profilesHome;
        this.channel = channel;
        this._profiles = [];
        this._onDidChangeProfiles = this._register(new Emitter());
        this.onDidChangeProfiles = this._onDidChangeProfiles.event;
        this._profiles = profiles.map((profile) => reviveProfile(profile, this.profilesHome.scheme));
        this._register(this.channel.listen('onDidChangeProfiles')((e) => {
            const added = e.added.map((profile) => reviveProfile(profile, this.profilesHome.scheme));
            const removed = e.removed.map((profile) => reviveProfile(profile, this.profilesHome.scheme));
            const updated = e.updated.map((profile) => reviveProfile(profile, this.profilesHome.scheme));
            this._profiles = e.all.map((profile) => reviveProfile(profile, this.profilesHome.scheme));
            this._onDidChangeProfiles.fire({ added, removed, updated, all: this.profiles });
        }));
        this.onDidResetWorkspaces = this.channel.listen('onDidResetWorkspaces');
    }
    async createNamedProfile(name, options, workspaceIdentifier) {
        const result = await this.channel.call('createNamedProfile', [
            name,
            options,
            workspaceIdentifier,
        ]);
        return reviveProfile(result, this.profilesHome.scheme);
    }
    async createProfile(id, name, options, workspaceIdentifier) {
        const result = await this.channel.call('createProfile', [
            id,
            name,
            options,
            workspaceIdentifier,
        ]);
        return reviveProfile(result, this.profilesHome.scheme);
    }
    async createTransientProfile(workspaceIdentifier) {
        const result = await this.channel.call('createTransientProfile', [
            workspaceIdentifier,
        ]);
        return reviveProfile(result, this.profilesHome.scheme);
    }
    async setProfileForWorkspace(workspaceIdentifier, profile) {
        await this.channel.call('setProfileForWorkspace', [
            workspaceIdentifier,
            profile,
        ]);
    }
    removeProfile(profile) {
        return this.channel.call('removeProfile', [profile]);
    }
    async updateProfile(profile, updateOptions) {
        const result = await this.channel.call('updateProfile', [
            profile,
            updateOptions,
        ]);
        return reviveProfile(result, this.profilesHome.scheme);
    }
    resetWorkspaces() {
        return this.channel.call('resetWorkspaces');
    }
    cleanUp() {
        return this.channel.call('cleanUp');
    }
    cleanUpTransientProfiles() {
        return this.channel.call('cleanUpTransientProfiles');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL2NvbW1vbi91c2VyRGF0YVByb2ZpbGVJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHOUQsT0FBTyxFQU1OLGFBQWEsR0FDYixNQUFNLHNCQUFzQixDQUFBO0FBRTdCLE9BQU8sRUFFTixxQkFBcUIsRUFDckIscUJBQXFCLEdBQ3JCLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkMsTUFBTSxPQUFPLG9DQUFvQztJQUNoRCxZQUNrQixPQUFpQyxFQUNqQyxpQkFBMkQ7UUFEM0QsWUFBTyxHQUFQLE9BQU8sQ0FBMEI7UUFDakMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEwQztJQUMxRSxDQUFDO0lBRUosTUFBTSxDQUFDLE9BQVksRUFBRSxLQUFhO1FBQ2pDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0RCxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxxQkFBcUI7Z0JBQ3pCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FDZixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUNoQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUNMLE9BQU87d0JBQ04sR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7d0JBQ3RFLEtBQUssRUFB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