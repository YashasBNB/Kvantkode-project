/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupBy } from '../../../../base/common/arrays.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { testingUpdateProfiles } from './icons.js';
import { testConfigurationGroupNames } from '../common/constants.js';
import { canUseProfileWithTest, ITestProfileService } from '../common/testProfileService.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
function buildPicker(accessor, { onlyGroup, showConfigureButtons = true, onlyForTest, onlyConfigurable, placeholder = localize('testConfigurationUi.pick', 'Pick a test profile to use'), }) {
    const profileService = accessor.get(ITestProfileService);
    const items = [];
    const pushItems = (allProfiles, description) => {
        for (const profiles of groupBy(allProfiles, (a, b) => a.group - b.group)) {
            let addedHeader = false;
            if (onlyGroup) {
                if (profiles[0].group !== onlyGroup) {
                    continue;
                }
                addedHeader = true; // showing one group, no need for label
            }
            for (const profile of profiles) {
                if (onlyConfigurable && !profile.hasConfigurationHandler) {
                    continue;
                }
                if (!addedHeader) {
                    items.push({ type: 'separator', label: testConfigurationGroupNames[profiles[0].group] });
                    addedHeader = true;
                }
                items.push({
                    type: 'item',
                    profile,
                    label: profile.label,
                    description,
                    alwaysShow: true,
                    buttons: profile.hasConfigurationHandler && showConfigureButtons
                        ? [
                            {
                                iconClass: ThemeIcon.asClassName(testingUpdateProfiles),
                                tooltip: localize('updateTestConfiguration', 'Update Test Configuration'),
                            },
                        ]
                        : [],
                });
            }
        }
    };
    if (onlyForTest !== undefined) {
        pushItems(profileService
            .getControllerProfiles(onlyForTest.controllerId)
            .filter((p) => canUseProfileWithTest(p, onlyForTest)));
    }
    else {
        for (const { profiles, controller } of profileService.all()) {
            pushItems(profiles, controller.label.get());
        }
    }
    const quickpick = accessor
        .get(IQuickInputService)
        .createQuickPick({ useSeparators: true });
    quickpick.items = items;
    quickpick.placeholder = placeholder;
    return quickpick;
}
const triggerButtonHandler = (service, resolve) => (evt) => {
    const profile = evt.item.profile;
    if (profile) {
        service.configure(profile.controllerId, profile.profileId);
        resolve(undefined);
    }
};
CommandsRegistry.registerCommand({
    id: 'vscode.pickMultipleTestProfiles',
    handler: async (accessor, options) => {
        const profileService = accessor.get(ITestProfileService);
        const quickpick = buildPicker(accessor, options);
        if (!quickpick) {
            return;
        }
        const disposables = new DisposableStore();
        disposables.add(quickpick);
        quickpick.canSelectMany = true;
        if (options.selected) {
            quickpick.selectedItems = quickpick.items
                .filter((i) => i.type === 'item')
                .filter((i) => options.selected.some((s) => s.controllerId === i.profile.controllerId && s.profileId === i.profile.profileId));
        }
        const pick = await new Promise((resolve) => {
            disposables.add(quickpick.onDidAccept(() => {
                const selected = quickpick.selectedItems;
                resolve(selected.map((s) => s.profile).filter(isDefined));
            }));
            disposables.add(quickpick.onDidHide(() => resolve(undefined)));
            disposables.add(quickpick.onDidTriggerItemButton(triggerButtonHandler(profileService, resolve)));
            quickpick.show();
        });
        disposables.dispose();
        return pick;
    },
});
CommandsRegistry.registerCommand({
    id: 'vscode.pickTestProfile',
    handler: async (accessor, options) => {
        const profileService = accessor.get(ITestProfileService);
        const quickpick = buildPicker(accessor, options);
        if (!quickpick) {
            return;
        }
        const disposables = new DisposableStore();
        disposables.add(quickpick);
        const pick = await new Promise((resolve) => {
            disposables.add(quickpick.onDidAccept(() => resolve(quickpick.selectedItems[0]?.profile)));
            disposables.add(quickpick.onDidHide(() => resolve(undefined)));
            disposables.add(quickpick.onDidTriggerItemButton(triggerButtonHandler(profileService, resolve)));
            quickpick.show();
        });
        disposables.dispose();
        return pick;
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbmZpZ3VyYXRpb25VaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0aW5nQ29uZmlndXJhdGlvblVpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFHTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ2xELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRXBFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQWV0RSxTQUFTLFdBQVcsQ0FDbkIsUUFBMEIsRUFDMUIsRUFDQyxTQUFTLEVBQ1Qsb0JBQW9CLEdBQUcsSUFBSSxFQUMzQixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLFdBQVcsR0FBRyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsNEJBQTRCLENBQUMsR0FDbkQ7SUFFOUIsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ3hELE1BQU0sS0FBSyxHQUFvRSxF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