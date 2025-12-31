/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import { URI } from '../../../base/common/uri.js';
import { Disposable } from './extHostTypes.js';
import { MainContext, } from './extHost.protocol.js';
import { Schemas } from '../../../base/common/network.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { splitLines } from '../../../base/common/strings.js';
export class ExtHostDocumentContentProvider {
    static { this._handlePool = 0; }
    constructor(mainContext, _documentsAndEditors, _logService) {
        this._documentsAndEditors = _documentsAndEditors;
        this._logService = _logService;
        this._documentContentProviders = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadDocumentContentProviders);
    }
    registerTextDocumentContentProvider(scheme, provider) {
        // todo@remote
        // check with scheme from fs-providers!
        if (Object.keys(Schemas).indexOf(scheme) >= 0) {
            throw new Error(`scheme '${scheme}' already registered`);
        }
        const handle = ExtHostDocumentContentProvider._handlePool++;
        this._documentContentProviders.set(handle, provider);
        this._proxy.$registerTextContentProvider(handle, scheme);
        let subscription;
        if (typeof provider.onDidChange === 'function') {
            let lastEvent;
            subscription = provider.onDidChange(async (uri) => {
                if (uri.scheme !== scheme) {
                    this._logService.warn(`Provider for scheme '${scheme}' is firing event for schema '${uri.scheme}' which will be IGNORED`);
                    return;
                }
                if (!this._documentsAndEditors.getDocument(uri)) {
                    // ignore event if document isn't open
                    return;
                }
                if (lastEvent) {
                    await lastEvent;
                }
                const thisEvent = this.$provideTextDocumentContent(handle, uri)
                    .then(async (value) => {
                    if (!value && typeof value !== 'string') {
                        return;
                    }
                    const document = this._documentsAndEditors.getDocument(uri);
                    if (!document) {
                        // disposed in the meantime
                        return;
                    }
                    // create lines and compare
                    const lines = splitLines(value);
                    // broadcast event when content changed
                    if (!document.equalLines(lines)) {
                        return this._proxy.$onVirtualDocumentChange(uri, value);
                    }
                })
                    .catch(onUnexpectedError)
                    .finally(() => {
                    if (lastEvent === thisEvent) {
                        lastEvent = undefined;
                    }
                });
                lastEvent = thisEvent;
            });
        }
        return new Disposable(() => {
            if (this._documentContentProviders.delete(handle)) {
                this._proxy.$unregisterTextContentProvider(handle);
            }
            if (subscription) {
                subscription.dispose();
                subscription = undefined;
            }
        });
    }
    $provideTextDocumentContent(handle, uri) {
        const provider = this._documentContentProviders.get(handle);
        if (!provider) {
            return Promise.reject(new Error(`unsupported uri-scheme: ${uri.scheme}`));
        }
        return Promise.resolve(provider.provideTextDocumentContent(URI.revive(uri), CancellationToken.None));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50Q29udGVudFByb3ZpZGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3REb2N1bWVudENvbnRlbnRQcm92aWRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFOUMsT0FBTyxFQUNOLFdBQVcsR0FJWCxNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFNUQsTUFBTSxPQUFPLDhCQUE4QjthQUMzQixnQkFBVyxHQUFHLENBQUMsQUFBSixDQUFJO0lBSzlCLFlBQ0MsV0FBeUIsRUFDUixvQkFBZ0QsRUFDaEQsV0FBd0I7UUFEeEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUE0QjtRQUNoRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQU56Qiw4QkFBeUIsR0FBRyxJQUFJLEdBQUcsRUFBOEMsQ0FBQTtRQVFqRyxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGtDQUFrQyxDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUVELG1DQUFtQyxDQUNsQyxNQUFjLEVBQ2QsUUFBNEM7UUFFNUMsY0FBYztRQUNkLHVDQUF1QztRQUN2QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMs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