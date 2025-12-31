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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hc3NpZ25tZW50L2NvbW1vbi9hc3NpZ25tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixFQUMzQixzQkFBc0IsRUFFdEIsZ0JBQWdCLEdBQ2hCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFHdEQsTUFBTSxPQUFnQixxQkFBcUI7SUFNMUMsSUFBYyxrQkFBa0I7UUFDL0IsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsWUFDa0IsU0FBaUIsRUFDZixvQkFBMkMsRUFDM0MsY0FBK0IsRUFDL0Isa0JBQXVDLEVBQ2hELFNBQW9DLEVBQ3RDLGVBQWtDO1FBTHpCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDZix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUMvQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ2hELGNBQVMsR0FBVCxTQUFTLENBQTJCO1FBQ3RDLG9CQUFlLEdBQWYsZUFBZSxDQUFtQjtRQWJuQyx1QkFBa0IsR0FBRyxLQUFLLENBQUE7UUFlakMsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMseUJBQXlCLEtBQUssU0FBUyxDQUFBO1FBQzVFLElBQ0MsQ0FBQyxTQUFTO1lBQ1YsY0FBYyxDQUFDLFNBQVM7WUFDeEIsSUFBSSxDQUFDLGtCQUFrQjtZQUN2QixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsaUNBQXlCLEVB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