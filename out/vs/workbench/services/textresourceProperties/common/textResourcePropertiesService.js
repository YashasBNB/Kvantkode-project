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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { OS } from '../../../../base/common/platform.js';
import { Schemas } from '../../../../base/common/network.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
let TextResourcePropertiesService = class TextResourcePropertiesService {
    constructor(configurationService, remoteAgentService, environmentService, storageService) {
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.remoteEnvironment = null;
        remoteAgentService.getEnvironment().then((remoteEnv) => (this.remoteEnvironment = remoteEnv));
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', {
            overrideIdentifier: language,
            resource,
        });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        const os = this.getOS(resource);
        return os === 3 /* OperatingSystem.Linux */ || os === 2 /* OperatingSystem.Macintosh */ ? '\n' : '\r\n';
    }
    getOS(resource) {
        let os = OS;
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (remoteAuthority) {
            if (resource && resource.scheme !== Schemas.file) {
                const osCacheKey = `resource.authority.os.${remoteAuthority}`;
                os = this.remoteEnvironment
                    ? this.remoteEnvironment.os
                    : /* Get it from cache */ this.storageService.getNumber(osCacheKey, 1 /* StorageScope.WORKSPACE */, OS);
                this.storageService.store(osCacheKey, os, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }
        return os;
    }
};
TextResourcePropertiesService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IStorageService)
], TextResourcePropertiesService);
export { TextResourcePropertiesService };
registerSingleton(ITextResourcePropertiesService, TextResourcePropertiesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlUHJvcGVydGllc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dHJlc291cmNlUHJvcGVydGllcy9jb21tb24vdGV4dFJlc291cmNlUHJvcGVydGllc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDaEgsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUV4RSxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE2QjtJQUt6QyxZQUN3QixvQkFBNEQsRUFDOUQsa0JBQXVDLEVBQzlCLGtCQUFpRSxFQUM5RSxjQUFnRDtRQUh6Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBRXBDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBOEI7UUFDN0QsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBTjFELHNCQUFpQixHQUFtQyxJQUFJLENBQUE7UUFRL0Qsa0JBQWtCLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFBO0lBQzlGLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBYyxFQUFFLFFBQWlCO1FBQ3ZDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFO1lBQzNELGtCQUFrQixFQUFFLFFBQVE7WUFDNUIsUUFBUTtTQUNSLENBQUMsQ0FBQTtRQUNGLElBQUksR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdEQsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO1FBQ0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQixPQUFPLEVBQUUsa0NBQTBCLElBQUksRUFBRSxzQ0FBOEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDeEYsQ0FBQztJQUVPLEtBQUssQ0FBQyxRQUFjO1FBQzNCLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQTtRQUVYLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUE7UUFDL0QsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbEQsTUFBTSxVQUFVLEdBQUcseUJBQXlCLGVBQWUsRUFBRSxDQUFBO2dCQUM3RCxFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQjtvQkFDMUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO29CQUMzQixDQUFDLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQ3JELFVBQVUsa0NBRVYsRUFBRSxDQUNGLENBQUE7Z0JBQ0gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsZ0VBQWdELENBQUE7WUFDekYsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7Q0FDRCxDQUFBO0FBOUNZLDZCQUE2QjtJQU12QyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLGVBQWUsQ0FBQTtHQVRMLDZCQUE2QixDQThDekM7O0FBRUQsaUJBQWlCLENBQ2hCLDhCQUE4QixFQUM5Qiw2QkFBNkIsb0NBRTdCLENBQUEifQ==