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
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ITrustedDomainService } from './trustedDomainService.js';
import { isURLDomainTrusted } from '../common/trustedDomains.js';
import { configureOpenerTrustedDomainsHandler, readStaticTrustedDomains } from './trustedDomains.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
let OpenerValidatorContributions = class OpenerValidatorContributions {
    constructor(_openerService, _storageService, _dialogService, _productService, _quickInputService, _editorService, _clipboardService, _telemetryService, _instantiationService, _configurationService, _workspaceTrustService, _trustedDomainService) {
        this._openerService = _openerService;
        this._storageService = _storageService;
        this._dialogService = _dialogService;
        this._productService = _productService;
        this._quickInputService = _quickInputService;
        this._editorService = _editorService;
        this._clipboardService = _clipboardService;
        this._telemetryService = _telemetryService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._workspaceTrustService = _workspaceTrustService;
        this._trustedDomainService = _trustedDomainService;
        this._openerService.registerValidator({
            shouldOpen: (uri, options) => this.validateLink(uri, options),
        });
    }
    async validateLink(resource, openOptions) {
        if (!matchesScheme(resource, Schemas.http) && !matchesScheme(resource, Schemas.https)) {
            return true;
        }
        if (openOptions?.fromWorkspace &&
            this._workspaceTrustService.isWorkspaceTrusted() &&
            !this._configurationService.getValue('workbench.trustedDomains.promptInTrustedWorkspace')) {
            return true;
        }
        const originalResource = resource;
        let resourceUri;
        if (typeof resource === 'string') {
            resourceUri = URI.parse(resource);
        }
        else {
            resourceUri = resource;
        }
        if (this._trustedDomainService.isValid(resourceUri)) {
            return true;
        }
        else {
            const { scheme, authority, path, query, fragment } = resourceUri;
            let formattedLink = `${scheme}://${authority}${path}`;
            const linkTail = `${query ? '?' + query : ''}${fragment ? '#' + fragment : ''}`;
            const remainingLength = Math.max(0, 60 - formattedLink.length);
            const linkTailLengthToKeep = Math.min(Math.max(5, remainingLength), linkTail.length);
            if (linkTailLengthToKeep === linkTail.length) {
                formattedLink += linkTail;
            }
            else {
                // keep the first char ? or #
                // add ... and keep the tail end as much as possible
                formattedLink +=
                    linkTail.charAt(0) +
                        '...' +
                        linkTail.substring(linkTail.length - linkTailLengthToKeep + 1);
            }
            const { result } = await this._dialogService.prompt({
                type: Severity.Info,
                message: localize('openExternalLinkAt', 'Do you want {0} to open the external website?', this._productService.nameShort),
                detail: typeof originalResource === 'string' ? originalResource : formattedLink,
                buttons: [
                    {
                        label: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, '&&Open'),
                        run: () => true,
                    },
                    {
                        label: localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, '&&Copy'),
                        run: () => {
                            this._clipboardService.writeText(typeof originalResource === 'string'
                                ? originalResource
                                : resourceUri.toString(true));
                            return false;
                        },
                    },
                    {
                        label: localize({ key: 'configureTrustedDomains', comment: ['&& denotes a mnemonic'] }, 'Configure &&Trusted Domains'),
                        run: async () => {
                            const { trustedDomains } = this._instantiationService.invokeFunction(readStaticTrustedDomains);
                            const domainToOpen = `${scheme}://${authority}`;
                            const pickedDomains = await configureOpenerTrustedDomainsHandler(trustedDomains, domainToOpen, resourceUri, this._quickInputService, this._storageService, this._editorService, this._telemetryService);
                            // Trust all domains
                            if (pickedDomains.indexOf('*') !== -1) {
                                return true;
                            }
                            // Trust current domain
                            if (isURLDomainTrusted(resourceUri, pickedDomains)) {
                                return true;
                            }
                            return false;
                        },
                    },
                ],
                cancelButton: {
                    run: () => false,
                },
            });
            return result;
        }
    }
};
OpenerValidatorContributions = __decorate([
    __param(0, IOpenerService),
    __param(1, IStorageService),
    __param(2, IDialogService),
    __param(3, IProductService),
    __param(4, IQuickInputService),
    __param(5, IEditorService),
    __param(6, IClipboardService),
    __param(7, ITelemetryService),
    __param(8, IInstantiationService),
    __param(9, IConfigurationService),
    __param(10, IWorkspaceTrustManagementService),
    __param(11, ITrustedDomainService)
], OpenerValidatorContributions);
export { OpenerValidatorContributions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnNWYWxpZGF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvYnJvd3Nlci90cnVzdGVkRG9tYWluc1ZhbGlkYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQWUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTFHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUxRSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0QjtJQUN4QyxZQUNrQyxjQUE4QixFQUM3QixlQUFnQyxFQUNqQyxjQUE4QixFQUM3QixlQUFnQyxFQUM3QixrQkFBc0MsRUFDMUMsY0FBOEIsRUFDM0IsaUJBQW9DLEVBQ3BDLGlCQUFvQyxFQUNoQyxxQkFBNEMsRUFDNUMscUJBQTRDLEVBRW5FLHNCQUF3RCxFQUNqQyxxQkFBNEM7UUFabkQsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQzdCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNqQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDN0Isb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQzdCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDMUMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQzNCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDcEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNoQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFFbkUsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFrQztRQUNqQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBRXBGLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUM7WUFDckMsVUFBVSxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDO1NBQzdELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQXNCLEVBQUUsV0FBeUI7UUFDbkUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2RixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUNDLFdBQVcsRUFBRSxhQUFhO1lBQzFCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsRUFBRTtZQUNoRCxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsbURBQW1ELENBQUMsRUFDeEYsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFBO1FBQ2pDLElBQUksV0FBZ0IsQ0FBQTtRQUNwQixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLFdBQVcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7YUFBTSxDQUFDO1lBQ1AsV0FBVyxHQUFHLFFBQVEsQ0FBQTtRQUN2QixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDckQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsV0FBVyxDQUFBO1lBQ2hFLElBQUksYUFBYSxHQUFHLEdBQUcsTUFBTSxNQUFNLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQTtZQUVyRCxNQUFNLFFBQVEsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUE7WUFFL0UsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5RCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRXBGLElBQUksb0JBQW9CLEtBQUssUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM5QyxhQUFhLElBQUksUUFBUSxDQUFBO1lBQzFCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCw2QkFBNkI7Z0JBQzdCLG9EQUFvRDtnQkFDcEQsYUFBYTtvQkFDWixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDbEIsS0FBSzt3QkFDTCxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDaEUsQ0FBQztZQUVELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFVO2dCQUM1RCxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7Z0JBQ25CLE9BQU8sRUFBRSxRQUFRLENBQ2hCLG9CQUFvQixFQUNwQiwrQ0FBK0MsRUFDL0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQzlCO2dCQUNELE1BQU0sRUFBRSxPQUFPLGdCQUFnQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGFBQWE7Z0JBQy9FLE9BQU8sRUFBRTtvQkFDUjt3QkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDO3dCQUM5RSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtxQkFDZjtvQkFDRDt3QkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDO3dCQUM5RSxHQUFHLEVBQUUsR0FBRyxFQUFFOzRCQUNULElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQy9CLE9BQU8sZ0JBQWdCLEtBQUssUUFBUTtnQ0FDbkMsQ0FBQyxDQUFDLGdCQUFnQjtnQ0FDbEIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQzdCLENBQUE7NEJBQ0QsT0FBTyxLQUFLLENBQUE7d0JBQ2IsQ0FBQztxQkFDRDtvQkFDRDt3QkFDQyxLQUFLLEVBQUUsUUFBUSxDQUNkLEVBQUUsR0FBRyxFQUFFLHlCQUF5QixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDdEUsNkJBQTZCLENBQzdCO3dCQUNELEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTs0QkFDZixNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQ3ZCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQTs0QkFDcEUsTUFBTSxZQUFZLEdBQUcsR0FBRyxNQUFNLE1BQU0sU0FBUyxFQUFFLENBQUE7NEJBQy9DLE1BQU0sYUFBYSxHQUFHLE1BQU0sb0NBQW9DLENBQy9ELGNBQWMsRUFDZCxZQUFZLEVBQ1osV0FBVyxFQUNYLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFBOzRCQUNELG9CQUFvQjs0QkFDcEIsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0NBQ3ZDLE9BQU8sSUFBSSxDQUFBOzRCQUNaLENBQUM7NEJBQ0QsdUJBQXVCOzRCQUN2QixJQUFJLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsRUFBRSxDQUFDO2dDQUNwRCxPQUFPLElBQUksQ0FBQTs0QkFDWixDQUFDOzRCQUNELE9BQU8sS0FBSyxDQUFBO3dCQUNiLENBQUM7cUJBQ0Q7aUJBQ0Q7Z0JBQ0QsWUFBWSxFQUFFO29CQUNiLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO2lCQUNoQjthQUNELENBQUMsQ0FBQTtZQUVGLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBOUhZLDRCQUE0QjtJQUV0QyxXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsZ0NBQWdDLENBQUE7SUFFaEMsWUFBQSxxQkFBcUIsQ0FBQTtHQWRYLDRCQUE0QixDQThIeEMifQ==