/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
const TRUSTED_DOMAINS_URI = URI.parse('trustedDomains:/Trusted Domains');
export const TRUSTED_DOMAINS_STORAGE_KEY = 'http.linkProtectionTrustedDomains';
export const TRUSTED_DOMAINS_CONTENT_STORAGE_KEY = 'http.linkProtectionTrustedDomainsContent';
export const manageTrustedDomainSettingsCommand = {
    id: 'workbench.action.manageTrustedDomain',
    description: {
        description: localize2('trustedDomain.manageTrustedDomain', 'Manage Trusted Domains'),
        args: [],
    },
    handler: async (accessor) => {
        const editorService = accessor.get(IEditorService);
        editorService.openEditor({
            resource: TRUSTED_DOMAINS_URI,
            languageId: 'jsonc',
            options: { pinned: true },
        });
        return;
    },
};
export async function configureOpenerTrustedDomainsHandler(trustedDomains, domainToConfigure, resource, quickInputService, storageService, editorService, telemetryService) {
    const parsedDomainToConfigure = URI.parse(domainToConfigure);
    const toplevelDomainSegements = parsedDomainToConfigure.authority.split('.');
    const domainEnd = toplevelDomainSegements.slice(toplevelDomainSegements.length - 2).join('.');
    const topLevelDomain = '*.' + domainEnd;
    const options = [];
    options.push({
        type: 'item',
        label: localize('trustedDomain.trustDomain', 'Trust {0}', domainToConfigure),
        id: 'trust',
        toTrust: domainToConfigure,
        picked: true,
    });
    const isIP = toplevelDomainSegements.length === 4 &&
        toplevelDomainSegements.every((segment) => Number.isInteger(+segment) || Number.isInteger(+segment.split(':')[0]));
    if (isIP) {
        if (parsedDomainToConfigure.authority.includes(':')) {
            const base = parsedDomainToConfigure.authority.split(':')[0];
            options.push({
                type: 'item',
                label: localize('trustedDomain.trustAllPorts', 'Trust {0} on all ports', base),
                toTrust: base + ':*',
                id: 'trust',
            });
        }
    }
    else {
        options.push({
            type: 'item',
            label: localize('trustedDomain.trustSubDomain', 'Trust {0} and all its subdomains', domainEnd),
            toTrust: topLevelDomain,
            id: 'trust',
        });
    }
    options.push({
        type: 'item',
        label: localize('trustedDomain.trustAllDomains', 'Trust all domains (disables link protection)'),
        toTrust: '*',
        id: 'trust',
    });
    options.push({
        type: 'item',
        label: localize('trustedDomain.manageTrustedDomains', 'Manage Trusted Domains'),
        id: 'manage',
    });
    const pickedResult = await quickInputService.pick(options, {
        activeItem: options[0],
    });
    if (pickedResult && pickedResult.id) {
        switch (pickedResult.id) {
            case 'manage':
                await editorService.openEditor({
                    resource: TRUSTED_DOMAINS_URI.with({ fragment: resource.toString() }),
                    languageId: 'jsonc',
                    options: { pinned: true },
                });
                return trustedDomains;
            case 'trust': {
                const itemToTrust = pickedResult.toTrust;
                if (trustedDomains.indexOf(itemToTrust) === -1) {
                    storageService.remove(TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
                    storageService.store(TRUSTED_DOMAINS_STORAGE_KEY, JSON.stringify([...trustedDomains, itemToTrust]), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    return [...trustedDomains, itemToTrust];
                }
            }
        }
    }
    return [];
}
export async function readTrustedDomains(accessor) {
    const { defaultTrustedDomains, trustedDomains } = readStaticTrustedDomains(accessor);
    return {
        defaultTrustedDomains,
        trustedDomains,
    };
}
export function readStaticTrustedDomains(accessor) {
    const storageService = accessor.get(IStorageService);
    const productService = accessor.get(IProductService);
    const environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
    const defaultTrustedDomains = [
        ...(productService.linkProtectionTrustedDomains ?? []),
        ...(environmentService.options?.additionalTrustedDomains ?? []),
    ];
    let trustedDomains = [];
    try {
        const trustedDomainsSrc = storageService.get(TRUSTED_DOMAINS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (trustedDomainsSrc) {
            trustedDomains = JSON.parse(trustedDomainsSrc);
        }
    }
    catch (err) { }
    return {
        defaultTrustedDomains,
        trustedDomains,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC9icm93c2VyL3RydXN0ZWREb21haW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUt2RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBRWpILE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO0FBRXhFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLG1DQUFtQyxDQUFBO0FBQzlFLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLDBDQUEwQyxDQUFBO0FBRTdGLE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHO0lBQ2pELEVBQUUsRUFBRSxzQ0FBc0M7SUFDMUMsV0FBVyxFQUFFO1FBQ1osV0FBVyxFQUFFLFNBQVMsQ0FBQyxtQ0FBbUMsRUFBRSx3QkFBd0IsQ0FBQztRQUNyRixJQUFJLEVBQUUsRUFBRTtLQUNSO0lBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQUU7UUFDN0MsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxhQUFhLENBQUMsVUFBVSxDQUFDO1lBQ3hCLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsVUFBVSxFQUFFLE9BQU87WUFDbkIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtTQUN6QixDQUFDLENBQUE7UUFDRixPQUFNO0lBQ1AsQ0FBQztDQUNELENBQUE7QUFLRCxNQUFNLENBQUMsS0FBSyxVQUFVLG9DQUFvQyxDQUN6RCxjQUF3QixFQUN4QixpQkFBeUIsRUFDekIsUUFBYSxFQUNiLGlCQUFxQyxFQUNyQyxjQUErQixFQUMvQixhQUE2QixFQUM3QixnQkFBbUM7SUFFbkMsTUFBTSx1QkFBdUIsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDNUQsTUFBTSx1QkFBdUIsR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzVFLE1BQU0sU0FBUyxHQUFHLHVCQUF1QixDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzdGLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUE7SUFDdkMsTUFBTSxPQUFPLEdBQTJDLEVBQUUsQ0FBQTtJQUUxRCxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ1osSUFBSSxFQUFFLE1BQU07UUFDWixLQUFLLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQztRQUM1RSxFQUFFLEVBQUUsT0FBTztRQUNYLE9BQU8sRUFBRSxpQkFBaUI7UUFDMUIsTUFBTSxFQUFFLElBQUk7S0FDWixDQUFDLENBQUE7SUFFRixNQUFNLElBQUksR0FDVCx1QkFBdUIsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUNwQyx1QkFBdUIsQ0FBQyxLQUFLLENBQzVCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDbkYsQ0FBQTtJQUVGLElBQUksSUFBSSxFQUFFLENBQUM7UUFDVixJQUFJLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxNQUFNLElBQUksR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVELE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1osSUFBSSxFQUFFLE1BQU07Z0JBQ1osS0FBSyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSx3QkFBd0IsRUFBRSxJQUFJLENBQUM7Z0JBQzlFLE9BQU8sRUFBRSxJQUFJLEdBQUcsSUFBSTtnQkFDcEIsRUFBRSxFQUFFLE9BQU87YUFDWCxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ1osSUFBSSxFQUFFLE1BQU07WUFDWixLQUFLLEVBQUUsUUFBUSxDQUNkLDhCQUE4QixFQUM5QixrQ0FBa0MsRUFDbEMsU0FBUyxDQUNUO1lBQ0QsT0FBTyxFQUFFLGNBQWM7WUFDdkIsRUFBRSxFQUFFLE9BQU87U0FDWCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNaLElBQUksRUFBRSxNQUFNO1FBQ1osS0FBSyxFQUFFLFFBQVEsQ0FDZCwrQkFBK0IsRUFDL0IsOENBQThDLENBQzlDO1FBQ0QsT0FBTyxFQUFFLEdBQUc7UUFDWixFQUFFLEVBQUUsT0FBTztLQUNYLENBQUMsQ0FBQTtJQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDWixJQUFJLEVBQUUsTUFBTTtRQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsb0NBQW9DLEVBQUUsd0JBQXdCLENBQUM7UUFDL0UsRUFBRSxFQUFFLFFBQVE7S0FDWixDQUFDLENBQUE7SUFFRixNQUFNLFlBQVksR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBdUMsT0FBTyxFQUFFO1FBQ2hHLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0tBQ3RCLENBQUMsQ0FBQTtJQUVGLElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNyQyxRQUFRLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6QixLQUFLLFFBQVE7Z0JBQ1osTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDO29CQUM5QixRQUFRLEVBQUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO29CQUNyRSxVQUFVLEVBQUUsT0FBTztvQkFDbkIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtpQkFDekIsQ0FBQyxDQUFBO2dCQUNGLE9BQU8sY0FBYyxDQUFBO1lBQ3RCLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDZCxNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFBO2dCQUN4QyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDaEQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxtQ0FBbUMsb0NBQTJCLENBQUE7b0JBQ3BGLGNBQWMsQ0FBQyxLQUFLLENBQ25CLDJCQUEyQixFQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUMsZ0VBR2hELENBQUE7b0JBRUQsT0FBTyxDQUFDLEdBQUcsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUN4QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxFQUFFLENBQUE7QUFDVixDQUFDO0FBT0QsTUFBTSxDQUFDLEtBQUssVUFBVSxrQkFBa0IsQ0FDdkMsUUFBMEI7SUFFMUIsTUFBTSxFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3BGLE9BQU87UUFDTixxQkFBcUI7UUFDckIsY0FBYztLQUNkLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLFFBQTBCO0lBQ2xFLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDcEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNwRCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtJQUU1RSxNQUFNLHFCQUFxQixHQUFHO1FBQzdCLEdBQUcsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLElBQUksRUFBRSxDQUFDO1FBQ3RELEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsd0JBQXdCLElBQUksRUFBRSxDQUFDO0tBQy9ELENBQUE7SUFFRCxJQUFJLGNBQWMsR0FBYSxFQUFFLENBQUE7SUFDakMsSUFBSSxDQUFDO1FBQ0osTUFBTSxpQkFBaUIsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUMzQywyQkFBMkIsb0NBRTNCLENBQUE7UUFDRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0YsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsQ0FBQSxDQUFDO0lBRWhCLE9BQU87UUFDTixxQkFBcUI7UUFDckIsY0FBYztLQUNkLENBQUE7QUFDRixDQUFDIn0=