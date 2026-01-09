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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLGVBQWUsRUFDZixzQkFBc0IsR0FDdEIsTUFBTSw0REFBNEQsQ0FBQTtBQU9uRSxPQUFPLEVBQ04sMkJBQTJCLEdBVzNCLE1BQU0sd0VBQXdFLENBQUE7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBUS9ELE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLHNCQUFzQixDQUczRSwyQkFBMkIsQ0FBQyxDQUFBO0FBYzlCLE1BQU0sQ0FBTixJQUFrQix3QkFJakI7QUFKRCxXQUFrQix3QkFBd0I7SUFDekMseUVBQVMsQ0FBQTtJQUNULDJFQUFNLENBQUE7SUFDTixxRUFBRyxDQUFBO0FBQ0osQ0FBQyxFQUppQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBSXpDO0FBRUQsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsZUFBZSxDQUMvRCxrQ0FBa0MsQ0FDbEMsQ0FBQTtBQVVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUNyRCx3RUFBd0UsQ0FDeEUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7QUE2QmhCLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLHNCQUFzQixDQUd4RSx1Q0FBdUMsQ0FBQyxDQUFBO0FBcUQxQyxNQUFNLENBQU4sSUFBa0IsZUFjakI7QUFkRCxXQUFrQixlQUFlO0lBQ2hDLGlHQUEwQixDQUFBO0lBQzFCLDJGQUF1QixDQUFBO0lBQ3ZCLHVGQUFxQixDQUFBO0lBQ3JCLHFGQUFvQixDQUFBO0lBQ3BCLG1GQUFtQixDQUFBO0lBQ25CLGlHQUEwQixDQUFBO0lBQzFCLGlHQUEwQixDQUFBO0lBQzFCLG1GQUFtQixDQUFBO0lBQ25CLHVHQUE2QixDQUFBO0lBQzdCLDZFQUFnQixDQUFBO0lBQ2hCLGdGQUFpQixDQUFBO0lBQ2pCLDRFQUFlLENBQUE7SUFDZiw4RUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBZGlCLGVBQWUsS0FBZixlQUFlLFFBY2hDO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQ2hELGVBQWUsQ0FBdUMsNEJBQTRCLENBQUMsQ0FBQTtBQWlGcEYsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsZUFBZSxDQUMxRCw4QkFBOEIsQ0FDOUIsQ0FBQSJ9