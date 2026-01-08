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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRGV2T3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbkRldk9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBVTVELE1BQU0sVUFBVSx3QkFBd0IsQ0FDdkMsa0JBQXVDO0lBRXZDLDZHQUE2RztJQUM3RyxNQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUFBO0lBRXBFLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQTtJQUNsQixNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQywrQkFBK0IsQ0FBQTtJQUNyRSxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLEtBQUssTUFBTSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUNoQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLG1CQUFtQixHQUN4QixPQUFPLElBQUksT0FBTyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFBO0lBQzFFLE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7SUFDdkYsTUFBTSx5QkFBeUIsR0FDOUIsa0JBQWtCO1FBQ2xCLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyx5QkFBeUI7UUFDOUMsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUE7SUFDL0MsT0FBTztRQUNOLGtCQUFrQjtRQUNsQixtQkFBbUI7UUFDbkIsc0JBQXNCO1FBQ3RCLHlCQUF5QjtLQUN6QixDQUFBO0FBQ0YsQ0FBQyJ9