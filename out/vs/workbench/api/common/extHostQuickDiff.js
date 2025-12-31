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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFF1aWNrRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RRdWlja0RpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBR04sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRzdELE1BQU0sT0FBTyxnQkFBZ0I7YUFDYixlQUFVLEdBQVcsQ0FBQyxBQUFaLENBQVk7SUFLckMsWUFDQyxXQUF5QixFQUNSLGNBQTJDO1FBQTNDLG1CQUFjLEdBQWQsY0FBYyxDQUE2QjtRQUpyRCxjQUFTLEdBQTBDLElBQUksR0FBRyxFQUFFLENBQUE7UUFNbkUsSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCx3QkFBd0IsQ0FDdkIsTUFBYyxFQUNkLGFBQTRCLEVBQzVCLEtBQXdCO1FBRXhCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDckMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFM0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FDckIsUUFBUSxDQUFDLHVCQUF3QixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FDN0MsQ0FBQyxJQUFJLENBQXVCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELHlCQUF5QixDQUN4QixRQUFpQyxFQUNqQyxpQkFBMkMsRUFDM0MsS0FBYSxFQUNiLE9BQW9CO1FBRXBCLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQ3BDLE1BQU0sRUFDTixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsRUFDcEQsS0FBSyxFQUNMLE9BQU8sRUFDUCxpQkFBaUIsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUNqQyxDQUFBO1FBQ0QsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUIsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDIn0=