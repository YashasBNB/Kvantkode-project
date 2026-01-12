/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { AccessibilitySignal, AcknowledgeDocCommentsToken, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export class ShowSignalSoundHelp extends Action2 {
    static { this.ID = 'signals.sounds.help'; }
    constructor() {
        super({
            id: ShowSignalSoundHelp.ID,
            title: localize2('signals.sound.help', 'Help: List Signal Sounds'),
            f1: true,
            metadata: {
                description: localize('accessibility.sound.help.description', 'List all accessibility sounds, noises, or audio cues and configure their settings'),
            },
        });
    }
    async run(accessor) {
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const accessibilityService = accessor.get(IAccessibilityService);
        const preferencesService = accessor.get(IPreferencesService);
        const userGestureSignals = [AccessibilitySignal.save, AccessibilitySignal.format];
        const items = AccessibilitySignal.allAccessibilitySignals
            .map((signal, idx) => ({
            label: userGestureSignals.includes(signal)
                ? `${signal.name} (${configurationService.getValue(signal.settingsKey + '.sound')})`
                : signal.name,
            signal,
            buttons: userGestureSignals.includes(signal)
                ? [
                    {
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize('sounds.help.settings', 'Configure Sound'),
                        alwaysVisible: true,
                    },
                ]
                : [],
        }))
            .sort((a, b) => a.label.localeCompare(b.label));
        const disposables = new DisposableStore();
        const qp = disposables.add(quickInputService.createQuickPick());
        qp.items = items;
        qp.selectedItems = items.filter((i) => accessibilitySignalService.isSoundEnabled(i.signal) ||
            (userGestureSignals.includes(i.signal) &&
                configurationService.getValue(i.signal.settingsKey + '.sound') !== 'never'));
        disposables.add(qp.onDidAccept(() => {
            const enabledSounds = qp.selectedItems.map((i) => i.signal);
            const disabledSounds = qp.items
                .map((i) => i.signal)
                .filter((i) => !enabledSounds.includes(i));
            for (const signal of enabledSounds) {
                let { sound, announcement } = configurationService.getValue(signal.settingsKey);
                sound = userGestureSignals.includes(signal)
                    ? 'userGesture'
                    : accessibilityService.isScreenReaderOptimized()
                        ? 'auto'
                        : 'on';
                if (announcement) {
                    configurationService.updateValue(signal.settingsKey, { sound, announcement });
                }
                else {
                    configurationService.updateValue(signal.settingsKey, { sound });
                }
            }
            for (const signal of disabledSounds) {
                const announcement = configurationService.getValue(signal.settingsKey + '.announcement');
                const sound = getDisabledSettingValue(userGestureSignals.includes(signal), accessibilityService.isScreenReaderOptimized());
                const value = announcement ? { sound, announcement } : { sound };
                configurationService.updateValue(signal.settingsKey, value);
            }
            qp.hide();
        }));
        disposables.add(qp.onDidTriggerItemButton((e) => {
            preferencesService.openUserSettings({
                jsonEditor: true,
                revealSetting: { key: e.item.signal.settingsKey, edit: true },
            });
        }));
        disposables.add(qp.onDidChangeActive(() => {
            accessibilitySignalService.playSound(qp.activeItems[0].signal.sound.getSound(true), true, AcknowledgeDocCommentsToken);
        }));
        disposables.add(qp.onDidHide(() => disposables.dispose()));
        qp.placeholder = localize('sounds.help.placeholder', 'Select a sound to play and configure');
        qp.canSelectMany = true;
        await qp.show();
    }
}
function getDisabledSettingValue(isUserGestureSignal, isScreenReaderOptimized) {
    return isScreenReaderOptimized
        ? isUserGestureSignal
            ? 'never'
            : 'off'
        : isUserGestureSignal
            ? 'never'
            : 'auto';
}
export class ShowAccessibilityAnnouncementHelp extends Action2 {
    static { this.ID = 'accessibility.announcement.help'; }
    constructor() {
        super({
            id: ShowAccessibilityAnnouncementHelp.ID,
            title: localize2('accessibility.announcement.help', 'Help: List Signal Announcements'),
            f1: true,
            metadata: {
                description: localize('accessibility.announcement.help.description', 'List all accessibility announcements, alerts, braille messages, and configure their settings'),
            },
        });
    }
    async run(accessor) {
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const accessibilityService = accessor.get(IAccessibilityService);
        const preferencesService = accessor.get(IPreferencesService);
        const userGestureSignals = [AccessibilitySignal.save, AccessibilitySignal.format];
        const items = AccessibilitySignal.allAccessibilitySignals
            .filter((c) => !!c.legacyAnnouncementSettingsKey)
            .map((signal, idx) => ({
            label: userGestureSignals.includes(signal)
                ? `${signal.name} (${configurationService.getValue(signal.settingsKey + '.announcement')})`
                : signal.name,
            signal,
            buttons: userGestureSignals.includes(signal)
                ? [
                    {
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize('announcement.help.settings', 'Configure Announcement'),
                        alwaysVisible: true,
                    },
                ]
                : [],
        }))
            .sort((a, b) => a.label.localeCompare(b.label));
        const disposables = new DisposableStore();
        const qp = disposables.add(quickInputService.createQuickPick());
        qp.items = items;
        qp.selectedItems = items.filter((i) => accessibilitySignalService.isAnnouncementEnabled(i.signal) ||
            (userGestureSignals.includes(i.signal) &&
                configurationService.getValue(i.signal.settingsKey + '.announcement') !== 'never'));
        const screenReaderOptimized = accessibilityService.isScreenReaderOptimized();
        disposables.add(qp.onDidAccept(() => {
            if (!screenReaderOptimized) {
                // announcements are off by default when screen reader is not active
                qp.hide();
                return;
            }
            const enabledAnnouncements = qp.selectedItems.map((i) => i.signal);
            const disabledAnnouncements = AccessibilitySignal.allAccessibilitySignals.filter((cue) => !!cue.legacyAnnouncementSettingsKey && !enabledAnnouncements.includes(cue));
            for (const signal of enabledAnnouncements) {
                let { sound, announcement } = configurationService.getValue(signal.settingsKey);
                announcement = userGestureSignals.includes(signal)
                    ? 'userGesture'
                    : signal.announcementMessage && accessibilityService.isScreenReaderOptimized()
                        ? 'auto'
                        : undefined;
                configurationService.updateValue(signal.settingsKey, { sound, announcement });
            }
            for (const signal of disabledAnnouncements) {
                const announcement = getDisabledSettingValue(userGestureSignals.includes(signal), true);
                const sound = configurationService.getValue(signal.settingsKey + '.sound');
                const value = announcement ? { sound, announcement } : { sound };
                configurationService.updateValue(signal.settingsKey, value);
            }
            qp.hide();
        }));
        disposables.add(qp.onDidTriggerItemButton((e) => {
            preferencesService.openUserSettings({
                jsonEditor: true,
                revealSetting: { key: e.item.signal.settingsKey, edit: true },
            });
        }));
        disposables.add(qp.onDidHide(() => disposables.dispose()));
        qp.placeholder = screenReaderOptimized
            ? localize('announcement.help.placeholder', 'Select an announcement to configure')
            : localize('announcement.help.placeholder.disabled', 'Screen reader is not active, announcements are disabled by default.');
        qp.canSelectMany = true;
        await qp.show();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHlTaWduYWxzL2Jyb3dzZXIvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixFQUMzQiwyQkFBMkIsR0FDM0IsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxPQUFPO2FBQy9CLE9BQUUsR0FBRyxxQkFBcUIsQ0FBQTtJQUUxQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO1lBQzFCLEtBQUssRUFBRSxTQUFTLENBQUMsb0JBQW9CLEVBQUUsMEJBQTBCLENBQUM7WUFDbEUsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUU7Z0JBQ1QsV0FB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