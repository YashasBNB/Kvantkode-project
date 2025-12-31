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
import { timeout } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, dispose, toDisposable } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../log/common/log.js';
/**
 * A helper class to track requests that have replies. Using this it's easy to implement an event
 * that accepts a reply.
 */
let RequestStore = class RequestStore extends Disposable {
    /**
     * @param timeout How long in ms to allow requests to go unanswered for, undefined will use the
     * default (15 seconds).
     */
    constructor(timeout, _logService) {
        super();
        this._logService = _logService;
        this._lastRequestId = 0;
        this._pendingRequests = new Map();
        this._pendingRequestDisposables = new Map();
        this._onCreateRequest = this._register(new Emitter());
        this.onCreateRequest = this._onCreateRequest.event;
        this._timeout = timeout === undefined ? 15000 : timeout;
        this._register(toDisposable(() => {
            for (const d of this._pendingRequestDisposables.values()) {
                dispose(d);
            }
        }));
    }
    /**
     * Creates a request.
     * @param args The arguments to pass to the onCreateRequest event.
     */
    createRequest(args) {
        return new Promise((resolve, reject) => {
            const requestId = ++this._lastRequestId;
            this._pendingRequests.set(requestId, resolve);
            this._onCreateRequest.fire({ requestId, ...args });
            const tokenSource = new CancellationTokenSource();
            timeout(this._timeout, tokenSource.token).then(() => reject(`Request ${requestId} timed out (${this._timeout}ms)`));
            this._pendingRequestDisposables.set(requestId, [toDisposable(() => tokenSource.cancel())]);
        });
    }
    /**
     * Accept a reply to a request.
     * @param requestId The request ID originating from the onCreateRequest event.
     * @param data The reply data.
     */
    acceptReply(requestId, data) {
        const resolveRequest = this._pendingRequests.get(requestId);
        if (resolveRequest) {
            this._pendingRequests.delete(requestId);
            dispose(this._pendingRequestDisposables.get(requestId) || []);
            this._pendingRequestDisposables.delete(requestId);
            resolveRequest(data);
        }
        else {
            this._logService.warn(`RequestStore#acceptReply was called without receiving a matching request ${requestId}`);
        }
    }
};
RequestStore = __decorate([
    __param(1, ILogService)
], RequestStore);
export { RequestStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFN0b3JlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3JlcXVlc3RTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVyRDs7O0dBR0c7QUFDSSxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUE2QixTQUFRLFVBQVU7SUFXM0Q7OztPQUdHO0lBQ0gsWUFDQyxPQUEyQixFQUNkLFdBQXlDO1FBRXRELEtBQUssRUFBRSxDQUFBO1FBRnVCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBaEIvQyxtQkFBYyxHQUFHLENBQUMsQ0FBQTtRQUVsQixxQkFBZ0IsR0FBdUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNoRSwrQkFBMEIsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUV6RCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNqRCxJQUFJLE9BQU8sRUFBdUMsQ0FDbEQsQ0FBQTtRQUNRLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQTtRQVdyRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxTQUFTLENBQ2IsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNqQixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUMxRCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDWCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxhQUFhLENBQUMsSUFBaUI7UUFDOUIsT0FBTyxJQUFJLE9BQU8sQ0FBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN6QyxNQUFNLFNBQVMsR0FBRyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUE7WUFDdkMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDN0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUE7WUFDbEQsTUFBTSxXQUFXLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1lBQ2pELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQ25ELE1BQU0sQ0FBQyxXQUFXLFNBQVMsZUFBZSxJQUFJLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FDN0QsQ0FBQTtZQUNELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsV0FBVyxDQUFDLFNBQWlCLEVBQUUsSUFBTztRQUNyQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUM3RCxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2pELGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUNwQiw0RUFBNEUsU0FBUyxFQUFFLENBQ3ZGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFqRVksWUFBWTtJQWlCdEIsV0FBQSxXQUFXLENBQUE7R0FqQkQsWUFBWSxDQWlFeEIifQ==