/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
export class ModifierLabelProvider {
    constructor(mac, windows, linux = windows) {
        this.modifierLabels = [null]; // index 0 will never me accessed.
        this.modifierLabels[2 /* OperatingSystem.Macintosh */] = mac;
        this.modifierLabels[1 /* OperatingSystem.Windows */] = windows;
        this.modifierLabels[3 /* OperatingSystem.Linux */] = linux;
    }
    toLabel(OS, chords, keyLabelProvider) {
        if (chords.length === 0) {
            return null;
        }
        const result = [];
        for (let i = 0, len = chords.length; i < len; i++) {
            const chord = chords[i];
            const keyLabel = keyLabelProvider(chord);
            if (keyLabel === null) {
                // this keybinding cannot be expressed...
                return null;
            }
            result[i] = _simpleAsString(chord, keyLabel, this.modifierLabels[OS]);
        }
        return result.join(' ');
    }
}
/**
 * A label provider that prints modifiers in a suitable format for displaying in the UI.
 */
export const UILabelProvider = new ModifierLabelProvider({
    ctrlKey: '\u2303',
    shiftKey: '⇧',
    altKey: '⌥',
    metaKey: '⌘',
    separator: '',
}, {
    ctrlKey: nls.localize({ key: 'ctrlKey', comment: ['This is the short form for the Control key on the keyboard'] }, 'Ctrl'),
    shiftKey: nls.localize({ key: 'shiftKey', comment: ['This is the short form for the Shift key on the keyboard'] }, 'Shift'),
    altKey: nls.localize({ key: 'altKey', comment: ['This is the short form for the Alt key on the keyboard'] }, 'Alt'),
    metaKey: nls.localize({
        key: 'windowsKey',
        comment: ['This is the short form for the Windows key on the keyboard'],
    }, 'Windows'),
    separator: '+',
}, {
    ctrlKey: nls.localize({ key: 'ctrlKey', comment: ['This is the short form for the Control key on the keyboard'] }, 'Ctrl'),
    shiftKey: nls.localize({ key: 'shiftKey', comment: ['This is the short form for the Shift key on the keyboard'] }, 'Shift'),
    altKey: nls.localize({ key: 'altKey', comment: ['This is the short form for the Alt key on the keyboard'] }, 'Alt'),
    metaKey: nls.localize({ key: 'superKey', comment: ['This is the short form for the Super key on the keyboard'] }, 'Super'),
    separator: '+',
});
/**
 * A label provider that prints modifiers in a suitable format for ARIA.
 */
export const AriaLabelProvider = new ModifierLabelProvider({
    ctrlKey: nls.localize({
        key: 'ctrlKey.long',
        comment: ['This is the long form for the Control key on the keyboard'],
    }, 'Control'),
    shiftKey: nls.localize({
        key: 'shiftKey.long',
        comment: ['This is the long form for the Shift key on the keyboard'],
    }, 'Shift'),
    altKey: nls.localize({
        key: 'optKey.long',
        comment: ['This is the long form for the Alt/Option key on the keyboard'],
    }, 'Option'),
    metaKey: nls.localize({
        key: 'cmdKey.long',
        comment: ['This is the long form for the Command key on the keyboard'],
    }, 'Command'),
    separator: '+',
}, {
    ctrlKey: nls.localize({
        key: 'ctrlKey.long',
        comment: ['This is the long form for the Control key on the keyboard'],
    }, 'Control'),
    shiftKey: nls.localize({
        key: 'shiftKey.long',
        comment: ['This is the long form for the Shift key on the keyboard'],
    }, 'Shift'),
    altKey: nls.localize({ key: 'altKey.long', comment: ['This is the long form for the Alt key on the keyboard'] }, 'Alt'),
    metaKey: nls.localize({
        key: 'windowsKey.long',
        comment: ['This is the long form for the Windows key on the keyboard'],
    }, 'Windows'),
    separator: '+',
}, {
    ctrlKey: nls.localize({
        key: 'ctrlKey.long',
        comment: ['This is the long form for the Control key on the keyboard'],
    }, 'Control'),
    shiftKey: nls.localize({
        key: 'shiftKey.long',
        comment: ['This is the long form for the Shift key on the keyboard'],
    }, 'Shift'),
    altKey: nls.localize({ key: 'altKey.long', comment: ['This is the long form for the Alt key on the keyboard'] }, 'Alt'),
    metaKey: nls.localize({
        key: 'superKey.long',
        comment: ['This is the long form for the Super key on the keyboard'],
    }, 'Super'),
    separator: '+',
});
/**
 * A label provider that prints modifiers in a suitable format for Electron Accelerators.
 * See https://github.com/electron/electron/blob/master/docs/api/accelerator.md
 */
export const ElectronAcceleratorLabelProvider = new ModifierLabelProvider({
    ctrlKey: 'Ctrl',
    shiftKey: 'Shift',
    altKey: 'Alt',
    metaKey: 'Cmd',
    separator: '+',
}, {
    ctrlKey: 'Ctrl',
    shiftKey: 'Shift',
    altKey: 'Alt',
    metaKey: 'Super',
    separator: '+',
});
/**
 * A label provider that prints modifiers in a suitable format for user settings.
 */
export const UserSettingsLabelProvider = new ModifierLabelProvider({
    ctrlKey: 'ctrl',
    shiftKey: 'shift',
    altKey: 'alt',
    metaKey: 'cmd',
    separator: '+',
}, {
    ctrlKey: 'ctrl',
    shiftKey: 'shift',
    altKey: 'alt',
    metaKey: 'win',
    separator: '+',
}, {
    ctrlKey: 'ctrl',
    shiftKey: 'shift',
    altKey: 'alt',
    metaKey: 'meta',
    separator: '+',
});
function _simpleAsString(modifiers, key, labels) {
    if (key === null) {
        return '';
    }
    const result = [];
    // translate modifier keys: Ctrl-Shift-Alt-Meta
    if (modifiers.ctrlKey) {
        result.push(labels.ctrlKey);
    }
    if (modifiers.shiftKey) {
        result.push(labels.shiftKey);
    }
    if (modifiers.altKey) {
        result.push(labels.altKey);
    }
    if (modifiers.metaKey) {
        result.push(labels.metaKey);
    }
    // the actual key
    if (key !== '') {
        result.push(key);
    }
    return result.join(labels.separator);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2tleWJpbmRpbmdMYWJlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFjbkMsTUFBTSxPQUFPLHFCQUFxQjtJQUdqQyxZQUFZLEdBQW1CLEVBQUUsT0FBdUIsRUFBRSxRQUF3QixPQUFPO1FBQ3hGLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxJQUFLLENBQUMsQ0FBQSxDQUFDLGtDQUFrQztRQUNoRSxJQUFJLENBQUMsY0FBYyxtQ0FBMkIsR0FBRyxHQUFHLENBQUE7UUFDcEQsSUFBSSxDQUFDLGNBQWMsaUNBQXlCLEdBQUcsT0FBTyxDQUFBO1FBQ3RELElBQUksQ0FBQyxjQUFjLCtCQUF1QixHQUFHLEtBQUssQ0FBQTtJQUNuRCxDQUFDO0lBRU0sT0FBTyxDQUNiLEVBQW1CLEVBQ25CLE1BQW9CLEVBQ3BCLGdCQUFxQztRQUVyQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkIsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDeEMsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3ZCLHlDQUF5QztnQkFDekMs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