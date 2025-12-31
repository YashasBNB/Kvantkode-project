/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { createUSLayoutResolvedKeybinding } from './keybindingsTestUtils.js';
suite('KeybindingLabels', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertUSLabel(OS, keybinding, expected) {
        const usResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
        assert.strictEqual(usResolvedKeybinding.getLabel(), expected);
    }
    test('Windows US label', () => {
        // no modifier
        assertUSLabel(1 /* OperatingSystem.Windows */, 31 /* KeyCode.KeyA */, 'A');
        // one modifier
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 'Ctrl+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'Shift+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Alt+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Windows+A');
        // two modifiers
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Ctrl+Alt+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Windows+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Shift+Alt+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Shift+Windows+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Alt+Windows+A');
        // three modifiers
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Windows+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Alt+Windows+A');
        assertUSLabel(1 /* OperatingSystem.Windows */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Shift+Alt+Windows+A');
        // four modifiers
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Windows+A');
        // chord
        assertUSLabel(1 /* OperatingSystem.Windows */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'Ctrl+A Ctrl+B');
    });
    test('Linux US label', () => {
        // no modifier
        assertUSLabel(3 /* OperatingSystem.Linux */, 31 /* KeyCode.KeyA */, 'A');
        // one modifier
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 'Ctrl+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'Shift+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Alt+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Super+A');
        // two modifiers
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Ctrl+Alt+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Super+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Shift+Alt+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Shift+Super+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Alt+Super+A');
        // three modifiers
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Super+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Alt+Super+A');
        assertUSLabel(3 /* OperatingSystem.Linux */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Shift+Alt+Super+A');
        // four modifiers
        assertUSLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Super+A');
        // chord
        assertUSLabel(3 /* OperatingSystem.Linux */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'Ctrl+A Ctrl+B');
    });
    test('Mac US label', () => {
        // no modifier
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 31 /* KeyCode.KeyA */, 'A');
        // one modifier
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, '⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, '⇧A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, '⌥A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃A');
        // two modifiers
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, '⇧⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, '⌥⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, '⇧⌥A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⇧A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⌥A');
        // three modifiers
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, '⇧⌥⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⇧⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⌥⌘A');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⇧⌥A');
        // four modifiers
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, '⌃⇧⌥⌘A');
        // chord
        assertUSLabel(2 /* OperatingSystem.Macintosh */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), '⌘A ⌘B');
        // special keys
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 15 /* KeyCode.LeftArrow */, '←');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 16 /* KeyCode.UpArrow */, '↑');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 17 /* KeyCode.RightArrow */, '→');
        assertUSLabel(2 /* OperatingSystem.Macintosh */, 18 /* KeyCode.DownArrow */, '↓');
    });
    test('Aria label', () => {
        function assertAriaLabel(OS, keybinding, expected) {
            const usResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
            assert.strictEqual(usResolvedKeybinding.getAriaLabel(), expected);
        }
        assertAriaLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Control+Shift+Alt+Windows+A');
        assertAriaLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Control+Shift+Alt+Super+A');
        assertAriaLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Control+Shift+Option+Command+A');
    });
    test('Electron Accelerator label', () => {
        function assertElectronAcceleratorLabel(OS, keybinding, expected) {
            const usResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
            assert.strictEqual(usResolvedKeybinding.getElectronAccelerator(), expected);
        }
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Super+A');
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Super+A');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'Ctrl+Shift+Alt+Cmd+A');
        // electron cannot handle chords
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), null);
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), null);
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), null);
        // electron cannot handle numpad keys
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, 99 /* KeyCode.Numpad1 */, null);
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, 99 /* KeyCode.Numpad1 */, null);
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 99 /* KeyCode.Numpad1 */, null);
        // special
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 15 /* KeyCode.LeftArrow */, 'Left');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 16 /* KeyCode.UpArrow */, 'Up');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 17 /* KeyCode.RightArrow */, 'Right');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 18 /* KeyCode.DownArrow */, 'Down');
    });
    test('User Settings label', () => {
        function assertElectronAcceleratorLabel(OS, keybinding, expected) {
            const usResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
            assert.strictEqual(usResolvedKeybinding.getUserSettingsLabel(), expected);
        }
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+win+a');
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+meta+a');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+cmd+a');
        // electron cannot handle chords
        assertElectronAcceleratorLabel(1 /* OperatingSystem.Windows */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'ctrl+a ctrl+b');
        assertElectronAcceleratorLabel(3 /* OperatingSystem.Linux */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'ctrl+a ctrl+b');
        assertElectronAcceleratorLabel(2 /* OperatingSystem.Macintosh */, KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */), 'cmd+a cmd+b');
    });
    test('issue #91235: Do not end with a +', () => {
        assertUSLabel(1 /* OperatingSystem.Windows */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 6 /* KeyCode.Alt */, 'Ctrl+Alt');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5YmluZGluZy90ZXN0L2NvbW1vbi9rZXliaW5kaW5nTGFiZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFFL0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFNUUsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsYUFBYSxDQUFDLEVBQW1CLEVBQUUsVUFBa0IsRUFBRSxRQUFnQjtRQUMvRSxNQUFNLG9CQUFvQixHQUFHLGdDQUFnQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUUsQ0FBQTtRQUM5RSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLGNBQWM7UUFDZCxhQUFhLHlEQUF3QyxHQUFHLENBQUMsQ0FBQTtRQUV6RCxlQUFlO1FBQ2YsYUFBYSxrQ0FBMEIsaURBQTZCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDL0UsYUFBYSxrQ0FBMEIsK0NBQTJCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDOUUsYUFBYSxrQ0FBMEIsNENBQXlCLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDMUUsYUFBYSxrQ0FBMEIsZ0RBQTZCLEVBQUUsV0FBVyxDQUFDLENB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