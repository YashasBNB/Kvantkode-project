/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry, Action2, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { ExternalUriResolverContribution } from './externalUriResolver.js';
import { manageTrustedDomainSettingsCommand } from './trustedDomains.js';
import { TrustedDomainsFileSystemProvider } from './trustedDomainsFileSystemProvider.js';
import { OpenerValidatorContributions } from './trustedDomainsValidator.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { ITrustedDomainService, TrustedDomainService } from './trustedDomainService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
class OpenUrlAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.url.openUrl',
            title: localize2('openUrl', 'Open URL'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const urlService = accessor.get(IURLService);
        return quickInputService
            .input({ prompt: localize('urlToOpen', 'URL to open') })
            .then((input) => {
            if (input) {
                const uri = URI.parse(input);
                urlService.open(uri, { originalUrl: input });
            }
        });
    }
}
registerAction2(OpenUrlAction);
/**
 * Trusted Domains Contribution
 */
CommandsRegistry.registerCommand(manageTrustedDomainSettingsCommand);
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: manageTrustedDomainSettingsCommand.id,
        title: manageTrustedDomainSettingsCommand.description.description,
    },
});
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(OpenerValidatorContributions, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(TrustedDomainsFileSystemProvider.ID, TrustedDomainsFileSystemProvider, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ExternalUriResolverContribution.ID, ExternalUriResolverContribution, 2 /* WorkbenchPhase.BlockRestore */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.trustedDomains.promptInTrustedWorkspace': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            description: localize('workbench.trustedDomains.promptInTrustedWorkspace', 'When enabled, trusted domain prompts will appear when opening links in trusted workspaces.'),
        },
    },
});
registerSingleton(ITrustedDomainService, TrustedDomainService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC9icm93c2VyL3VybC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLE1BQU0sRUFDTixZQUFZLEVBQ1osT0FBTyxFQUNQLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRW5GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsRUFHakMsOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDMUUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sb0VBQW9FLENBQUE7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