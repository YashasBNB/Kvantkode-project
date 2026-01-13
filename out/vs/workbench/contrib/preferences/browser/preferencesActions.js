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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3ByZWZlcmVuY2VzQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJB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