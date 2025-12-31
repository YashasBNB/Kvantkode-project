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
var CommandsQuickAccessProvider_1;
import { isFirefox } from '../../../../base/browser/browser.js';
import { raceTimeout, timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Language } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { AbstractEditorCommandsQuickAccessProvider } from '../../../../editor/contrib/quickAccess/browser/commandsQuickAccess.js';
import { localize, localize2 } from '../../../../nls.js';
import { isLocalizedString } from '../../../../platform/action/common/action.js';
import { Action2, IMenuService, MenuId, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { CommandsHistory, } from '../../../../platform/quickinput/browser/commandsQuickAccess.js';
import { TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { DefaultQuickAccessFilterValue } from '../../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CHAT_OPEN_ACTION_ID } from '../../chat/browser/actions/chatActions.js';
import { ASK_QUICK_QUESTION_ACTION_ID } from '../../chat/browser/actions/chatQuickInputActions.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import { IAiRelatedInformationService, RelatedInformationType, } from '../../../services/aiRelatedInformation/common/aiRelatedInformation.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { createKeybindingCommandQuery } from '../../../services/preferences/browser/keybindingsEditorModel.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
let CommandsQuickAccessProvider = class CommandsQuickAccessProvider extends AbstractEditorCommandsQuickAccessProvider {
    static { CommandsQuickAccessProvider_1 = this; }
    static { this.AI_RELATED_INFORMATION_MAX_PICKS = 5; }
    static { this.AI_RELATED_INFORMATION_DEBOUNCE = 200; }
    get activeTextEditorControl() {
        return this.editorService.activeTextEditorControl;
    }
    get defaultFilterValue() {
        if (this.configuration.preserveInput) {
            return DefaultQuickAccessFilterValue.LAST;
        }
        return undefined;
    }
    constructor(editorService, menuService, extensionService, instantiationService, keybindingService, commandService, telemetryService, dialogService, configurationService, editorGroupService, preferencesService, productService, aiRelatedInformationService, chatAgentService) {
        super({
            showAlias: !Language.isDefaultVariant(),
            noResultsPick: () => ({
                label: localize('noCommandResults', 'No matching commands'),
                commandId: '',
            }),
        }, instantiationService, keybindingService, commandService, telemetryService, dialogService);
        this.editorService = editorService;
        this.menuService = menuService;
        this.extensionService = extensionService;
        this.configurationService = configurationService;
        this.editorGroupService = editorGroupService;
        this.preferencesService = preferencesService;
        this.productService = productService;
        this.aiRelatedInformationService = aiRelatedInformationService;
        this.chatAgentService = chatAgentService;
        // If extensions are not yet registered, we wait for a little moment to give them
        // a chance to register so that the complete set of commands shows up as result
        // We do not want to delay functionality beyond that time though to keep the commands
        // functional.
        this.extensionRegistrationRace = raceTimeout(this.extensionService.whenInstalledExtensionsRegistered(), 800);
        this.useAiRelatedInfo = false;
        this._register(configurationService.onDidChangeConfiguration((e) => this.updateOptions(e)));
        this.updateOptions();
    }
    get configuration() {
        const commandPaletteConfig = this.configurationService.getValue().workbench
            .commandPalette;
        return {
            preserveInput: commandPaletteConfig.preserveInput,
            experimental: commandPaletteConfig.experimental,
        };
    }
    updateOptions(e) {
        if (e && !e.affectsConfiguration('workbench.commandPalette.experimental')) {
            return;
        }
        const config = this.configuration;
        const suggestedCommandIds = config.experimental.suggestCommands &&
            this.productService.commandPaletteSuggestedCommandIds?.length
            ? new Set(this.productService.commandPaletteSuggestedCommandIds)
            : undefined;
        this.options.suggestedCommandIds = suggestedCommandIds;
        this.useAiRelatedInfo = config.experimental.enableNaturalLanguageSearch;
    }
    async getCommandPicks(token) {
        // wait for extensions registration or 800ms once
        await this.extensionRegistrationRace;
        if (token.isCancellationRequested) {
            return [];
        }
        return [...this.getCodeEditorCommandPicks(), ...this.getGlobalCommandPicks()].map((picks) => ({
            ...picks,
            buttons: [
                {
                    iconClass: ThemeIcon.asClassName(Codicon.gear),
                    tooltip: localize('configure keybinding', 'Configure Keybinding'),
                },
            ],
            trigger: () => {
                this.preferencesService.openGlobalKeybindingSettings(false, {
                    query: createKeybindingCommandQuery(picks.commandId, picks.commandWhen),
                });
                return TriggerAction.CLOSE_PICKER;
            },
        }));
    }
    hasAdditionalCommandPicks(filter, token) {
        if (!this.useAiRelatedInfo ||
            token.isCancellationRequested ||
            filter === '' ||
            !this.aiRelatedInformationService.isEnabled()) {
            return false;
        }
        return true;
    }
    async getAdditionalCommandPicks(allPicks, picksSoFar, filter, token) {
        if (!this.hasAdditionalCommandPicks(filter, token)) {
            return [];
        }
        let additionalPicks;
        try {
            // Wait a bit to see if the user is still typing
            await timeout(CommandsQuickAccessProvider_1.AI_RELATED_INFORMATION_DEBOUNCE, token);
            additionalPicks = await this.getRelatedInformationPicks(allPicks, picksSoFar, filter, token);
        }
        catch (e) {
            return [];
        }
        if (picksSoFar.length || additionalPicks.length) {
            additionalPicks.push({
                type: 'separator',
            });
        }
        const defaultAgent = this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
        if (defaultAgent) {
            additionalPicks.push({
                label: localize('askXInChat', 'Ask {0}: {1}', defaultAgent.fullName, filter),
                commandId: this.configuration.experimental.askChatLocation === 'quickChat'
                    ? ASK_QUICK_QUESTION_ACTION_ID
                    : CHAT_OPEN_ACTION_ID,
                args: [filter],
            });
        }
        return additionalPicks;
    }
    async getRelatedInformationPicks(allPicks, picksSoFar, filter, token) {
        const relatedInformation = (await this.aiRelatedInformationService.getRelatedInformation(filter, [RelatedInformationType.CommandInformation], token));
        // Sort by weight descending to get the most relevant results first
        relatedInformation.sort((a, b) => b.weight - a.weight);
        const setOfPicksSoFar = new Set(picksSoFar.map((p) => p.commandId));
        const additionalPicks = new Array();
        for (const info of relatedInformation) {
            if (additionalPicks.length === CommandsQuickAccessProvider_1.AI_RELATED_INFORMATION_MAX_PICKS) {
                break;
            }
            const pick = allPicks.find((p) => p.commandId === info.command && !setOfPicksSoFar.has(p.commandId));
            if (pick) {
                additionalPicks.push(pick);
            }
        }
        return additionalPicks;
    }
    getGlobalCommandPicks() {
        const globalCommandPicks = [];
        const scopedContextKeyService = this.editorService.activeEditorPane?.scopedContextKeyService ||
            this.editorGroupService.activeGroup.scopedContextKeyService;
        const globalCommandsMenu = this.menuService.getMenuActions(MenuId.CommandPalette, scopedContextKeyService);
        const globalCommandsMenuActions = globalCommandsMenu
            .reduce((r, [, actions]) => [...r, ...actions], [])
            .filter((action) => action instanceof MenuItemAction && action.enabled);
        for (const action of globalCommandsMenuActions) {
            // Label
            let label = (typeof action.item.title === 'string' ? action.item.title : action.item.title.value) ||
                action.item.id;
            // Category
            const category = typeof action.item.category === 'string'
                ? action.item.category
                : action.item.category?.value;
            if (category) {
                label = localize('commandWithCategory', '{0}: {1}', category, label);
            }
            // Alias
            const aliasLabel = typeof action.item.title !== 'string' ? action.item.title.original : undefined;
            const aliasCategory = category && action.item.category && typeof action.item.category !== 'string'
                ? action.item.category.original
                : undefined;
            const commandAlias = aliasLabel && category
                ? aliasCategory
                    ? `${aliasCategory}: ${aliasLabel}`
                    : `${category}: ${aliasLabel}`
                : aliasLabel;
            const metadataDescription = action.item.metadata?.description;
            const commandDescription = metadataDescription === undefined || isLocalizedString(metadataDescription)
                ? metadataDescription
                : // TODO: this type will eventually not be a string and when that happens, this should simplified.
                    { value: metadataDescription, original: metadataDescription };
            globalCommandPicks.push({
                commandId: action.item.id,
                commandWhen: action.item.precondition?.serialize(),
                commandAlias,
                label: stripIcons(label),
                commandDescription,
            });
        }
        return globalCommandPicks;
    }
};
CommandsQuickAccessProvider = CommandsQuickAccessProvider_1 = __decorate([
    __param(0, IEditorService),
    __param(1, IMenuService),
    __param(2, IExtensionService),
    __param(3, IInstantiationService),
    __param(4, IKeybindingService),
    __param(5, ICommandService),
    __param(6, ITelemetryService),
    __param(7, IDialogService),
    __param(8, IConfigurationService),
    __param(9, IEditorGroupsService),
    __param(10, IPreferencesService),
    __param(11, IProductService),
    __param(12, IAiRelatedInformationService),
    __param(13, IChatAgentService)
], CommandsQuickAccessProvider);
export { CommandsQuickAccessProvider };
//#region Actions
export class ShowAllCommandsAction extends Action2 {
    static { this.ID = 'workbench.action.showCommands'; }
    constructor() {
        super({
            id: ShowAllCommandsAction.ID,
            title: localize2('showTriggerActions', 'Show All Commands'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: undefined,
                primary: !isFirefox ? 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 46 /* KeyCode.KeyP */ : undefined,
                secondary: [59 /* KeyCode.F1 */],
            },
            f1: true,
        });
    }
    async run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(CommandsQuickAccessProvider.PREFIX);
    }
}
export class ClearCommandHistoryAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.clearCommandHistory',
            title: localize2('clearCommandHistory', 'Clear Command History'),
            f1: true,
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const storageService = accessor.get(IStorageService);
        const dialogService = accessor.get(IDialogService);
        const commandHistoryLength = CommandsHistory.getConfiguredCommandHistoryLength(configurationService);
        if (commandHistoryLength > 0) {
            // Ask for confirmation
            const { confirmed } = await dialogService.confirm({
                type: 'warning',
                message: localize('confirmClearMessage', 'Do you want to clear the history of recently used commands?'),
                detail: localize('confirmClearDetail', 'This action is irreversible!'),
                primaryButton: localize({ key: 'clearButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Clear'),
            });
            if (!confirmed) {
                return;
            }
            CommandsHistory.clearHistory(configurationService, storageService);
        }
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3F1aWNrYWNjZXNzL2Jyb3dzZXIvY29tbWFuZHNRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQ2pJLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDaEYsT0FBTyxFQUNOLE9BQU8sRUFDUCxZQUFZLEVBQ1osTUFBTSxFQUNOLGNBQWMsR0FFZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxP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