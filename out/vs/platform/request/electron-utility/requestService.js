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
import { net } from 'electron';
import { RequestService as NodeRequestService, } from '../node/requestService.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { ILogService } from '../../log/common/log.js';
function getRawRequest(options) {
    return net.request;
}
let RequestService = class RequestService extends NodeRequestService {
    constructor(configurationService, environmentService, logService) {
        super('local', configurationService, environmentService, logService);
    }
    request(options, token) {
        return super.request({ ...(options || {}), getRawRequest, isChromiumNetwork: true }, token);
    }
};
RequestService = __decorate([
    __param(0, IConfigurationService),
    __param(1, INativeEnvironmentService),
    __param(2, ILogService)
], RequestService);
export { RequestService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZXF1ZXN0L2VsZWN0cm9uLXV0aWxpdHkvcmVxdWVzdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUc5QixPQUFPLEVBRU4sY0FBYyxJQUFJLGtCQUFrQixHQUNwQyxNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVyRCxTQUFTLGFBQWEsQ0FBQyxPQUF3QjtJQUM5QyxPQUFPLEdBQUcsQ0FBQyxPQUFxQyxDQUFBO0FBQ2pELENBQUM7QUFFTSxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsa0JBQWtCO0lBQ3JELFlBQ3dCLG9CQUEyQyxFQUN2QyxrQkFBNkMsRUFDM0QsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRVEsT0FBTyxDQUFDLE9BQXdCLEVBQUUsS0FBd0I7UUFDbEUsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDNUYsQ0FBQztDQUNELENBQUE7QUFaWSxjQUFjO0lBRXhCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLFdBQVcsQ0FBQTtHQUpELGNBQWMsQ0FZMUIifQ==