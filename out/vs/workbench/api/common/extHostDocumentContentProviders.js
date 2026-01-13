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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50Q29udGVudFByb3ZpZGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERvY3VtZW50Q29udGVudFByb3ZpZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUU5QyxPQUFPLEVBQ04sV0FBVyxHQUlYLE1BQU0sdUJBQXVCLENBQUE7QUFFOUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU1RCxNQUFNLE9BQU8sOEJBQThCO2FBQzNCLGdCQUFXLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFLOUIsWUFDQyxXQUF5QixFQUNSLG9CQUFnRCxFQUNoRCxXQUF3QjtRQUR4Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTRCO1FBQ2hELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBTnpCLDhCQUF5QixHQUFHLElBQUksR0FBRyxFQUE4QyxDQUFBO1FBUWpHLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsa0NBQWtDLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRUQsbUNBQW1DLENBQ2xDLE1BQWMsRUFDZCxRQUE0QztRQUU1QyxjQUFjO1FBQ2QsdUNBQXVDO1FBQ3ZDLElB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