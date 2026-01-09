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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0lPLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL3Rlc3QvYnJvd3Nlci9rZXliaW5kaW5nSU8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBNkIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM1RixPQUFPLEVBQ04sWUFBWSxFQUNaLGdCQUFnQixFQUNoQixhQUFhLEVBQ2IsVUFBVSxHQUNWLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFakYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ3pILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNsQyxTQUFTLG9CQUFvQixDQUM1QixVQUFrQixFQUNsQixRQUFnQixFQUNoQixHQUFXLEVBQ1gsRUFBbUI7WUFFbkIsTUFBTSwwQkFBMEIsR0FBRyxnQ0FBZ0MsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFFLENBQUE7WUFDcEYsTUFBTSxnQkFBZ0IsR0FBRywwQkFBMEIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1lBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLFFBQVEs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