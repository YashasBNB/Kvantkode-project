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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24va2V5YmluZGluZ0xhYmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQWNuQyxNQUFNLE9BQU8scUJBQXFCO0lBR2pDLFlBQVksR0FBbUIsRUFBRSxPQUF1QixFQUFFLFFBQXdCLE9BQU87UUFDeEYsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLElBQUssQ0FBQyxDQUFBLENBQUMsa0NBQWtDO1FBQ2hFLElBQUksQ0FBQyxjQUFjLG1DQUEyQixHQUFHLEdBQUcsQ0FBQTtRQUNwRCxJQUFJLENBQUMsY0FBYyxpQ0FBeUIsR0FBRyxPQUFPLENBQUE7UUFDdEQsSUFBSSxDQUFDLGNBQWMsK0JBQXVCLEdBQUcsS0FBSyxDQUFBO0lBQ25ELENBQUM7SUFFTSxPQUFPLENBQ2IsRUFBbUIsRUFDbkIsTUFBb0IsRUFDcEIsZ0JBQXFDO1FBRXJDLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QixNQUFNLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN4QyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDdkIseUNBQXlDO2dC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