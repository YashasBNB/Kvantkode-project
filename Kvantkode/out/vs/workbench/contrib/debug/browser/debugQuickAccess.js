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
import { PickerQuickAccessProvider, TriggerAction, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { localize } from '../../../../nls.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IDebugService } from '../common/debug.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { ADD_CONFIGURATION_ID, DEBUG_QUICK_ACCESS_PREFIX } from './debugCommands.js';
import { debugConfigure, debugRemoveConfig } from './debugIcons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let StartDebugQuickAccessProvider = class StartDebugQuickAccessProvider extends PickerQuickAccessProvider {
    constructor(debugService, contextService, commandService, notificationService) {
        super(DEBUG_QUICK_ACCESS_PREFIX, {
            noResultsPick: {
                label: localize('noDebugResults', 'No matching launch configurations'),
            },
        });
        this.debugService = debugService;
        this.contextService = contextService;
        this.commandService = commandService;
        this.notificationService = notificationService;
    }
    async _getPicks(filter) {
        const picks = [];
        if (!this.debugService.getAdapterManager().hasEnabledDebuggers()) {
            return [];
        }
        picks.push({ type: 'separator', label: 'launch.json' });
        const configManager = this.debugService.getConfigurationManager();
        const selectedConfiguration = configManager.selectedConfiguration;
        // Entries: configs
        let lastGroup;
        for (const config of configManager.getAllConfigurations()) {
            const highlights = matchesFuzzy(filter, config.name, true);
            if (highlights) {
                const pick = {
                    label: config.name,
                    description: this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */
                        ? config.launch.name
                        : '',
                    highlights: { label: highlights },
                    buttons: [
                        {
                            iconClass: ThemeIcon.asClassName(debugConfigure),
                            tooltip: localize('customizeLaunchConfig', 'Configure Launch Configuration'),
                        },
                    ],
                    trigger: () => {
                        config.launch.openConfigFile({ preserveFocus: false });
                        return TriggerAction.CLOSE_PICKER;
                    },
                    accept: async () => {
                        await configManager.selectConfiguration(config.launch, config.name);
                        try {
                            await this.debugService.startDebugging(config.launch, undefined, {
                                startedByUser: true,
                            });
                        }
                        catch (error) {
                            this.notificationService.error(error);
                        }
                    },
                };
                // Most recently used configuration
                if (selectedConfiguration.name === config.name &&
                    selectedConfiguration.launch === config.launch) {
                    const separator = {
                        type: 'separator',
                        label: localize('mostRecent', 'Most Recent'),
                    };
                    picks.unshift(separator, pick);
                    continue;
                }
                // Separator
                if (lastGroup !== config.presentation?.group) {
                    picks.push({ type: 'separator' });
                    lastGroup = config.presentation?.group;
                }
                // Launch entry
                picks.push(pick);
            }
        }
        // Entries detected configurations
        const dynamicProviders = await configManager.getDynamicProviders();
        if (dynamicProviders.length > 0) {
            picks.push({
                type: 'separator',
                label: localize({
                    key: 'contributed',
                    comment: [
                        'contributed is lower case because it looks better like that in UI. Nothing preceeds it. It is a name of the grouping of debug configurations.',
                    ],
                }, 'contributed'),
            });
        }
        configManager.getRecentDynamicConfigurations().forEach(({ name, type }) => {
            const highlights = matchesFuzzy(filter, name, true);
            if (highlights) {
                picks.push({
                    label: name,
                    highlights: { label: highlights },
                    buttons: [
                        {
                            iconClass: ThemeIcon.asClassName(debugRemoveConfig),
                            tooltip: localize('removeLaunchConfig', 'Remove Launch Configuration'),
                        },
                    ],
                    trigger: () => {
                        configManager.removeRecentDynamicConfigurations(name, type);
                        return TriggerAction.CLOSE_PICKER;
                    },
                    accept: async () => {
                        await configManager.selectConfiguration(undefined, name, undefined, { type });
                        try {
                            const { launch, getConfig } = configManager.selectedConfiguration;
                            const config = await getConfig();
                            await this.debugService.startDebugging(launch, config, { startedByUser: true });
                        }
                        catch (error) {
                            this.notificationService.error(error);
                        }
                    },
                });
            }
        });
        dynamicProviders.forEach((provider) => {
            picks.push({
                label: `$(folder) ${provider.label}...`,
                ariaLabel: localize({
                    key: 'providerAriaLabel',
                    comment: ['Placeholder stands for the provider label. For example "NodeJS".'],
                }, '{0} contributed configurations', provider.label),
                accept: async () => {
                    const pick = await provider.pick();
                    if (pick) {
                        // Use the type of the provider, not of the config since config sometimes have subtypes (for example "node-terminal")
                        await configManager.selectConfiguration(pick.launch, pick.config.name, pick.config, {
                            type: provider.type,
                        });
                        this.debugService.startDebugging(pick.launch, pick.config, { startedByUser: true });
                    }
                },
            });
        });
        // Entries: launches
        const visibleLaunches = configManager.getLaunches().filter((launch) => !launch.hidden);
        // Separator
        if (visibleLaunches.length > 0) {
            picks.push({ type: 'separator', label: localize('configure', 'configure') });
        }
        for (const launch of visibleLaunches) {
            const label = this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */
                ? localize('addConfigTo', 'Add Config ({0})...', launch.name)
                : localize('addConfiguration', 'Add Configuration...');
            // Add Config entry
            picks.push({
                label,
                description: this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ ? launch.name : '',
                highlights: { label: matchesFuzzy(filter, label, true) ?? undefined },
                accept: () => this.commandService.executeCommand(ADD_CONFIGURATION_ID, launch.uri.toString()),
            });
        }
        return picks;
    }
};
StartDebugQuickAccessProvider = __decorate([
    __param(0, IDebugService),
    __param(1, IWorkspaceContextService),
    __param(2, ICommandService),
    __param(3, INotificationService)
], StartDebugQuickAccessProvider);
export { StartDebugQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFDTix5QkFBeUIsRUFFekIsYUFBYSxHQUNiLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXpELElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEseUJBQWlEO0lBQ25HLFlBQ2lDLFlBQTJCLEVBQ2hCLGNBQXdDLEVBQ2pELGNBQStCLEVBQzFCLG1CQUF5QztRQUVoRixLQUFLLENBQUMseUJBQXlCLEVBQUU7WUFDaEMsYUFBYSxFQUFFO2dCQUNkLEtBQUssRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUs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