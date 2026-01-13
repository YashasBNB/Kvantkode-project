/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IElevatedFileService } from '../common/elevatedFileService.js';
export class BrowserElevatedFileService {
    isSupported(resource) {
        // Saving elevated is currently not supported in web for as
        // long as we have no generic support from the file service
        // (https://github.com/microsoft/vscode/issues/48659)
        return false;
    }
    async writeFileElevated(resource, value, options) {
        throw new Error('Unsupported');
    }
}
registerSingleton(IElevatedFileService, BrowserElevatedFileService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxldmF0ZWRGaWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2ZpbGVzL2Jyb3dzZXIvZWxldmF0ZWRGaWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVloRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFdkUsTUFBTSxPQUFPLDBCQUEwQjtJQUd0QyxXQUFXLENBQUMsUUFBYTtRQUN4QiwyREFBMkQ7UUFDM0QsMkRBQTJEO1FBQzNELHFEQUFxRDtRQUNyRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQ3RCLFFBQWEsRUFDYixLQUEyRCxFQUMzRCxPQUEyQjtRQUUzQixNQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQy9CLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLDBCQUEwQixvQ0FBNEIsQ0FBQSJ9