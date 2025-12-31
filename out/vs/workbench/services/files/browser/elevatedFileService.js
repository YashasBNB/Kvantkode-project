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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxldmF0ZWRGaWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9maWxlcy9icm93c2VyL2VsZXZhdGVkRmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFZaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXZFLE1BQU0sT0FBTywwQkFBMEI7SUFHdEMsV0FBVyxDQUFDLFFBQWE7UUFDeEIsMkRBQTJEO1FBQzNELDJEQUEyRDtRQUMzRCxxREFBcUQ7UUFDckQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUN0QixRQUFhLEVBQ2IsS0FBMkQsRUFDM0QsT0FBMkI7UUFFM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUMvQixDQUFDO0NBQ0Q7QUFFRCxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSwwQkFBMEIsb0NBQTRCLENBQUEifQ==