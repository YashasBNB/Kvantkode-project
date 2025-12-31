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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQ04seUJBQXlCLEVBRXpCLGFBQWEsR0FDYixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbEQsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV6RCxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLHlCQUFpRDtJQUNuRyxZQUNpQyxZQUEyQixFQUNoQixjQUF3QyxFQUNqRCxjQUErQixFQUMxQixtQkFBeUM7UUFFaEYsS0FBSyxDQUFDLHlCQUF5QixFQUFFO1lBQ2hDLGFBQWEsRUFBRTtnQkFDZCxLQUFLLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLG1DQUFtQyxDQUFDO2FBQ3RFO1NBQ0Qs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