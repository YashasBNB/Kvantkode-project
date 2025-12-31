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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvYnJvd3Nlci90cnVzdGVkRG9tYWlucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFLdkYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUVqSCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtBQUV4RSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxtQ0FBbUMsQ0FBQTtBQUM5RSxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRywwQ0FBMEMsQ0FBQTtBQUU3RixNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRztJQUNqRCxFQUFFLEVBQUUsc0NBQXNDO0lBQzFDLFdBQVcsRUFBRTtRQUNaLFdBQVcsRUFBRSxTQUFTLENBQUMsbUNBQW1DLEVBQUUsd0JBQXdCLENBQUM7UUFDckYsSUFBSSxFQUFFLEVBQUU7S0FDUjtJQUNELE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxFQUFFO1FBQzdDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsYUFBYSxDQUFDLFVBQVUsQ0FBQztZQUN4QixR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