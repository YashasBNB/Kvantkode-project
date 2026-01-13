/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getServiceMachineId } from './serviceMachineId.js';
import { getTelemetryLevel, supportsTelemetry } from '../../telemetry/common/telemetryUtils.js';
export async function resolveMarketplaceHeaders(version, productService, environmentService, configurationService, fileService, storageService, telemetryService) {
    const headers = {
        'X-Market-Client-Id': `VSCode ${version}`,
        'User-Agent': `VSCode ${version} (${productService.nameShort})`,
    };
    if (supportsTelemetry(productService, environmentService) &&
        getTelemetryLevel(configurationService) === 3 /* TelemetryLevel.USAGE */) {
        const serviceMachineId = await getServiceMachineId(environmentService, fileService, storageService);
        headers['X-Market-User-Id'] = serviceMachineId;
        // Send machineId as VSCode-SessionId so we can correlate telemetry events across different services
        // machineId can be undefined sometimes (eg: when launching from CLI), so send serviceMachineId instead otherwise
        // Marketplace will reject the request if there is no VSCode-SessionId header
        headers['VSCode-SessionId'] = telemetryService.machineId || serviceMachineId;
    }
    return headers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVybmFsU2VydmljZXMvY29tbW9uL21hcmtldHBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBSzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRS9GLE1BQU0sQ0FBQyxLQUFLLFVBQVUseUJBQXlCLENBQzlDLE9BQWUsRUFDZixjQUErQixFQUMvQixrQkFBdUMsRUFDdkMsb0JBQTJDLEVBQzNDLFdBQXlCLEVBQ3pCLGNBQTJDLEVBQzNDLGdCQUFtQztJQUVuQyxNQUFNLE9BQU8sR0FBYTtRQUN6QixvQkFBb0IsRUFBRSxVQUFVLE9BQU8sRUFBRTtRQUN6QyxZQUFZLEVBQUUsVUFBVSxPQUFPLEtBQUssY0FBYyxDQUFDLFNBQVMsR0FBRztLQUMvRCxDQUFBO0lBRUQsSUFDQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUM7UUFDckQsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsaUNBQXlCLEVBQy9ELENBQUM7UUFDRixNQUFNLGdCQUFnQixHQUFHLE1BQU0sbUJBQW1CLENBQ2pELGtCQUFrQixFQUNsQixXQUFXLEVBQ1gsY0FBYyxDQUNkLENBQUE7UUFDRCxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQTtRQUM5QyxvR0FBb0c7UUFDcEcsaUhBQWlIO1FBQ2pILDZFQUE2RTtRQUM3RSxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLElBQUksZ0JBQWdCLENBQUE7SUFDN0UsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFBO0FBQ2YsQ0FBQyJ9