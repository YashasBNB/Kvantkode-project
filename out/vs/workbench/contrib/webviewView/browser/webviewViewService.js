/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { promiseWithResolvers } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IWebviewViewService = createDecorator('webviewViewService');
export class WebviewViewService extends Disposable {
    constructor() {
        super(...arguments);
        this._resolvers = new Map();
        this._awaitingRevival = new Map();
        this._onNewResolverRegistered = this._register(new Emitter());
        this.onNewResolverRegistered = this._onNewResolverRegistered.event;
    }
    register(viewType, resolver) {
        if (this._resolvers.has(viewType)) {
            throw new Error(`View resolver already registered for ${viewType}`);
        }
        this._resolvers.set(viewType, resolver);
        this._onNewResolverRegistered.fire({ viewType: viewType });
        const pending = this._awaitingRevival.get(viewType);
        if (pending) {
            resolver.resolve(pending.webview, CancellationToken.None).then(() => {
                this._awaitingRevival.delete(viewType);
                pending.resolve();
            });
        }
        return toDisposable(() => {
            this._resolvers.delete(viewType);
        });
    }
    resolve(viewType, webview, cancellation) {
        const resolver = this._resolvers.get(viewType);
        if (!resolver) {
            if (this._awaitingRevival.has(viewType)) {
                throw new Error('View already awaiting revival');
            }
            const { promise, resolve } = promiseWithResolvers();
            this._awaitingRevival.set(viewType, { webview, resolve });
            return promise;
        }
        return resolver.resolve(webview, cancellation);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1ZpZXdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlld1ZpZXcvYnJvd3Nlci93ZWJ2aWV3Vmlld1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBOEQ1RixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUE7QUFzQjdGLE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBQWxEOztRQUdrQixlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUE7UUFFcEQscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBR3hDLENBQUE7UUFFYyw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6RCxJQUFJLE9BQU8sRUFBaUMsQ0FDNUMsQ0FBQTtRQUNlLDRCQUF1QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUE7SUFxQzlFLENBQUM7SUFuQ0EsUUFBUSxDQUFDLFFBQWdCLEVBQUUsUUFBOEI7UUFDeEQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXdDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFFMUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ25FLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3RDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNsQixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQWdCLEVBQUUsT0FBb0IsRUFBRSxZQUErQjtRQUM5RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1lBQ2pELENBQUM7WUFFRCxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLG9CQUFvQixFQUFRLENBQUE7WUFDekQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUN6RCxPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQy9DLENBQUM7Q0FDRCJ9