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
var WelcomeBannerContribution_1;
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { URI } from '../../../../base/common/uri.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let WelcomeBannerContribution = class WelcomeBannerContribution {
    static { WelcomeBannerContribution_1 = this; }
    static { this.WELCOME_BANNER_DISMISSED_KEY = 'workbench.banner.welcome.dismissed'; }
    constructor(bannerService, storageService, environmentService) {
        const welcomeBanner = environmentService.options?.welcomeBanner;
        if (!welcomeBanner) {
            return; // welcome banner is not enabled
        }
        if (storageService.getBoolean(WelcomeBannerContribution_1.WELCOME_BANNER_DISMISSED_KEY, 0 /* StorageScope.PROFILE */, false)) {
            return; // welcome banner dismissed
        }
        let icon = undefined;
        if (typeof welcomeBanner.icon === 'string') {
            icon = ThemeIcon.fromId(welcomeBanner.icon);
        }
        else if (welcomeBanner.icon) {
            icon = URI.revive(welcomeBanner.icon);
        }
        bannerService.show({
            id: 'welcome.banner',
            message: welcomeBanner.message,
            icon,
            actions: welcomeBanner.actions,
            onClose: () => {
                storageService.store(WelcomeBannerContribution_1.WELCOME_BANNER_DISMISSED_KEY, true, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            },
        });
    }
};
WelcomeBannerContribution = WelcomeBannerContribution_1 = __decorate([
    __param(0, IBannerService),
    __param(1, IStorageService),
    __param(2, IBrowserWorkbenchEnvironmentService)
], WelcomeBannerContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WelcomeBannerContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZUJhbm5lci5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lQmFubmVyL2Jyb3dzZXIvd2VsY29tZUJhbm5lci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUF5Qjs7YUFDTixpQ0FBNEIsR0FBRyxvQ0FBb0MsQUFBdkMsQ0FBdUM7SUFFM0YsWUFDaUIsYUFBNkIsRUFDNUIsY0FBK0IsRUFDWCxrQkFBdUQ7UUFFNUYsTUFBTSxhQUFhLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQTtRQUMvRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTSxDQUFDLGdDQUFnQztRQUN4QyxDQUFDO1FBRUQsSUFDQyxjQUFjLENBQUMsVUFBVSxDQUN4QiwyQkFBeUIsQ0FBQyw0QkFBNEIsZ0NBRXRELEtBQUssQ0FDTCxFQUNBLENBQUM7WUFDRixPQUFNLENBQUMsMkJBQTJCO1FBQ25DLENBQUM7UUFFRCxJQUFJLElBQUksR0FBZ0MsU0FBUyxDQUFBO1FBQ2pELElBQUksT0FBTyxhQUFhLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVDLElBQUksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QyxDQUFDO2FBQU0sSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFFRCxhQUFhLENBQUMsSUFBSSxDQUFDO1lBQ2xCLEVBQUUsRUFBRSxnQkFBZ0I7WUFDcEIsT0FBTyxFQUFFLGFBQWEsQ0FBQyxPQUFPO1lBQzlCLElBQUk7WUFDSixPQUFPLEVBQUUsYUFBYSxDQUFDLE9BQU87WUFDOUIsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixjQUFjLENBQUMsS0FBSyxDQUNuQiwyQkFBeUIsQ0FBQyw0QkFBNEIsRUFDdEQsSUFBSSw4REFHSixDQUFBO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7O0FBNUNJLHlCQUF5QjtJQUk1QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQ0FBbUMsQ0FBQTtHQU5oQyx5QkFBeUIsQ0E2QzlCO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsNkJBQTZCLENBQUMseUJBQXlCLGtDQUEwQixDQUFBIn0=