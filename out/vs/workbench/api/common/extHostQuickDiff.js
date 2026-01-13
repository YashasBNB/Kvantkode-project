/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { MainContext, } from './extHost.protocol.js';
import { asPromise } from '../../../base/common/async.js';
import { DocumentSelector } from './extHostTypeConverters.js';
export class ExtHostQuickDiff {
    static { this.handlePool = 0; }
    constructor(mainContext, uriTransformer) {
        this.uriTransformer = uriTransformer;
        this.providers = new Map();
        this.proxy = mainContext.getProxy(MainContext.MainThreadQuickDiff);
    }
    $provideOriginalResource(handle, uriComponents, token) {
        const uri = URI.revive(uriComponents);
        const provider = this.providers.get(handle);
        if (!provider) {
            return Promise.resolve(null);
        }
        return asPromise(() => provider.provideOriginalResource(uri, token)).then((r) => r || null);
    }
    registerQuickDiffProvider(selector, quickDiffProvider, label, rootUri) {
        const handle = ExtHostQuickDiff.handlePool++;
        this.providers.set(handle, quickDiffProvider);
        this.proxy.$registerQuickDiffProvider(handle, DocumentSelector.from(selector, this.uriTransformer), label, rootUri, quickDiffProvider.visible ?? true);
        return {
            dispose: () => {
                this.proxy.$unregisterQuickDiffProvider(handle);
                this.providers.delete(handle);
            },
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFF1aWNrRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFF1aWNrRGlmZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFHTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFHN0QsTUFBTSxPQUFPLGdCQUFnQjthQUNiLGVBQVUsR0FBVyxDQUFDLEFBQVosQ0FBWTtJQUtyQyxZQUNDLFdBQXlCLEVBQ1IsY0FBMkM7UUFBM0MsbUJBQWMsR0FBZCxjQUFjLENBQTZCO1FBSnJELGNBQVMsR0FBMEMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQU1uRSxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELHdCQUF3QixDQUN2QixNQUFjLEVBQ2QsYUFBNEIsRUFDNUIsS0FBd0I7UUFFeEIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUzQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUNyQixRQUFRLENBQUMsdUJBQXdCLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUM3QyxDQUFDLElBQUksQ0FBdUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQseUJBQXlCLENBQ3hCLFFBQWlDLEVBQ2pDLGlCQUEyQyxFQUMzQyxLQUFhLEVBQ2IsT0FBb0I7UUFFcEIsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FDcEMsTUFBTSxFQUNOLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUNwRCxLQUFLLEVBQ0wsT0FBTyxFQUNQLGlCQUFpQixDQUFDLE9BQU8sSUFBSSxJQUFJLENBQ2pDLENBQUE7UUFDRCxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5QixDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUMifQ==