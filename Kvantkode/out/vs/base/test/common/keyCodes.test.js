/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EVENT_KEY_CODE_MAP, IMMUTABLE_CODE_TO_KEY_CODE, IMMUTABLE_KEY_CODE_TO_CODE, KeyChord, KeyCodeUtils, NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE, ScanCodeUtils, } from '../../common/keyCodes.js';
import { decodeKeybinding, KeyCodeChord, Keybinding } from '../../common/keybindings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('keyCodes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testBinaryEncoding(expected, k, OS) {
        assert.deepStrictEqual(decodeKeybinding(k, OS), expected);
    }
    test('mapping for Minus', () => {
        // [147, 83, 0, ScanCode.Minus, 'Minus', KeyCode.US_MINUS, '-', 189, 'VK_OEM_MINUS', '-', 'OEM_MINUS'],
        assert.strictEqual(EVENT_KEY_CODE_MAP[189], 88 /* KeyCode.Minus */);
        assert.strictEqual(NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE['VK_OEM_MINUS'], 88 /* KeyCode.Minus */);
        assert.strictEqual(ScanCodeUtils.lowerCaseToEnum('minus'), 51 /* ScanCode.Minus */);
        assert.strictEqual(ScanCodeUtils.toEnum('Minus'), 51 /* ScanCode.Minus */);
        assert.strictEqual(ScanCodeUtils.toString(51 /* ScanCode.Minus */), 'Minus');
        assert.strictEqual(IMMUTABLE_CODE_TO_KEY_CODE[51 /* ScanCode.Minus */], -1 /* KeyCode.DependsOnKbLayout */);
        assert.strictEqual(IMMUTABLE_KEY_CODE_TO_CODE[88 /* KeyCode.Minus */], -1 /* ScanCode.DependsOnKbLayout */);
        assert.strictEqual(KeyCodeUtils.toString(88 /* KeyCode.Minus */), '-');
        assert.strictEqual(KeyCodeUtils.fromString('-'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.toUserSettingsUS(88 /* KeyCode.Minus */), '-');
        assert.strictEqual(KeyCodeUtils.toUserSettingsGeneral(88 /* KeyCode.Minus */), 'OEM_MINUS');
        assert.strictEqual(KeyCodeUtils.fromUserSettings('-'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('OEM_MINUS'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('oem_minus'), 88 /* KeyCode.Minus */);
    });
    test('mapping for Space', () => {
        // [21, 10, 1, ScanCode.Space, 'Space', KeyCode.Space, 'Space', 32, 'VK_SPACE', empty, empty],
        assert.strictEqual(EVENT_KEY_CODE_MAP[32], 10 /* KeyCode.Space */);
        assert.strictEqual(NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE['VK_SPACE'], 10 /* KeyCode.Space */);
        assert.strictEqual(ScanCodeUtils.lowerCaseToEnum('space'), 50 /* ScanCode.Space */);
        assert.strictEqual(ScanCodeUtils.toEnum('Space'), 50 /* ScanCode.Space */);
        assert.strictEqual(ScanCodeUtils.toString(50 /* ScanCode.Space */), 'Space');
        assert.strictEqual(IMMUTABLE_CODE_TO_KEY_CODE[50 /* ScanCode.Space */], 10 /* KeyCode.Space */);
        assert.strictEqual(IMMUTABLE_KEY_CODE_TO_CODE[10 /* KeyCode.Space */], 50 /* ScanCode.Space */);
        assert.strictEqual(KeyCodeUtils.toString(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.fromString('Space'), 10 /* KeyCode.Space */);
        assert.strictEqual(KeyCodeUtils.toUserSettingsUS(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.toUserSettingsGeneral(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.fromUserSettings('Space'), 10 /* KeyCode.Space */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('space'), 10 /* KeyCode.Space */);
    });
    test('MAC binary encoding', () => {
        function test(expected, k) {
            testBinaryEncoding(expected, k, 2 /* OperatingSystem.Macintosh */);
        }
        test(null, 0);
        test(new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new Keybinding([
            new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */),
            new KeyCodeChord(false, false, false, false, 2 /* KeyCode.Tab */),
        ]), KeyChord(3 /* KeyCode.Enter */, 2 /* KeyCode.Tab */));
        test(new Keybinding([
            new KeyCodeChord(false, false, false, true, 55 /* KeyCode.KeyY */),
            new KeyCodeChord(false, false, false, false, 56 /* KeyCode.KeyZ */),
        ]), KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */));
    });
    test('WINDOWS & LINUX binary encoding', () => {
        ;
        [3 /* OperatingSystem.Linux */, 1 /* OperatingSystem.Windows */].forEach((OS) => {
            function test(expected, k) {
                testBinaryEncoding(expected, k, OS);
            }
            test(null, 0);
            test(new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new Keybinding([
                new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */),
                new KeyCodeChord(false, false, false, false, 2 /* KeyCode.Tab */),
            ]), KeyChord(3 /* KeyCode.Enter */, 2 /* KeyCode.Tab */));
            test(new Keybinding([
                new KeyCodeChord(true, false, false, false, 55 /* KeyCode.KeyY */),
                new KeyCodeChord(false, false, false, false, 56 /* KeyCode.KeyZ */),
            ]), KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Q29kZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9rZXlDb2Rlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsUUFBUSxFQUVSLFlBQVksRUFFWixtQ0FBbUMsRUFFbkMsYUFBYSxHQUNiLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUV4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEUsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7SUFDdEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLGtCQUFrQixDQUFDLFFBQTJCLEVBQUUsQ0FBUyxFQUFFLEVBQW1CO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLHVHQUF1RztRQUN2RyxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyx5QkFBZ0IsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLG1DQUFtQyxDQUFDLGNBQWMsQ0FBQyx5QkFBZ0IsQ0FBQTtRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLDBCQUFpQixDQUFBO1FBQzFFLE1BQU0sQ0FBQyxX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