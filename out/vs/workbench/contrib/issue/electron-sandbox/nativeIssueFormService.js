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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import product from '../../../../platform/product/common/product.js';
import { IAuxiliaryWindowService } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IssueFormService } from '../browser/issueFormService.js';
import { IssueReporter } from './issueReporterService.js';
import './media/issueReporter.css';
let NativeIssueFormService = class NativeIssueFormService extends IssueFormService {
    constructor(instantiationService, auxiliaryWindowService, logService, dialogService, menuService, contextKeyService, hostService, nativeHostService, environmentService) {
        super(instantiationService, auxiliaryWindowService, menuService, contextKeyService, logService, dialogService, hostService);
        this.nativeHostService = nativeHostService;
        this.environmentService = environmentService;
        this.store = new DisposableStore();
    }
    // override to grab platform info
    async openReporter(data) {
        if (this.hasToReload(data)) {
            return;
        }
        const bounds = await this.nativeHostService.getActiveWindowPosition();
        if (!bounds) {
            return;
        }
        await this.openAuxIssueReporter(data, bounds);
        // Get platform information
        const { arch, release, type } = await this.nativeHostService.getOSProperties();
        this.arch = arch;
        this.release = release;
        this.type = type;
        // create issue reporter and instantiate
        if (this.issueReporterWindow) {
            const issueReporter = this.store.add(this.instantiationService.createInstance(IssueReporter, !!this.environmentService.disableExtensions, data, { type: this.type, arch: this.arch, release: this.release }, product, this.issueReporterWindow));
            issueReporter.render();
        }
        else {
            this.store.dispose();
        }
    }
};
NativeIssueFormService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IAuxiliaryWindowService),
    __param(2, ILogService),
    __param(3, IDialogService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, IHostService),
    __param(7, INativeHostService),
    __param(8, INativeEnvironmentService)
], NativeIssueFormService);
export { NativeIssueFormService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSXNzdWVGb3JtU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlSXNzdWVGb3JtU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxPQUFPLE1BQU0sZ0RBQWdELENBQUE7QUFDcEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDN0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN6RCxPQUFPLDJCQUEyQixDQUFBO0FBRTNCLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsZ0JBQWdCO0lBRzNELFlBQ3dCLG9CQUEyQyxFQUN6QyxzQkFB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