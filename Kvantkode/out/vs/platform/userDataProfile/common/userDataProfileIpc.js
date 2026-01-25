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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvY29tbW9uL3VzZXJEYXRhUHJvZmlsZUlwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc5RCxPQUFPLEVBTU4sYUFBYSxHQUNiLE1BQU0sc0JBQXNCLENBQUE7QUFFN0IsT0FBTyxFQUVOLHFCQUFxQixFQUNyQixxQkFBcUIsR0FDckIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2QyxNQUFNLE9BQU8sb0NBQW9DO0lBQ2hELFlBQ2tCLE9BQWlDLEVBQ2pDLGlCQUEyRDtRQUQzRCxZQUFPLEdBQVAsT0FBTyxDQUEwQjtRQUNqQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQTBDO0lBQzFFLENBQUM7SUFFSixNQUFNLENBQUMsT0FBWSxFQUFFLEtBQWE7UUFDakMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3RELFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLHFCQUFxQjtnQkFDekIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQ2hDLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ0wsT0FBTzt3QkFDTixHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQzt3QkFDdEUsS0FB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