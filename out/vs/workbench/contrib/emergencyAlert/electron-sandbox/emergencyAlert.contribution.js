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
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { arch, platform } from '../../../../base/common/process.js';
let EmergencyAlert = class EmergencyAlert {
    static { this.ID = 'workbench.contrib.emergencyAlert'; }
    constructor(bannerService, requestService, productService, logService) {
        this.bannerService = bannerService;
        this.requestService = requestService;
        this.productService = productService;
        this.logService = logService;
        if (productService.quality !== 'insider') {
            return; // only enabled in insiders for now
        }
        const emergencyAlertUrl = productService.emergencyAlertUrl;
        if (!emergencyAlertUrl) {
            return; // no emergency alert configured
        }
        this.fetchAlerts(emergencyAlertUrl);
    }
    async fetchAlerts(url) {
        try {
            await this.doFetchAlerts(url);
        }
        catch (e) {
            this.logService.error(e);
        }
    }
    async doFetchAlerts(url) {
        const requestResult = await this.requestService.request({ type: 'GET', url, disableCache: true }, CancellationToken.None);
        if (requestResult.res.statusCode !== 200) {
            throw new Error(`Failed to fetch emergency alerts: HTTP ${requestResult.res.statusCode}`);
        }
        const emergencyAlerts = await asJson(requestResult);
        if (!emergencyAlerts) {
            return;
        }
        for (const emergencyAlert of emergencyAlerts.alerts) {
            if (emergencyAlert.commit !== this.productService.commit || // version mismatch
                (emergencyAlert.platform && emergencyAlert.platform !== platform) || // platform mismatch
                (emergencyAlert.arch && emergencyAlert.arch !== arch) // arch mismatch
            ) {
                return;
            }
            this.bannerService.show({
                id: 'emergencyAlert.banner',
                icon: Codicon.warning,
                message: emergencyAlert.message,
                actions: emergencyAlert.actions,
            });
            break;
        }
    }
};
EmergencyAlert = __decorate([
    __param(0, IBannerService),
    __param(1, IRequestService),
    __param(2, IProductService),
    __param(3, ILogService)
], EmergencyAlert);
export { EmergencyAlert };
registerWorkbenchContribution2('workbench.emergencyAlert', EmergencyAlert, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1lcmdlbmN5QWxlcnQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZW1lcmdlbmN5QWxlcnQvZWxlY3Ryb24tc2FuZGJveC9lbWVyZ2VuY3lBbGVydC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLDhCQUE4QixHQUU5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFtQjVELElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7YUFDVixPQUFFLEdBQUcsa0NBQWtDLEFBQXJDLENBQXFDO0lBRXZELFlBQ2tDLGFBQTZCLEVBQzVCLGNBQStCLEVBQy9CLGNBQStCLEVBQ25DLFVBQXVCO1FBSHBCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM1QixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDL0IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ25DLGVBQVUsR0FBVixVQUFVLENBQWE7UUFFckQsSUFBSSxjQUFjLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFDLE9BQU0sQ0FBQyxtQ0FBbUM7UUFDM0MsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixDQUFBO1FBQzFELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3hCLE9BQU0sQ0FBQyxnQ0FBZ0M7UUFDeEMsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFXO1FBQ3BDLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5QixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFXO1FBQ3RDLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQ3RELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxFQUN4QyxpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7UUFFRCxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUMxRixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsTUFBTSxNQUFNLENBQW1CLGFBQWEsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUVELEtBQUssTUFBTSxjQUFjLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JELElBQ0MsY0FBYyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxtQkFBbUI7Z0JBQzNFLENBQUMsY0FBYyxDQUFDLFFBQVEsSUFBSSxjQUFjLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxJQUFJLG9CQUFvQjtnQkFDekYsQ0FBQyxjQUFjLENBQUMsSUFBSSxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsZ0JBQWdCO2NBQ3JFLENBQUM7Z0JBQ0YsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDdkIsRUFBRSxFQUFFLHVCQUF1QjtnQkFDM0IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPO2dCQUNyQixPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87Z0JBQy9CLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTzthQUMvQixDQUFDLENBQUE7WUFFRixNQUFLO1FBQ04sQ0FBQztJQUNGLENBQUM7O0FBOURXLGNBQWM7SUFJeEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7R0FQRCxjQUFjLENBK0QxQjs7QUFFRCw4QkFBOEIsQ0FDN0IsMEJBQTBCLEVBQzFCLGNBQWMsb0NBRWQsQ0FBQSJ9