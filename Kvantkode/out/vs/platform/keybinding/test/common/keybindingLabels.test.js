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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0xhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL3Rlc3QvY29tbW9uL2tleWJpbmRpbmdMYWJlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUU1RSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxhQUFhLENBQUMsRUFBbUIsRUFBRSxVQUFrQixFQUFFLFFBQWdCO1FBQy9FLE1BQU0sb0JBQW9CLEdBQUcsZ0NBQWdDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsY0FBYztRQUNkLGFBQWEseURBQXdDLEdBQUcsQ0FBQyxDQUFBO1FBRXpELGVBQWU7UUFDZixhQUFhLGtDQUEwQixpREFBNkIsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMvRSxhQUFhLGtDQUEwQiwrQ0FBMkIsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM5RSxhQUFhLGtDQUEwQiw0Q0FBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMxRSxhQUFhLGtDQUEwQixnREFBNkIsRUFBRSxXQUFXLENB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