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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5U2lnbmFscy9icm93c2VyL2NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsRUFDM0IsMkJBQTJCLEdBQzNCLE1BQU0sZ0ZBQWdGLENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV0RSxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsT0FBTzthQUMvQixPQUFFLEdBQUcscUJBQXFCLENBQUE7SUFFMUM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbUJBQW1CLENBQUMsRUFBRTtZQUMxQixLQUFLLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixFQUFFLDBCQUEwQixDQUFDO1lBQ2xFLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFB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