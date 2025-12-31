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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { State } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL } from './abstractUpdateService.js';
let LinuxUpdateService = class LinuxUpdateService extends AbstractUpdateService {
    constructor(lifecycleMainService, configurationService, environmentMainService, requestService, logService, nativeHostMainService, productService) {
        super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);
        this.nativeHostMainService = nativeHostMainService;
    }
    buildUpdateFeedUrl(quality) {
        return createUpdateURL(`linux-${process.arch}`, quality, this.productService);
    }
    doCheckForUpdates(context) {
        if (!this.url) {
            return;
        }
        this.setState(State.CheckingForUpdates(context));
        this.requestService
            .request({ url: this.url }, CancellationToken.None)
            .then(asJson)
            .then((update) => {
            if (!update || !update.url || !update.version || !update.productVersion) {
                this.setState(State.Idle(1 /* UpdateType.Archive */));
            }
            else {
                this.setState(State.AvailableForDownload(update));
            }
        })
            .then(undefined, (err) => {
            this.logService.error(err);
            // only show message when explicitly checking for updates
            const message = !!context ? err.message || err : undefined;
            this.setState(State.Idle(1 /* UpdateType.Archive */, message));
        });
    }
    async doDownloadUpdate(state) {
        // Use the download URL if available as we don't currently detect the package type that was
        // installed and the website download page is more useful than the tarball generally.
        if (this.productService.downloadUrl && this.productService.downloadUrl.length > 0) {
            this.nativeHostMainService.openExternal(undefined, this.productService.downloadUrl);
        }
        else if (state.update.url) {
            this.nativeHostMainService.openExternal(undefined, state.update.url);
        }
        this.setState(State.Idle(1 /* UpdateType.Archive */));
    }
};
LinuxUpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IConfigurationService),
    __param(2, IEnvironmentMainService),
    __param(3, IRequestService),
    __param(4, ILogService),
    __param(5, INativeHostMainService),
    __param(6, IProductService)
], LinuxUpdateService);
export { LinuxUpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS5saW51eC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VwZGF0ZS9lbGVjdHJvbi1tYWluL3VwZGF0ZVNlcnZpY2UubGludXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBaUMsS0FBSyxFQUFjLE1BQU0scUJBQXFCLENBQUE7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTVFLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEscUJBQXFCO0lBQzVELFlBQ3dCLG9CQUEyQyxFQUMzQyxvQkFBMkMsRUFDekMsc0JBQStDLEVBQ3ZELGNBQStCLEVBQ25DLFVBQXVCLEVBQ0sscUJBQTZDLEVBQ3JFLGNBQStCO1FBRWhELEtBQUssQ0FDSixvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLHNCQUFzQixFQUN0QixjQUFjLEVBQ2QsVUFBVSxFQUNW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