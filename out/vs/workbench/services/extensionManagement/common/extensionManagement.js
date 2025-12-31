/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator, refineServiceDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { FileAccess } from '../../../../base/common/network.js';
export const IProfileAwareExtensionManagementService = refineServiceDecorator(IExtensionManagementService);
export var ExtensionInstallLocation;
(function (ExtensionInstallLocation) {
    ExtensionInstallLocation[ExtensionInstallLocation["Local"] = 1] = "Local";
    ExtensionInstallLocation[ExtensionInstallLocation["Remote"] = 2] = "Remote";
    ExtensionInstallLocation[ExtensionInstallLocation["Web"] = 3] = "Web";
})(ExtensionInstallLocation || (ExtensionInstallLocation = {}));
export const IExtensionManagementServerService = createDecorator('extensionManagementServerService');
export const DefaultIconPath = FileAccess.asBrowserUri('vs/workbench/services/extensionManagement/common/media/defaultIcon.png').toString(true);
export const IWorkbenchExtensionManagementService = refineServiceDecorator(IProfileAwareExtensionManagementService);
export var EnablementState;
(function (EnablementState) {
    EnablementState[EnablementState["DisabledByTrustRequirement"] = 0] = "DisabledByTrustRequirement";
    EnablementState[EnablementState["DisabledByExtensionKind"] = 1] = "DisabledByExtensionKind";
    EnablementState[EnablementState["DisabledByEnvironment"] = 2] = "DisabledByEnvironment";
    EnablementState[EnablementState["EnabledByEnvironment"] = 3] = "EnabledByEnvironment";
    EnablementState[EnablementState["DisabledByMalicious"] = 4] = "DisabledByMalicious";
    EnablementState[EnablementState["DisabledByVirtualWorkspace"] = 5] = "DisabledByVirtualWorkspace";
    EnablementState[EnablementState["DisabledByInvalidExtension"] = 6] = "DisabledByInvalidExtension";
    EnablementState[EnablementState["DisabledByAllowlist"] = 7] = "DisabledByAllowlist";
    EnablementState[EnablementState["DisabledByExtensionDependency"] = 8] = "DisabledByExtensionDependency";
    EnablementState[EnablementState["DisabledGlobally"] = 9] = "DisabledGlobally";
    EnablementState[EnablementState["DisabledWorkspace"] = 10] = "DisabledWorkspace";
    EnablementState[EnablementState["EnabledGlobally"] = 11] = "EnabledGlobally";
    EnablementState[EnablementState["EnabledWorkspace"] = 12] = "EnabledWorkspace";
})(EnablementState || (EnablementState = {}));
export const IWorkbenchExtensionEnablementService = createDecorator('extensionEnablementService');
export const IWebExtensionsScannerService = createDecorator('IWebExtensionsScannerService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTixlQUFlLEVBQ2Ysc0JBQXNCLEdBQ3RCLE1BQU0sNERBQTRELENBQUE7QUFPbkUsT0FBTyxFQUNOLDJCQUEyQixHQVczQixNQUFNLHdFQUF3RSxDQUFBO0FBRS9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQVEvRCxNQUFNLENBQUMsTUFBTSx1Q0FBdUMsR0FBRyxzQkFBc0IsQ0FHM0UsMkJBQTJCLENBQUMsQ0FBQTtBQWM5QixNQUFNLENBQU4sSUFBa0Isd0JBSWpCO0FBSkQsV0FBa0Isd0JBQXdCO0lBQ3pDLHlFQUFTLENBQUE7SUFDVCwyRUFBTSxDQUFBO0lBQ04scUVBQUcsQ0FBQTtBQUNKLENBQUMsRUFKaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUl6QztBQUVELE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLGVBQWUsQ0FDL0Qsa0NBQWtDLENBQ2xDLENBQUE7QUFVRCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FDckQsd0VBQXdFLENBQ3hFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBNkJoQixNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxzQkFBc0IsQ0FHeEUsdUNBQXVDLENBQUMsQ0FBQTtBQXFEMUMsTUFBTSxDQUFOLElBQWtCLGVBY2pCO0FBZEQsV0FBa0IsZUFBZTtJQUNoQyxpR0FBMEIsQ0FBQTtJQUMxQiwyRkFBdUIsQ0FBQTtJQUN2Qix1RkFBcUIsQ0FBQTtJQUNyQixxRkFBb0IsQ0FBQTtJQUNwQixtRkFBbUIsQ0FBQTtJQUNuQixpR0FBMEIsQ0FBQTtJQUMxQixpR0FBMEIsQ0FBQTtJQUMxQixtRkFBbUIsQ0FBQTtJQUNuQix1R0FBNkIsQ0FBQTtJQUM3Qiw2RUFBZ0IsQ0FBQTtJQUNoQixnRkFBaUIsQ0FBQTtJQUNqQiw0RUFBZSxDQUFBO0lBQ2YsOEVBQWdCLENBQUE7QUFDakIsQ0FBQyxFQWRpQixlQUFlLEtBQWYsZUFBZSxRQWNoQztBQUVELE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUNoRCxlQUFlLENBQXVDLDRCQUE0QixDQUFDLENBQUE7QUFpRnBGLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGVBQWUsQ0FDMUQsOEJBQThCLENBQzlCLENBQUEifQ==