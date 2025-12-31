/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyChord } from '../../../../../base/common/keyCodes.js';
import { KeyCodeChord, decodeKeybinding, ScanCodeChord, Keybinding, } from '../../../../../base/common/keybindings.js';
import { KeybindingParser } from '../../../../../base/common/keybindingParser.js';
import { KeybindingIO } from '../../common/keybindingIO.js';
import { createUSLayoutResolvedKeybinding } from '../../../../../platform/keybinding/test/common/keybindingsTestUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('keybindingIO', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('serialize/deserialize', () => {
        function testOneSerialization(keybinding, expected, msg, OS) {
            const usLayoutResolvedKeybinding = createUSLayoutResolvedKeybinding(keybinding, OS);
            const actualSerialized = usLayoutResolvedKeybinding.getUserSettingsLabel();
            assert.strictEqual(actualSerialized, expected, expected + ' - ' + msg);
        }
        function testSerialization(keybinding, expectedWin, expectedMac, expectedLinux) {
            testOneSerialization(keybinding, expectedWin, 'win', 1 /* OperatingSystem.Windows */);
            testOneSerialization(keybinding, expectedMac, 'mac', 2 /* OperatingSystem.Macintosh */);
            testOneSerialization(keybinding, expectedLinux, 'linux', 3 /* OperatingSystem.Linux */);
        }
        function testOneDeserialization(keybinding, _expected, msg, OS) {
            const actualDeserialized = KeybindingParser.parseKeybinding(keybinding);
            const expected = decodeKeybinding(_expected, OS);
            assert.deepStrictEqual(actualDeserialized, expected, keybinding + ' - ' + msg);
        }
        function testDeserialization(inWin, inMac, inLinux, expected) {
            testOneDeserialization(inWin, expected, 'win', 1 /* OperatingSystem.Windows */);
            testOneDeserialization(inMac, expected, 'mac', 2 /* OperatingSystem.Macintosh */);
            testOneDeserialization(inLinux, expected, 'linux', 3 /* OperatingSystem.Linux */);
        }
        function testRoundtrip(keybinding, expectedWin, expectedMac, expectedLinux) {
            testSerialization(keybinding, expectedWin, expectedMac, expectedLinux);
            testDeserialization(expectedWin, expectedMac, expectedLinux, keybinding);
        }
        testRoundtrip(21 /* KeyCode.Digit0 */, '0', '0', '0');
        testRoundtrip(31 /* KeyCode.KeyA */, 'a', 'a', 'a');
        testRoundtrip(16 /* KeyCode.UpArrow */, 'up', 'up', 'up');
        testRoundtrip(17 /* KeyCode.RightArrow */, 'right', 'right', 'right');
        testRoundtrip(18 /* KeyCode.DownArrow */, 'down', 'down', 'down');
        testRoundtrip(15 /* KeyCode.LeftArrow */, 'left', 'left', 'left');
        // one modifier
        testRoundtrip(512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'alt+a', 'alt+a', 'alt+a');
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 'ctrl+a', 'cmd+a', 'ctrl+a');
        testRoundtrip(1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'shift+a', 'shift+a', 'shift+a');
        testRoundtrip(256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'win+a', 'ctrl+a', 'meta+a');
        // two modifiers
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'ctrl+alt+a', 'alt+cmd+a', 'ctrl+alt+a');
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+a', 'shift+cmd+a', 'ctrl+shift+a');
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+win+a', 'ctrl+cmd+a', 'ctrl+meta+a');
        testRoundtrip(1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'shift+alt+a', 'shift+alt+a', 'shift+alt+a');
        testRoundtrip(1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'shift+win+a', 'ctrl+shift+a', 'shift+meta+a');
        testRoundtrip(512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'alt+win+a', 'ctrl+alt+a', 'alt+meta+a');
        // three modifiers
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+a', 'shift+alt+cmd+a', 'ctrl+shift+alt+a');
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+win+a', 'ctrl+shift+cmd+a', 'ctrl+shift+meta+a');
        testRoundtrip(1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'shift+alt+win+a', 'ctrl+shift+alt+a', 'shift+alt+meta+a');
        // all modifiers
        testRoundtrip(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */, 'ctrl+shift+alt+win+a', 'ctrl+shift+alt+cmd+a', 'ctrl+shift+alt+meta+a');
        // chords
        testRoundtrip(KeyChord(2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */), 'ctrl+a ctrl+a', 'cmd+a cmd+a', 'ctrl+a ctrl+a');
        testRoundtrip(KeyChord(2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */, 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */), 'ctrl+up ctrl+up', 'cmd+up cmd+up', 'ctrl+up ctrl+up');
        // OEM keys
        testRoundtrip(85 /* KeyCode.Semicolon */, ';', ';', ';');
        testRoundtrip(86 /* KeyCode.Equal */, '=', '=', '=');
        testRoundtrip(87 /* KeyCode.Comma */, ',', ',', ',');
        testRoundtrip(88 /* KeyCode.Minus */, '-', '-', '-');
        testRoundtrip(89 /* KeyCode.Period */, '.', '.', '.');
        testRoundtrip(90 /* KeyCode.Slash */, '/', '/', '/');
        testRoundtrip(91 /* KeyCode.Backquote */, '`', '`', '`');
        testRoundtrip(115 /* KeyCode.ABNT_C1 */, 'abnt_c1', 'abnt_c1', 'abnt_c1');
        testRoundtrip(116 /* KeyCode.ABNT_C2 */, 'abnt_c2', 'abnt_c2', 'abnt_c2');
        testRoundtrip(92 /* KeyCode.BracketLeft */, '[', '[', '[');
        testRoundtrip(93 /* KeyCode.Backslash */, '\\', '\\', '\\');
        testRoundtrip(94 /* KeyCode.BracketRight */, ']', ']', ']');
        testRoundtrip(95 /* KeyCode.Quote */, "'", "'", "'");
        testRoundtrip(96 /* KeyCode.OEM_8 */, 'oem_8', 'oem_8', 'oem_8');
        testRoundtrip(97 /* KeyCode.IntlBackslash */, 'oem_102', 'oem_102', 'oem_102');
        // OEM aliases
        testDeserialization('OEM_1', 'OEM_1', 'OEM_1', 85 /* KeyCode.Semicolon */);
        testDeserialization('OEM_PLUS', 'OEM_PLUS', 'OEM_PLUS', 86 /* KeyCode.Equal */);
        testDeserialization('OEM_COMMA', 'OEM_COMMA', 'OEM_COMMA', 87 /* KeyCode.Comma */);
        testDeserialization('OEM_MINUS', 'OEM_MINUS', 'OEM_MINUS', 88 /* KeyCode.Minus */);
        testDeserialization('OEM_PERIOD', 'OEM_PERIOD', 'OEM_PERIOD', 89 /* KeyCode.Period */);
        testDeserialization('OEM_2', 'OEM_2', 'OEM_2', 90 /* KeyCode.Slash */);
        testDeserialization('OEM_3', 'OEM_3', 'OEM_3', 91 /* KeyCode.Backquote */);
        testDeserialization('ABNT_C1', 'ABNT_C1', 'ABNT_C1', 115 /* KeyCode.ABNT_C1 */);
        testDeserialization('ABNT_C2', 'ABNT_C2', 'ABNT_C2', 116 /* KeyCode.ABNT_C2 */);
        testDeserialization('OEM_4', 'OEM_4', 'OEM_4', 92 /* KeyCode.BracketLeft */);
        testDeserialization('OEM_5', 'OEM_5', 'OEM_5', 93 /* KeyCode.Backslash */);
        testDeserialization('OEM_6', 'OEM_6', 'OEM_6', 94 /* KeyCode.BracketRight */);
        testDeserialization('OEM_7', 'OEM_7', 'OEM_7', 95 /* KeyCode.Quote */);
        testDeserialization('OEM_8', 'OEM_8', 'OEM_8', 96 /* KeyCode.OEM_8 */);
        testDeserialization('OEM_102', 'OEM_102', 'OEM_102', 97 /* KeyCode.IntlBackslash */);
        // accepts '-' as separator
        testDeserialization('ctrl-shift-alt-win-a', 'ctrl-shift-alt-cmd-a', 'ctrl-shift-alt-meta-a', 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */);
        // various input mistakes
        testDeserialization(' ctrl-shift-alt-win-A ', ' shift-alt-cmd-Ctrl-A ', ' ctrl-shift-alt-META-A ', 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */);
    });
    test('deserialize scan codes', () => {
        assert.deepStrictEqual(KeybindingParser.parseKeybinding('ctrl+shift+[comma] ctrl+/'), new Keybinding([
            new ScanCodeChord(true, true, false, false, 60 /* ScanCode.Comma */),
            new KeyCodeChord(true, false, false, false, 90 /* KeyCode.Slash */),
        ]));
    });
    test('issue #10452 - invalid command', () => {
        const strJSON = `[{ "key": "ctrl+k ctrl+f", "command": ["firstcommand", "seccondcommand"] }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.strictEqual(keybindingItem.command, null);
    });
    test('issue #10452 - invalid when', () => {
        const strJSON = `[{ "key": "ctrl+k ctrl+f", "command": "firstcommand", "when": [] }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.strictEqual(keybindingItem.when, undefined);
    });
    test('issue #10452 - invalid key', () => {
        const strJSON = `[{ "key": [], "command": "firstcommand" }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.deepStrictEqual(keybindingItem.keybinding, null);
    });
    test('issue #10452 - invalid key 2', () => {
        const strJSON = `[{ "key": "", "command": "firstcommand" }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.deepStrictEqual(keybindingItem.keybinding, null);
    });
    test('test commands args', () => {
        const strJSON = `[{ "key": "ctrl+k ctrl+f", "command": "firstcommand", "when": [], "args": { "text": "theText" } }]`;
        const userKeybinding = JSON.parse(strJSON)[0];
        const keybindingItem = KeybindingIO.readUserKeybindingItem(userKeybinding);
        assert.strictEqual(keybindingItem.commandArgs.text, 'theText');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0lPLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy90ZXN0L2Jyb3dzZXIva2V5YmluZGluZ0lPLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQTZCLE1BQU0sd0NBQXdDLENBQUE7QUFDNUYsT0FBTyxFQUNOLFlBQVksRUFDWixnQkFBZ0IsRUFDaEIsYUFBYSxFQUNiLFVBQVUsR0FDVixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWpGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUN6SCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsU0FBUyxvQkFBb0IsQ0FDNUIsVUFBa0IsRUFDbEIsUUFBZ0IsRUFDaEIsR0FBVyxFQUNYLEVBQW1CO1lBRW5CLE1BQU0sMEJBQTBCLEdBQUcsZ0NBQWdDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFBO1lBQ3BGLE1BQU0sZ0JBQWdCLEdBQUcsMEJBQTBCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxRQUFRLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FB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