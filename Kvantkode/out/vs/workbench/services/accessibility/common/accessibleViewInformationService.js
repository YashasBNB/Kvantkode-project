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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX } from '../../../../platform/accessibility/common/accessibility.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const IAccessibleViewInformationService = createDecorator('accessibleViewInformationService');
let AccessibleViewInformationService = class AccessibleViewInformationService extends Disposable {
    constructor(_storageService) {
        super();
        this._storageService = _storageService;
    }
    hasShownAccessibleView(viewId) {
        return (this._storageService.getBoolean(`${ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX}${viewId}`, -1 /* StorageScope.APPLICATION */, false) === true);
    }
};
AccessibleViewInformationService = __decorate([
    __param(0, IStorageService)
], AccessibleViewInformationService);
export { AccessibleViewInformationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdJbmZvcm1hdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hY2Nlc3NpYmlsaXR5L2NvbW1vbi9hY2Nlc3NpYmxlVmlld0luZm9ybWF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sZ0RBQWdELENBQUE7QUFPOUYsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsZUFBZSxDQUMvRCxrQ0FBa0MsQ0FDbEMsQ0FBQTtBQUVNLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQ1osU0FBUSxVQUFVO0lBSWxCLFlBQThDLGVBQWdDO1FBQzdFLEtBQUssRUFBRSxDQUFBO1FBRHNDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtJQUU5RSxDQUFDO0lBQ0Qsc0JBQXNCLENBQUMsTUFBYztRQUNwQyxPQUFPLENBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQzlCLEdBQUcsb0NBQW9DLEdBQUcsTUFBTSxFQUFFLHFDQUVsRCxLQUFLLENBQ0wsS0FBSyxJQUFJLENBQ1YsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBakJZLGdDQUFnQztJQUsvQixXQUFBLGVBQWUsQ0FBQTtHQUxoQixnQ0FBZ0MsQ0FpQjVDIn0=