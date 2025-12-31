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
import { Action } from '../../../../base/common/actions.js';
import { URI } from '../../../../base/common/uri.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import * as nls from '../../../../nls.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { MenuId, MenuRegistry, isIMenuItem } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { isLocalizedString } from '../../../../platform/action/common/action.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
let ConfigureLanguageBasedSettingsAction = class ConfigureLanguageBasedSettingsAction extends Action {
    static { this.ID = 'workbench.action.configureLanguageBasedSettings'; }
    static { this.LABEL = nls.localize2('configureLanguageBasedSettings', 'Configure Language Specific Settings...'); }
    constructor(id, label, modelService, languageService, quickInputService, preferencesService) {
        super(id, label);
        this.modelService = modelService;
        this.languageService = languageService;
        this.quickInputService = quickInputService;
        this.preferencesService = preferencesService;
    }
    async run() {
        const languages = this.languageService.getSortedRegisteredLanguageNames();
        const picks = languages.map(({ languageName, languageId }) => {
            const description = nls.localize('languageDescriptionConfigured', '({0})', languageId);
            // construct a fake resource to be able to show nice icons if any
            let fakeResource;
            const extensions = this.languageService.getExtensions(languageId);
            if (extensions.length) {
                fakeResource = URI.file(extensions[0]);
            }
            else {
                const filenames = this.languageService.getFilenames(languageId);
                if (filenames.length) {
                    fakeResource = URI.file(filenames[0]);
                }
            }
            return {
                label: languageName,
                iconClasses: getIconClasses(this.modelService, this.languageService, fakeResource),
                description,
            };
        });
        await this.quickInputService
            .pick(picks, { placeHolder: nls.localize('pickLanguage', 'Select Language') })
            .then((pick) => {
            if (pick) {
                const languageId = this.languageService.getLanguageIdByLanguageName(pick.label);
                if (typeof languageId === 'string') {
                    return this.preferencesService.openLanguageSpecificSettings(languageId);
                }
            }
            return undefined;
        });
    }
};
ConfigureLanguageBasedSettingsAction = __decorate([
    __param(2, IModelService),
    __param(3, ILanguageService),
    __param(4, IQuickInputService),
    __param(5, IPreferencesService)
], ConfigureLanguageBasedSettingsAction);
export { ConfigureLanguageBasedSettingsAction };
// Register a command that gets all settings
CommandsRegistry.registerCommand({
    id: '_getAllSettings',
    handler: () => {
        const configRegistry = Registry.as(Extensions.Configuration);
        const allSettings = configRegistry.getConfigurationProperties();
        return allSettings;
    },
});
//#region --- Register a command to get all actions from the command palette
CommandsRegistry.registerCommand('_getAllCommands', function (accessor, filterByPrecondition) {
    const keybindingService = accessor.get(IKeybindingService);
    const contextKeyService = accessor.get(IContextKeyService);
    const actions = [];
    for (const editorAction of EditorExtensionsRegistry.getEditorActions()) {
        const keybinding = keybindingService.lookupKeybinding(editorAction.id);
        if (filterByPrecondition &&
            !contextKeyService.contextMatchesRules(editorAction.precondition)) {
            continue;
        }
        actions.push({
            command: editorAction.id,
            label: editorAction.label,
            description: isLocalizedString(editorAction.metadata?.description)
                ? editorAction.metadata.description.value
                : editorAction.metadata?.description,
            precondition: editorAction.precondition?.serialize(),
            keybinding: keybinding?.getLabel() ?? 'Not set',
        });
    }
    for (const menuItem of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
        if (isIMenuItem(menuItem)) {
            if (filterByPrecondition && !contextKeyService.contextMatchesRules(menuItem.when)) {
                continue;
            }
            const title = typeof menuItem.command.title === 'string'
                ? menuItem.command.title
                : menuItem.command.title.value;
            const category = menuItem.command.category
                ? typeof menuItem.command.category === 'string'
                    ? menuItem.command.category
                    : menuItem.command.category.value
                : undefined;
            const label = category ? `${category}: ${title}` : title;
            const description = isLocalizedString(menuItem.command.metadata?.description)
                ? menuItem.command.metadata.description.value
                : menuItem.command.metadata?.description;
            const keybinding = keybindingService.lookupKeybinding(menuItem.command.id);
            actions.push({
                command: menuItem.command.id,
                label,
                description,
                precondition: menuItem.when?.serialize(),
                keybinding: keybinding?.getLabel() ?? 'Not set',
            });
        }
    }
    for (const command of KeybindingsRegistry.getDefaultKeybindings()) {
        if (filterByPrecondition &&
            !contextKeyService.contextMatchesRules(command.when ?? undefined)) {
            continue;
        }
        const keybinding = keybindingService.lookupKeybinding(command.command ?? '');
        if (!keybinding) {
            continue;
        }
        if (actions.some((a) => a.command === command.command)) {
            continue;
        }
        actions.push({
            command: command.command ?? '',
            label: command.command ?? '',
            keybinding: keybinding?.getLabel() ?? 'Not set',
            precondition: command.when?.serialize(),
        });
    }
    return actions;
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9wcmVmZXJlbmNlc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxHQUVWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENB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