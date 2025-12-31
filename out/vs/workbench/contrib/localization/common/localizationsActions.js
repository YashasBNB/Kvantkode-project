/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ILanguagePackService, } from '../../../../platform/languagePacks/common/languagePacks.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
export class ConfigureDisplayLanguageAction extends Action2 {
    static { this.ID = 'workbench.action.configureLocale'; }
    constructor() {
        super({
            id: ConfigureDisplayLanguageAction.ID,
            title: localize2('configureLocale', 'Configure Display Language'),
            menu: {
                id: MenuId.CommandPalette,
            },
            metadata: {
                description: localize2('configureLocaleDescription', 'Changes the locale of VS Code based on installed language packs. Common languages include French, Chinese, Spanish, Japanese, German, Korean, and more.'),
            },
        });
    }
    async run(accessor) {
        const languagePackService = accessor.get(ILanguagePackService);
        const quickInputService = accessor.get(IQuickInputService);
        const localeService = accessor.get(ILocaleService);
        const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const installedLanguages = await languagePackService.getInstalledLanguages();
        const disposables = new DisposableStore();
        const qp = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
        qp.matchOnDescription = true;
        qp.placeholder = localize('chooseLocale', 'Select Display Language');
        if (installedLanguages?.length) {
            const items = [
                { type: 'separator', label: localize('installed', 'Installed') },
            ];
            qp.items = items.concat(this.withMoreInfoButton(installedLanguages));
        }
        const source = new CancellationTokenSource();
        disposables.add(qp.onDispose(() => {
            source.cancel();
            disposables.dispose();
        }));
        const installedSet = new Set(installedLanguages?.map((language) => language.id) ?? []);
        languagePackService.getAvailableLanguages().then((availableLanguages) => {
            const newLanguages = availableLanguages.filter((l) => l.id && !installedSet.has(l.id));
            if (newLanguages.length) {
                qp.items = [
                    ...qp.items,
                    { type: 'separator', label: localize('available', 'Available') },
                    ...this.withMoreInfoButton(newLanguages),
                ];
            }
            qp.busy = false;
        });
        disposables.add(qp.onDidAccept(async () => {
            const selectedLanguage = qp.activeItems[0];
            if (selectedLanguage) {
                qp.hide();
                await localeService.setLocale(selectedLanguage);
            }
        }));
        disposables.add(qp.onDidTriggerItemButton(async (e) => {
            qp.hide();
            if (e.item.extensionId) {
                await extensionWorkbenchService.open(e.item.extensionId);
            }
        }));
        qp.show();
        qp.busy = true;
    }
    withMoreInfoButton(items) {
        for (const item of items) {
            if (item.extensionId) {
                item.buttons = [
                    {
                        tooltip: localize('moreInfo', 'More Info'),
                        iconClass: 'codicon-info',
                    },
                ];
            }
        }
        return items;
    }
}
export class ClearDisplayLanguageAction extends Action2 {
    static { this.ID = 'workbench.action.clearLocalePreference'; }
    static { this.LABEL = localize2('clearDisplayLanguage', 'Clear Display Language Preference'); }
    constructor() {
        super({
            id: ClearDisplayLanguageAction.ID,
            title: ClearDisplayLanguageAction.LABEL,
            menu: {
                id: MenuId.CommandPalette,
            },
        });
    }
    async run(accessor) {
        const localeService = accessor.get(ILocaleService);
        await localeService.clearLocalePreference();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2NhbGl6YXRpb24vY29tbW9uL2xvY2FsaXphdGlvbnNBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWhGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFbkYsTUFBTSxPQUFPLDhCQUErQixTQUFRLE9BQU87YUFDbkMsT0FBRSxHQUFHLGtDQUFrQyxDQUFBO0lBRTlEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDhCQUE4QixDQUFDLEVBQUU7WUFDckMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSw0QkFBNEIsQ0FBQztZQUNqRSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO2FBQ3pCO1lBQ0QsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxTQUFTLENBQ3JCLDRCQUE0QixFQUM1Qix5SkFBeUosQ0FDeko7YUFDRDtTQUNELENBQUMsQ0FB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