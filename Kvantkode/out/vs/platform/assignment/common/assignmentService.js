/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getTelemetryLevel } from '../../telemetry/common/telemetryUtils.js';
import { AssignmentFilterProvider, ASSIGNMENT_REFETCH_INTERVAL, ASSIGNMENT_STORAGE_KEY, TargetPopulation, } from './assignment.js';
import { importAMDNodeModule } from '../../../amdX.js';
export class BaseAssignmentService {
    get experimentsEnabled() {
        return true;
    }
    constructor(machineId, configurationService, productService, environmentService, telemetry, keyValueStorage) {
        this.machineId = machineId;
        this.configurationService = configurationService;
        this.productService = productService;
        this.environmentService = environmentService;
        this.telemetry = telemetry;
        this.keyValueStorage = keyValueStorage;
        this.networkInitialized = false;
        const isTesting = environmentService.extensionTestsLocationURI !== undefined;
        if (!isTesting &&
            productService.tasConfig &&
            this.experimentsEnabled &&
            getTelemetryLevel(this.configurationService) === 3 /* TelemetryLevel.USAGE */) {
            this.tasClient = this.setupTASClient();
        }
        // For development purposes, configure the delay until tas local tas treatment ovverrides are available
        const overrideDelaySetting = this.configurationService.getValue('experiments.overrideDelay');
        const overrideDelay = typeof overrideDelaySetting === 'number' ? overrideDelaySetting : 0;
        this.overrideInitDelay = new Promise((resolve) => setTimeout(resolve, overrideDelay));
    }
    async getTreatment(name) {
        // For development purposes, allow overriding tas assignments to test variants locally.
        await this.overrideInitDelay;
        const override = this.configurationService.getValue('experiments.override.' + name);
        if (override !== undefined) {
            return override;
        }
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        let result;
        const client = await this.tasClient;
        // The TAS client is initialized but we need to check if the initial fetch has completed yet
        // If it is complete, return a cached value for the treatment
        // If not, use the async call with `checkCache: true`. This will allow the module to return a cached value if it is present.
        // Otherwise it will await the initial fetch to return the most up to date value.
        if (this.networkInitialized) {
            result = client.getTreatmentVariable('vscode', name);
        }
        else {
            result = await client.getTreatmentVariableAsync('vscode', name, true);
        }
        result = client.getTreatmentVariable('vscode', name);
        return result;
    }
    async setupTASClient() {
        const targetPopulation = this.productService.quality === 'stable'
            ? TargetPopulation.Public
            : this.productService.quality === 'exploration'
                ? TargetPopulation.Exploration
                : TargetPopulation.Insiders;
        const filterProvider = new AssignmentFilterProvider(this.productService.version, this.productService.nameLong, this.machineId, targetPopulation);
        const tasConfig = this.productService.tasConfig;
        const tasClient = new (await importAMDNodeModule('tas-client-umd', 'lib/tas-client-umd.js')).ExperimentationService({
            filterProviders: [filterProvider],
            telemetry: this.telemetry,
            storageKey: ASSIGNMENT_STORAGE_KEY,
            keyValueStorage: this.keyValueStorage,
            assignmentContextTelemetryPropertyName: tasConfig.assignmentContextTelemetryPropertyName,
            telemetryEventName: tasConfig.telemetryEventName,
            endpoint: tasConfig.endpoint,
            refetchInterval: ASSIGNMENT_REFETCH_INTERVAL,
        });
        await tasClient.initializePromise;
        tasClient.initialFetch.then(() => (this.networkInitialized = true));
        return tasClient;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Fzc2lnbm1lbnQvY29tbW9uL2Fzc2lnbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBVWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzVFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsMkJBQTJCLEVBQzNCLHNCQUFzQixFQUV0QixnQkFBZ0IsR0FDaEIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUd0RCxNQUFNLE9BQWdCLHFCQUFxQjtJQU0xQyxJQUFjLGtCQUFrQjtRQUMvQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxZQUNrQixTQUFpQixFQUNmLG9CQUEyQyxFQUMzQyxjQUErQixFQUMvQixrQkFBdUMsRUFDaEQsU0FBb0MsRUFDdEMsZUFBa0M7UUFMekIsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNmLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQy9CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDaEQsY0FBUyxHQUFULFNBQVMsQ0FBMkI7UUFDdEMsb0JBQWUsR0FBZixlQUFlLENBQW1CO1FBYm5DLHVCQUFrQixHQUFHLEtBQUssQ0FBQTtRQWVqQyxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyx5QkFBeUIsS0FBSyxTQUFTLENBQUE7UUFDNUUsSUFDQyxDQUFDLFNBQVM7WUFDVixjQUFjLENBQUMsU0FBUztZQUN4QixJQUFJLENBQUMsa0JBQWtCO1lBQ3ZCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQ0FBeUIsRUFDcEUsQ0FBQztZQUNGLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3ZDLENBQUM7UUFFRCx1R0FBdUc7UUFDdkcsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDNUYsTUFBTSxhQUFhLEdBQUcsT0FBTyxvQkFBb0IsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7SUFDdEYsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQXNDLElBQVk7UUFDbkUsdUZBQXVGO1FBQ3ZGLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQzVCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUksdUJBQXVCLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDdEYsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUIsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM5QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxNQUFxQixDQUFBO1FBQ3pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUVuQyw0RkFBNEY7UUFDNUYsNkRBQTZEO1FBQzdELDRIQUE0SDtRQUM1SCxpRkFBaUY7UUFDakYsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixNQUFNLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFJLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBSSxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pFLENBQUM7UUFFRCxNQUFNLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFJLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYztRQUMzQixNQUFNLGdCQUFnQixHQUNyQixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxRQUFRO1lBQ3ZDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNO1lBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxhQUFhO2dCQUM5QyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVztnQkFDOUIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQTtRQUU5QixNQUFNLGNBQWMsR0FBRyxJQUFJLHdCQUF3QixDQUNsRCxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFDM0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQzVCLElBQUksQ0FBQyxTQUFTLEVBQ2QsZ0JBQWdCLENBQ2hCLENBQUE7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVUsQ0FBQTtRQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQ3JCLE1BQU0sbUJBQW1CLENBQ3hCLGdCQUFnQixFQUNoQix1QkFBdUIsQ0FDdkIsQ0FDRCxDQUFDLHNCQUFzQixDQUFDO1lBQ3hCLGVBQWUsRUFBRSxDQUFDLGNBQWMsQ0FBQztZQUNqQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsVUFBVSxFQUFFLHNCQUFzQjtZQUNsQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7WUFDckMsc0NBQXNDLEVBQUUsU0FBUyxDQUFDLHNDQUFzQztZQUN4RixrQkFBa0IsRUFBRSxTQUFTLENBQUMsa0JBQWtCO1lBQ2hELFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtZQUM1QixlQUFlLEVBQUUsMkJBQTJCO1NBQzVDLENBQUMsQ0FBQTtRQUVGLE1BQU0sU0FBUyxDQUFDLGlCQUFpQixDQUFBO1FBQ2pDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFbkUsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNEIn0=