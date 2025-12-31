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
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { NativeMcpDiscoveryHelperChannelName, } from '../../../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { NativeFilesystemMcpDiscovery } from '../common/discovery/nativeMcpDiscoveryAbstract.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
let NativeMcpDiscovery = class NativeMcpDiscovery extends NativeFilesystemMcpDiscovery {
    constructor(mainProcess, logService, labelService, fileService, instantiationService, mcpRegistry, configurationService) {
        super(null, labelService, fileService, instantiationService, mcpRegistry, configurationService);
        this.mainProcess = mainProcess;
        this.logService = logService;
    }
    start() {
        const service = ProxyChannel.toService(this.mainProcess.getChannel(NativeMcpDiscoveryHelperChannelName));
        service.load().then((data) => this.setDetails(data), (err) => {
            this.logService.warn('Error getting main process MCP environment', err);
            this.setDetails(undefined);
        });
    }
};
NativeMcpDiscovery = __decorate([
    __param(0, IMainProcessService),
    __param(1, ILogService),
    __param(2, ILabelService),
    __param(3, IFileService),
    __param(4, IInstantiationService),
    __param(5, IMcpRegistry),
    __param(6, IConfigurationService)
], NativeMcpDiscovery);
export { NativeMcpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTXBjRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlTXBjRGlzY292ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sbUNBQW1DLEdBQ25DLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsNEJBQTRCO0lBQ25FLFlBQ3VDLFdBQWdDLEVBQ3hDLFVBQXVCLEVBQ3RDLFlBQTJCLEVBQzVCLFdBQXlCLEVBQ2hCLG9CQUEyQyxFQUNwRCxXQUF5QixFQUNoQixvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBUnpELGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQUN4QyxlQUFVLEdBQVYsVUFBVSxDQUFhO0lBUXRELENBQUM7SUFFZSxLQUFLO1FBQ3BCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQ3JDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLG1DQUFtQyxDQUFDLENBQ2hFLENBQUE7UUFFRCxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUNsQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFDL0IsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZFLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0IsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFCWSxrQkFBa0I7SUFFNUIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxxQkFBcUIsQ0FBQTtHQVJYLGtCQUFrQixDQTBCOUIifQ==