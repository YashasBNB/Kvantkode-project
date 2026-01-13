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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlUHJvcGVydGllc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0cmVzb3VyY2VQcm9wZXJ0aWVzL2NvbW1vbi90ZXh0UmVzb3VyY2VQcm9wZXJ0aWVzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNoSCxPQUFPLEVBQW1CLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXhFLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQTZCO0lBS3pDLFlBQ3dCLG9CQUE0RCxFQUM5RCxrQkFBdUMsRUFDOUIsa0JBQWlFLEVBQzlFLGNBQWdEO1FBSHpCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFcEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUE4QjtRQUM3RCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFOMUQsc0JBQWlCLEdBQW1DLElBQUksQ0FBQTtRQVEvRCxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDOUYsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFjLEVBQUUsUUFBaUI7UUFDdkMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUU7WUFDM0Qsa0JBQWtCLEVBQUUsUUFBUTtZQUM1QixRQUFRO1NBQ1IsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLEdBQUcsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUN0RCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7UUFDRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9CLE9BQU8sRUFBRSxrQ0FBMEIsSUFBSSxFQUFFLHNDQUE4QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtJQUN4RixDQUFDO0lBRU8sS0FBSyxDQUFDLFFBQWM7UUFDM0IsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFBO1FBRVgsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQTtRQUMvRCxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsRCxNQUFNLFVBQVUsR0FBRyx5QkFBeUIsZUFBZSxFQUFFLENBQUE7Z0JBQzdELEVBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCO29CQUMxQixDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7b0JBQzNCLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FDckQsVUFBVSxrQ0FFVixFQUFFLENBQ0YsQ0FBQTtnQkFDSCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxnRUFBZ0QsQ0FBQTtZQUN6RixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNELENBQUE7QUE5Q1ksNkJBQTZCO0lBTXZDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsZUFBZSxDQUFBO0dBVEwsNkJBQTZCLENBOEN6Qzs7QUFFRCxpQkFBaUIsQ0FDaEIsOEJBQThCLEVBQzlCLDZCQUE2QixvQ0FFN0IsQ0FBQSJ9