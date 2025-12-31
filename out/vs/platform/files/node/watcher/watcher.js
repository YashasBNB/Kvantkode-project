/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isRecursiveWatchRequest, } from '../../common/watcher.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ParcelWatcher } from './parcel/parcelWatcher.js';
import { NodeJSWatcher } from './nodejs/nodejsWatcher.js';
import { Promises } from '../../../../base/common/async.js';
import { computeStats } from './watcherStats.js';
export class UniversalWatcher extends Disposable {
    constructor() {
        super();
        this.recursiveWatcher = this._register(new ParcelWatcher());
        this.nonRecursiveWatcher = this._register(new NodeJSWatcher(this.recursiveWatcher));
        this.onDidChangeFile = Event.any(this.recursiveWatcher.onDidChangeFile, this.nonRecursiveWatcher.onDidChangeFile);
        this.onDidError = Event.any(this.recursiveWatcher.onDidError, this.nonRecursiveWatcher.onDidError);
        this._onDidLogMessage = this._register(new Emitter());
        this.onDidLogMessage = Event.any(this._onDidLogMessage.event, this.recursiveWatcher.onDidLogMessage, this.nonRecursiveWatcher.onDidLogMessage);
        this.requests = [];
        this.failedRecursiveRequests = 0;
        this._register(this.recursiveWatcher.onDidError((e) => {
            if (e.request) {
                this.failedRecursiveRequests++;
            }
        }));
    }
    async watch(requests) {
        this.requests = requests;
        this.failedRecursiveRequests = 0;
        // Watch recursively first to give recursive watchers a chance
        // to step in for non-recursive watch requests, thus reducing
        // watcher duplication.
        let error;
        try {
            await this.recursiveWatcher.watch(requests.filter((request) => isRecursiveWatchRequest(request)));
        }
        catch (e) {
            error = e;
        }
        try {
            await this.nonRecursiveWatcher.watch(requests.filter((request) => !isRecursiveWatchRequest(request)));
        }
        catch (e) {
            if (!error) {
                error = e;
            }
        }
        if (error) {
            throw error;
        }
    }
    async setVerboseLogging(enabled) {
        // Log stats
        if (enabled && this.requests.length > 0) {
            this._onDidLogMessage.fire({
                type: 'trace',
                message: computeStats(this.requests, this.failedRecursiveRequests, this.recursiveWatcher, this.nonRecursiveWatcher),
            });
        }
        // Forward to watchers
        await Promises.settled([
            this.recursiveWatcher.setVerboseLogging(enabled),
            this.nonRecursiveWatcher.setVerboseLogging(enabled),
        ]);
    }
    async stop() {
        await Promises.settled([this.recursiveWatcher.stop(), this.nonRecursiveWatcher.stop()]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL25vZGUvd2F0Y2hlci93YXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sdUJBQXVCLEdBR3ZCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFaEQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7SUF1Qi9DO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUF2QlMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFDdEQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBRXRGLG9CQUFlLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDbkMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsRUFDckMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FDeEMsQ0FBQTtRQUNRLGVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUM5QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUNoQyxJQUFJLENBQUMsbUJB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