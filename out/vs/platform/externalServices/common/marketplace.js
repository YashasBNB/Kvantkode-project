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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlcm5hbFNlcnZpY2VzL2NvbW1vbi9tYXJrZXRwbGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUszRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUvRixNQUFNLENBQUMsS0FBSyxVQUFVLHlCQUF5QixDQUM5QyxPQUFlLEVBQ2YsY0FBK0IsRUFDL0Isa0JBQXVDLEVBQ3ZDLG9CQUEyQyxFQUMzQyxXQUF5QixFQUN6QixjQUEyQyxFQUMzQyxnQkFBbUM7SUFFbkMsTUFBTSxPQUFPLEdBQWE7UUFDekIsb0JBQW9CLEVBQUUsVUFBVSxPQUFPLEVBQUU7UUFDekMsWUFBWSxFQUFFLFVBQVUsT0FBTyxLQUFLLGNBQWMsQ0FBQyxTQUFTLEdBQUc7S0FDL0QsQ0FBQTtJQUVELElBQ0MsaUJBQWlCLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDO1FBQ3JELGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLGlDQUF5QixFQUMvRCxDQUFDO1FBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLG1CQUFtQixDQUNqRCxrQkFBa0IsRUFDbEIsV0FBVyxFQUNYLGNBQWMsQ0FDZCxDQUFBO1FBQ0QsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsZ0JBQWdCLENBQUE7UUFDOUMsb0dBQW9HO1FBQ3BHLGlIQUFpSDtRQUNqSCw2RUFBNkU7UUFDN0UsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxJQUFJLGdCQUFnQixDQUFBO0lBQzdFLENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQTtBQUNmLENBQUMifQ==