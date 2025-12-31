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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Q29kZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24va2V5Q29kZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLGtCQUFrQixFQUNsQiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLFFBQVEsRUFFUixZQUFZLEVBRVosbUNBQW1DLEVBRW5DLGFBQWEsR0FDYixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBQ3RCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxrQkFBa0IsQ0FBQyxRQUEyQixFQUFFLENBQVMsRUFBRSxFQUFtQjtRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5Qix1R0FBdUc7UUFDdkcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMseUJBQWdCLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBQyxjQUFjLENBQUMseUJBQWdCLENBQUE7UUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQywwQkFBaUIsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxD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