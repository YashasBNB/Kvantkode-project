/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../../base/common/platform.js';
export const ASSIGNMENT_STORAGE_KEY = 'VSCode.ABExp.FeatureData';
export const ASSIGNMENT_REFETCH_INTERVAL = 0; // no polling
export var TargetPopulation;
(function (TargetPopulation) {
    TargetPopulation["Insiders"] = "insider";
    TargetPopulation["Public"] = "public";
    TargetPopulation["Exploration"] = "exploration";
})(TargetPopulation || (TargetPopulation = {}));
/*
Based upon the official VSCode currently existing filters in the
ExP backend for the VSCode cluster.
https://experimentation.visualstudio.com/Analysis%20and%20Experimentation/_git/AnE.ExP.TAS.TachyonHost.Configuration?path=%2FConfigurations%2Fvscode%2Fvscode.json&version=GBmaster
"X-MSEdge-Market": "detection.market",
"X-FD-Corpnet": "detection.corpnet",
"X-VSCode-AppVersion": "appversion",
"X-VSCode-Build": "build",
"X-MSEdge-ClientId": "clientid",
"X-VSCode-ExtensionName": "extensionname",
"X-VSCode-ExtensionVersion": "extensionversion",
"X-VSCode-TargetPopulation": "targetpopulation",
"X-VSCode-Language": "language"
*/
export var Filters;
(function (Filters) {
    /**
     * The market in which the extension is distributed.
     */
    Filters["Market"] = "X-MSEdge-Market";
    /**
     * The corporation network.
     */
    Filters["CorpNet"] = "X-FD-Corpnet";
    /**
     * Version of the application which uses experimentation service.
     */
    Filters["ApplicationVersion"] = "X-VSCode-AppVersion";
    /**
     * Insiders vs Stable.
     */
    Filters["Build"] = "X-VSCode-Build";
    /**
     * Client Id which is used as primary unit for the experimentation.
     */
    Filters["ClientId"] = "X-MSEdge-ClientId";
    /**
     * Extension header.
     */
    Filters["ExtensionName"] = "X-VSCode-ExtensionName";
    /**
     * The version of the extension.
     */
    Filters["ExtensionVersion"] = "X-VSCode-ExtensionVersion";
    /**
     * The language in use by VS Code
     */
    Filters["Language"] = "X-VSCode-Language";
    /**
     * The target population.
     * This is used to separate internal, early preview, GA, etc.
     */
    Filters["TargetPopulation"] = "X-VSCode-TargetPopulation";
})(Filters || (Filters = {}));
export class AssignmentFilterProvider {
    constructor(version, appName, machineId, targetPopulation) {
        this.version = version;
        this.appName = appName;
        this.machineId = machineId;
        this.targetPopulation = targetPopulation;
    }
    /**
     * Returns a version string that can be parsed by the TAS client.
     * The tas client cannot handle suffixes lke "-insider"
     * Ref: https://github.com/microsoft/tas-client/blob/30340d5e1da37c2789049fcf45928b954680606f/vscode-tas-client/src/vscode-tas-client/VSCodeFilterProvider.ts#L35
     *
     * @param version Version string to be trimmed.
     */
    static trimVersionSuffix(version) {
        const regex = /\-[a-zA-Z0-9]+$/;
        const result = version.split(regex);
        return result[0];
    }
    getFilterValue(filter) {
        switch (filter) {
            case Filters.ApplicationVersion:
                return AssignmentFilterProvider.trimVersionSuffix(this.version); // productService.version
            case Filters.Build:
                return this.appName; // productService.nameLong
            case Filters.ClientId:
                return this.machineId;
            case Filters.Language:
                return platform.language;
            case Filters.ExtensionName:
                return 'vscode-core'; // always return vscode-core for exp service
            case Filters.ExtensionVersion:
                return '999999.0'; // always return a very large number for cross-extension experimentation
            case Filters.TargetPopulation:
                return this.targetPopulation;
            default:
                return '';
        }
    }
    getFilters() {
        const filters = new Map();
        const filterValues = Object.values(Filters);
        for (const value of filterValues) {
            filters.set(value, this.getFilterValue(value));
        }
        return filters;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Fzc2lnbm1lbnQvY29tbW9uL2Fzc2lnbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUc1RCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRywwQkFBMEIsQ0FBQTtBQUNoRSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxDQUFDLENBQUEsQ0FBQyxhQUFhO0FBTzFELE1BQU0sQ0FBTixJQUFZLGdCQUlYO0FBSkQsV0FBWSxnQkFBZ0I7SUFDM0Isd0NBQW9CLENBQUE7SUFDcEIscUNBQWlCLENBQUE7SUFDakIsK0NBQTJCLENBQUE7QUFDNUIsQ0FBQyxFQUpXLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFJM0I7QUFFRDs7Ozs7Ozs7Ozs7OztFQWFFO0FBQ0YsTUFBTSxDQUFOLElBQVksT0E4Q1g7QUE5Q0QsV0FBWSxPQUFPO0lBQ2xCOztPQUVHO0lBQ0gscUNBQTBCLENBQUE7SUFFMUI7O09BRUc7SUFDSCxtQ0FBd0IsQ0FBQTtJQUV4Qjs7T0FFRztJQUNILHFEQUEwQyxDQUFBO0lBRTFDOztPQUVHO0lBQ0gsbUNBQXdCLENBQUE7SUFFeEI7O09BRUc7SUFDSCx5Q0FBOEIsQ0FBQTtJQUU5Qjs7T0FFRztJQUNILG1EQUF3QyxDQUFBO0lBRXhDOztPQUVHO0lBQ0gseURBQThDLENBQUE7SUFFOUM7O09BRUc7SUFDSCx5Q0FBOEIsQ0FBQTtJQUU5Qjs7O09BR0c7SUFDSCx5REFBOEMsQ0FBQTtBQUMvQyxDQUFDLEVBOUNXLE9BQU8sS0FBUCxPQUFPLFFBOENsQjtBQUVELE1BQU0sT0FBTyx3QkFBd0I7SUFDcEMsWUFDUyxPQUFlLEVBQ2YsT0FBZSxFQUNmLFNBQWlCLEVBQ2pCLGdCQUFrQztRQUhsQyxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtJQUN4QyxDQUFDO0lBRUo7Ozs7OztPQU1HO0lBQ0ssTUFBTSxDQUFDLGlCQUFpQixDQUFDLE9BQWU7UUFDL0MsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUE7UUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVuQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsY0FBYyxDQUFDLE1BQWM7UUFDNUIsUUFBUSxNQUFNLEVBQUUsQ0FBQztZQUNoQixLQUFLLE9BQU8sQ0FBQyxrQkFBa0I7Z0JBQzlCLE9BQU8sd0JBQXdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBLENBQUMseUJBQXlCO1lBQzFGLEtBQUssT0FBTyxDQUFDLEtBQUs7Z0JBQ2pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQSxDQUFDLDBCQUEwQjtZQUMvQyxLQUFLLE9BQU8sQ0FBQyxRQUFRO2dCQUNwQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7WUFDdEIsS0FBSyxPQUFPLENBQUMsUUFBUTtnQkFDcEIsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFBO1lBQ3pCLEtBQUssT0FBTyxDQUFDLGFBQWE7Z0JBQ3pCLE9BQU8sYUFBYSxDQUFBLENBQUMsNENBQTRDO1lBQ2xFLEtBQUssT0FBTyxDQUFDLGdCQUFnQjtnQkFDNUIsT0FBTyxVQUFVLENBQUEsQ0FBQyx3RUFBd0U7WUFDM0YsS0FBSyxPQUFPLENBQUMsZ0JBQWdCO2dCQUM1QixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtZQUM3QjtnQkFDQyxPQUFPLEVBQUUsQ0FBQTtRQUNYLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVTtRQUNULE1BQU0sT0FBTyxHQUFxQixJQUFJLEdBQUcsRUFBZSxDQUFBO1FBQ3hELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDM0MsS0FBSyxNQUFNLEtBQUssSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztDQUNEIn0=