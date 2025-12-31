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
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Memento } from '../../../common/memento.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { BaseAssignmentService } from '../../../../platform/assignment/common/assignmentService.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
export const IWorkbenchAssignmentService = createDecorator('WorkbenchAssignmentService');
class MementoKeyValueStorage {
    constructor(memento) {
        this.memento = memento;
        this.mementoObj = memento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    async getValue(key, defaultValue) {
        const value = await this.mementoObj[key];
        return value || defaultValue;
    }
    setValue(key, value) {
        this.mementoObj[key] = value;
        this.memento.saveMemento();
    }
}
class WorkbenchAssignmentServiceTelemetry {
    constructor(telemetryService, productService) {
        this.telemetryService = telemetryService;
        this.productService = productService;
    }
    get assignmentContext() {
        return this._lastAssignmentContext?.split(';');
    }
    // __GDPR__COMMON__ "abexp.assignmentcontext" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    setSharedProperty(name, value) {
        if (name === this.productService.tasConfig?.assignmentContextTelemetryPropertyName) {
            this._lastAssignmentContext = value;
        }
        this.telemetryService.setExperimentProperty(name, value);
    }
    postEvent(eventName, props) {
        const data = {};
        for (const [key, value] of props.entries()) {
            data[key] = value;
        }
        /* __GDPR__
            "query-expfeature" : {
                "owner": "sbatten",
                "comment": "Logs queries to the experiment service by feature for metric calculations",
                "ABExp.queriedFeature": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The experimental feature being queried" }
            }
        */
        this.telemetryService.publicLog(eventName, data);
    }
}
let WorkbenchAssignmentService = class WorkbenchAssignmentService extends BaseAssignmentService {
    constructor(telemetryService, storageService, configurationService, productService, environmentService) {
        super(telemetryService.machineId, configurationService, productService, environmentService, new WorkbenchAssignmentServiceTelemetry(telemetryService, productService), new MementoKeyValueStorage(new Memento('experiment.service.memento', storageService)));
        this.telemetryService = telemetryService;
    }
    get experimentsEnabled() {
        return this.configurationService.getValue('workbench.enableExperiments') === true;
    }
    async getTreatment(name) {
        const result = await super.getTreatment(name);
        this.telemetryService.publicLog2('tasClientReadTreatmentComplete', {
            treatmentName: name,
            treatmentValue: JSON.stringify(result),
        });
        return result;
    }
    async getCurrentExperiments() {
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        await this.tasClient;
        return this.telemetry?.assignmentContext;
    }
};
WorkbenchAssignmentService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, IProductService),
    __param(4, IEnvironmentService)
], WorkbenchAssignmentService);
export { WorkbenchAssignmentService };
registerSingleton(IWorkbenchAssignmentService, WorkbenchAssignmentService, 1 /* InstantiationType.Delayed */);
const registry = Registry.as(ConfigurationExtensions.Configuration);
registry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.enableExperiments': {
            type: 'boolean',
            description: localize('workbench.enableExperiments', 'Fetches experiments to run from a Microsoft online service.'),
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            restricted: true,
            tags: ['usesOnlineServices'],
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWdubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXNzaWdubWVudC9jb21tb24vYXNzaWdubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixPQUFPLEVBQWlCLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRixPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRTVGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FDekQsNEJBQTRCLENBQzVCLENBQUE7QUFNRCxNQUFNLHNCQUFzQjtJQUUzQixZQUFvQixPQUFnQjtRQUFoQixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ25DLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsa0VBQWlELENBQUE7SUFDdEYsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUksR0FBVyxFQUFFLFlBQTRCO1FBQzFELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4QyxPQUFPLEtBQUssSUFBSSxZQUFZLENBQUE7SUFDN0IsQ0FBQztJQUVELFFBQVEsQ0FBSSxHQUFXLEVBQUUsS0FBUTtRQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQTtRQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQzNCLENBQUM7Q0FDRDtBQUVELE1BQU0sbUNBQW1DO0lBRXhDLFlBQ1MsZ0JBQW1DLEVBQ25DLGNBQStCO1FBRC9CLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDbkMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO0lBQ3JDLENBQUM7SUFFSixJQUFJLGlCQUFpQjtRQUNwQixPQUFPLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELG1IQUFtSDtJQUNuSCxpQkFBaUIsQ0FBQyxJQUFZLEVBQUUsS0FBYTtRQUM1QyxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxzQ0FBc0MsRUFBRSxDQUFDO1lBQ3BGLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUE7UUFDcEMsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVELFNBQVMsQ0FBQyxTQUFpQixFQUFFLEtBQTBCO1FBQ3RELE1BQU0sSUFBSSxHQUFtQixFQUFFLENBQUE7UUFDL0IsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7UUFDbEIsQ0FBQztRQUVEOzs7Ozs7VUFNRTtRQUNGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2pELENBQUM7Q0FDRDtBQUVNLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEscUJBQXFCO0lBQ3BFLFlBQzRCLGdCQUFtQyxFQUM3QyxjQUErQixFQUN6QixvQkFBMkMsRUFDakQsY0FBK0IsRUFDM0Isa0JBQXVDO1FBRTVELEtBQUssQ0FDSixnQkFBZ0IsQ0FBQyxTQUFTLEVBQzFCLG9CQUFvQixFQUNwQixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLElBQUksbUNBQW1DLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLEVBQ3pFLElBQUksc0JBQXNCLENBQUMsSUFBSSxPQUFPLENBQUMsNEJBQTRCLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FDckYsQ0FBQTtRQWIwQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO0lBYy9ELENBQUM7SUFFRCxJQUF1QixrQkFBa0I7UUFDeEMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLDZCQUE2QixDQUFDLEtBQUssSUFBSSxDQUFBO0lBQ2xGLENBQUM7SUFFUSxLQUFLLENBQUMsWUFBWSxDQUMxQixJQUFZO1FBRVosTUFBTSxNQUFNLEdBQUcsTUFBTSxLQUFLLENBQUMsWUFBWSxDQUFJLElBQUksQ0FBQyxDQUFBO1FBcUJoRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUc5QixnQ0FBZ0MsRUFBRTtZQUNuQyxhQUFhLEVBQUUsSUFBSTtZQUNuQixjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDdEMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUVwQixPQUFRLElBQUksQ0FBQyxTQUFpRCxFQUFFLGlCQUFpQixDQUFBO0lBQ2xGLENBQUM7Q0FDRCxDQUFBO0FBdEVZLDBCQUEwQjtJQUVwQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsbUJBQW1CLENBQUE7R0FOVCwwQkFBMEIsQ0FzRXRDOztBQUVELGlCQUFpQixDQUNoQiwyQkFBMkIsRUFDM0IsMEJBQTBCLG9DQUUxQixDQUFBO0FBQ0QsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUE7QUFDM0YsUUFBUSxDQUFDLHFCQUFxQixDQUFDO0lBQzlCLEdBQUcsOEJBQThCO0lBQ2pDLFVBQVUsRUFBRTtRQUNYLDZCQUE2QixFQUFFO1lBQzlCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsNkJBQTZCLEVBQzdCLDZEQUE2RCxDQUM3RDtZQUNELE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyx3Q0FBZ0M7WUFDckMsVUFBVSxFQUFFLElBQUk7WUFDaEIsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7U0FDNUI7S0FDRDtDQUNELENBQUMsQ0FBQSJ9