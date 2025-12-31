/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
export function parseExtensionDevOptions(environmentService) {
    // handle extension host lifecycle a bit special when we know we are developing an extension that runs inside
    const isExtensionDevHost = environmentService.isExtensionDevelopment;
    let debugOk = true;
    const extDevLocs = environmentService.extensionDevelopmentLocationURI;
    if (extDevLocs) {
        for (const x of extDevLocs) {
            if (x.scheme !== Schemas.file) {
                debugOk = false;
            }
        }
    }
    const isExtensionDevDebug = debugOk && typeof environmentService.debugExtensionHost.port === 'number';
    const isExtensionDevDebugBrk = debugOk && !!environmentService.debugExtensionHost.break;
    const isExtensionDevTestFromCli = isExtensionDevHost &&
        !!environmentService.extensionTestsLocationURI &&
        !environmentService.debugExtensionHost.debugId;
    return {
        isExtensionDevHost,
        isExtensionDevDebug,
        isExtensionDevDebugBrk,
        isExtensionDevTestFromCli,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRGV2T3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25EZXZPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQVU1RCxNQUFNLFVBQVUsd0JBQXdCLENBQ3ZDLGtCQUF1QztJQUV2Qyw2R0FBNkc7SUFDN0csTUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQTtJQUVwRSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUE7SUFDbEIsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsK0JBQStCLENBQUE7SUFDckUsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixLQUFLLE1BQU0sQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sR0FBRyxLQUFLLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxtQkFBbUIsR0FDeEIsT0FBTyxJQUFJLE9BQU8sa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQTtJQUMxRSxNQUFNLHNCQUFzQixHQUFHLE9BQU8sSUFBSSxDQUFDLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO0lBQ3ZGLE1BQU0seUJBQXlCLEdBQzlCLGtCQUFrQjtRQUNsQixDQUFDLENBQUMsa0JBQWtCLENBQUMseUJBQXlCO1FBQzlDLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFBO0lBQy9DLE9BQU87UUFDTixrQkFBa0I7UUFDbEIsbUJBQW1CO1FBQ25CLHNCQUFzQjtRQUN0Qix5QkFBeUI7S0FDekIsQ0FBQTtBQUNGLENBQUMifQ==