/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
class BaseStorageDatabaseClient extends Disposable {
    constructor(channel, profile, workspace) {
        super();
        this.channel = channel;
        this.profile = profile;
        this.workspace = workspace;
    }
    async getItems() {
        const serializableRequest = {
            profile: this.profile,
            workspace: this.workspace,
        };
        const items = await this.channel.call('getItems', serializableRequest);
        return new Map(items);
    }
    updateItems(request) {
        const serializableRequest = {
            profile: this.profile,
            workspace: this.workspace,
        };
        if (request.insert) {
            serializableRequest.insert = Array.from(request.insert.entries());
        }
        if (request.delete) {
            serializableRequest.delete = Array.from(request.delete.values());
        }
        return this.channel.call('updateItems', serializableRequest);
    }
    optimize() {
        const serializableRequest = {
            profile: this.profile,
            workspace: this.workspace,
        };
        return this.channel.call('optimize', serializableRequest);
    }
}
class BaseProfileAwareStorageDatabaseClient extends BaseStorageDatabaseClient {
    constructor(channel, profile) {
        super(channel, profile, undefined);
        this._onDidChangeItemsExternal = this._register(new Emitter());
        this.onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.channel.listen('onDidChangeStorage', {
            profile: this.profile,
        })((e) => this.onDidChangeStorage(e)));
    }
    onDidChangeStorage(e) {
        if (Array.isArray(e.changed) || Array.isArray(e.deleted)) {
            this._onDidChangeItemsExternal.fire({
                changed: e.changed ? new Map(e.changed) : undefined,
                deleted: e.deleted ? new Set(e.deleted) : undefined,
            });
        }
    }
}
export class ApplicationStorageDatabaseClient extends BaseProfileAwareStorageDatabaseClient {
    constructor(channel) {
        super(channel, undefined);
    }
    async close() {
        // The application storage database is shared across all instances so
        // we do not close it from the window. However we dispose the
        // listener for external changes because we no longer interested in it.
        this.dispose();
    }
}
export class ProfileStorageDatabaseClient extends BaseProfileAwareStorageDatabaseClient {
    constructor(channel, profile) {
        super(channel, profile);
    }
    async close() {
        // The profile storage database is shared across all instances of
        // the same profile so we do not close it from the window.
        // However we dispose the listener for external changes because
        // we no longer interested in it.
        this.dispose();
    }
}
export class WorkspaceStorageDatabaseClient extends BaseStorageDatabaseClient {
    constructor(channel, workspace) {
        super(channel, undefined, workspace);
        this.onDidChangeItemsExternal = Event.None; // unsupported for workspace storage because we only ever write from one window
    }
    async close() {
        // The workspace storage database is only used in this instance
        // but we do not need to close it from here, the main process
        // can take care of that.
        this.dispose();
    }
}
export class StorageClient {
    constructor(channel) {
        this.channel = channel;
    }
    isUsed(path) {
        const serializableRequest = {
            payload: path,
            profile: undefined,
            workspace: undefined,
        };
        return this.channel.call('isUsed', serializableRequest);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvY29tbW9uL3N0b3JhZ2VJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFzRDlELE1BQWUseUJBQTBCLFNBQVEsVUFBVTtJQUcxRCxZQUNXLE9BQWlCLEVBQ2pCLE9BQTZDLEVBQzdDLFNBQThDO1FBRXhELEtBQUssRUFBRSxDQUFBO1FBSkcsWUFBTyxHQUFQLE9BQU8sQ0FBVTtRQUNqQixZQUFPLEdBQVAsT0FBTyxDQUFzQztRQUM3QyxjQUFTLEdBQVQsU0FBUyxDQUFxQztJQUd6RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVE7UUFDYixNQUFNLG1CQUFtQixHQUFvQztZQUM1RCxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1NBQ3pCLENBQUE7UUFDRCxNQUFNLEtBQUssR0FBVyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRTlFLE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUF1QjtRQUNsQyxNQUFNLG1CQUFtQixHQUErQjtZQUN2RCxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1NBQ3pCLENBQUE7UUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDbEUsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNqRSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsUUFBUTtRQUNQLE1BQU0sbUJBQW1CLEdBQW9DO1lBQzVELE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7U0FDekIsQ0FBQTtRQUVELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLG1CQUFtQixDQUFDLENBQUE7SUFDMUQsQ0FBQztDQUdEO0FBRUQsTUFBZSxxQ0FBc0MsU0FBUSx5QkFBeUI7SUFNckYsWUFBWSxPQUFpQixFQUFFLE9BQTZDO1FBQzNFLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBTmxCLDhCQUF5QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzFELElBQUksT0FBTyxFQUE0QixDQUN2QyxDQUFBO1FBQ1EsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtRQUt2RSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQWdDLG9CQUFvQixFQUFFO1lBQ3hFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztTQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFnQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDcEUsQ0FBQTtJQUNGLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxDQUFnQztRQUMxRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQztnQkFDbkMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDbkQsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUzthQUMzRCxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLHFDQUFxQztJQUMxRixZQUFZLE9BQWlCO1FBQzVCLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLO1FBQ1YscUVBQXFFO1FBQ3JFLDZEQUE2RDtRQUM3RCx1RUFBdUU7UUFFdkUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDRCQUE2QixTQUFRLHFDQUFxQztJQUN0RixZQUFZLE9BQWlCLEVBQUUsT0FBaUM7UUFDL0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUs7UUFDVixpRUFBaUU7UUFDakUsMERBQTBEO1FBQzFELCtEQUErRDtRQUMvRCxpQ0FBaUM7UUFFakMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDhCQUNaLFNBQVEseUJBQXlCO0lBS2pDLFlBQVksT0FBaUIsRUFBRSxTQUFrQztRQUNoRSxLQUFLLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUg1Qiw2QkFBd0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBLENBQUMsK0VBQStFO0lBSTlILENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSztRQUNWLCtEQUErRDtRQUMvRCw2REFBNkQ7UUFDN0QseUJBQXlCO1FBRXpCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNmLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxhQUFhO0lBQ3pCLFlBQTZCLE9BQWlCO1FBQWpCLFlBQU8sR0FBUCxPQUFPLENBQVU7SUFBRyxDQUFDO0lBRWxELE1BQU0sQ0FBQyxJQUFZO1FBQ2xCLE1BQU0sbUJBQW1CLEdBQStCO1lBQ3ZELE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLFNBQVM7WUFDbEIsU0FBUyxFQUFFLFNBQVM7U0FDcEIsQ0FBQTtRQUVELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLG1CQUFtQixDQUFDLENBQUE7SUFDeEQsQ0FBQztDQUNEIn0=