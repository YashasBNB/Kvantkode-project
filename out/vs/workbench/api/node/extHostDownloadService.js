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
import { join } from '../../../base/common/path.js';
import { tmpdir } from 'os';
import { generateUuid } from '../../../base/common/uuid.js';
import { IExtHostCommands } from '../common/extHostCommands.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { MainContext } from '../common/extHost.protocol.js';
import { URI } from '../../../base/common/uri.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
let ExtHostDownloadService = class ExtHostDownloadService extends Disposable {
    constructor(extHostRpc, commands) {
        super();
        const proxy = extHostRpc.getProxy(MainContext.MainThreadDownloadService);
        commands.registerCommand(false, '_workbench.downloadResource', async (resource) => {
            const location = URI.file(join(tmpdir(), generateUuid()));
            await proxy.$download(resource, location);
            return location;
        });
    }
};
ExtHostDownloadService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostCommands)
], ExtHostDownloadService);
export { ExtHostDownloadService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvd25sb2FkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0RG93bmxvYWRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUU1RCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFDckQsWUFDcUIsVUFBOEIsRUFDaEMsUUFBMEI7UUFFNUMsS0FBSyxFQUFFLENBQUE7UUFFUCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBRXhFLFFBQVEsQ0FBQyxlQUFlLENBQ3ZCLEtBQUssRUFDTCw2QkFBNkIsRUFDN0IsS0FBSyxFQUFFLFFBQWEsRUFBZ0IsRUFBRTtZQUNyQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekQsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN6QyxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBbkJZLHNCQUFzQjtJQUVoQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZ0JBQWdCLENBQUE7R0FITixzQkFBc0IsQ0FtQmxDIn0=