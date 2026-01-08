/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../../base/common/keyCodes.js';
import { KeyCodeChord, decodeKeybinding, ScanCodeChord, Keybinding, } from '../../../../../base/common/keybindings.js';
import { WindowsKeyboardMapper } from '../../common/windowsKeyboardMapper.js';
import { assertMapping, assertResolveKeyboardEvent, assertResolveKeybinding, readRawMapping, } from './keyboardMapperTestUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const WRITE_FILE_IF_DIFFERENT = false;
async function createKeyboardMapper(isUSStandard, file, mapAltGrToCtrlAlt) {
    const rawMappings = await readRawMapping(file);
    return new WindowsKeyboardMapper(isUSStandard, rawMappings, mapAltGrToCtrlAlt);
}
function _assertResolveKeybinding(mapper, k, expected) {
    const keyBinding = decodeKeybinding(k, 1 /* OperatingSystem.Windows */);
    assertResolveKeybinding(mapper, keyBinding, expected);
}
suite('keyboardMapper - WINDOWS de_ch', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        mapper = await createKeyboardMapper(false, 'win_de_ch', false);
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'win_de_ch.txt');
    });
    test('resolveKeybinding Ctrl+A', () => {
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */, [
            {
                label: 'Ctrl+A',
                ariaLabel: 'Control+A',
                electronAccelerator: 'Ctrl+A',
                userSettingsLabel: 'ctrl+a',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+A'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeybinding Ctrl+Z', () => {
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */, [
            {
                label: 'Ctrl+Z',
                ariaLabel: 'Control+Z',
                electronAccelerator: 'Ctrl+Z',
                userSettingsLabel: 'ctrl+z',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+Z'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeyboardEvent Ctrl+Z', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 56 /* KeyCode.KeyZ */,
            code: null,
        }, {
            label: 'Ctrl+Z',
            ariaLabel: 'Control+Z',
            electronAccelerator: 'Ctrl+Z',
            userSettingsLabel: 'ctrl+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+Z'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Ctrl+]', () => {
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */, [
            {
                label: 'Ctrl+^',
                ariaLabel: 'Control+^',
                electronAccelerator: 'Ctrl+]',
                userSettingsLabel: 'ctrl+oem_6',
                isWYSIWYG: false,
                isMultiChord: false,
                dispatchParts: ['ctrl+]'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeyboardEvent Ctrl+]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 94 /* KeyCode.BracketRight */,
            code: null,
        }, {
            label: 'Ctrl+^',
            ariaLabel: 'Control+^',
            electronAccelerator: 'Ctrl+]',
            userSettingsLabel: 'ctrl+oem_6',
            isWYSIWYG: false,
            isMultiChord: false,
            dispatchParts: ['ctrl+]'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeybinding Shift+]', () => {
        _assertResolveKeybinding(mapper, 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */, [
            {
                label: 'Shift+^',
                ariaLabel: 'Shift+^',
                electronAccelerator: 'Shift+]',
                userSettingsLabel: 'shift+oem_6',
                isWYSIWYG: false,
                isMultiChord: false,
                dispatchParts: ['shift+]'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeybinding Ctrl+/', () => {
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */, [
            {
                label: 'Ctrl+§',
                ariaLabel: 'Control+§',
                electronAccelerator: 'Ctrl+/',
                userSettingsLabel: 'ctrl+oem_2',
                isWYSIWYG: false,
                isMultiChord: false,
                dispatchParts: ['ctrl+/'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeybinding Ctrl+Shift+/', () => {
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 90 /* KeyCode.Slash */, [
            {
                label: 'Ctrl+Shift+§',
                ariaLabel: 'Control+Shift+§',
                electronAccelerator: 'Ctrl+Shift+/',
                userSettingsLabel: 'ctrl+shift+oem_2',
                isWYSIWYG: false,
                isMultiChord: false,
                dispatchParts: ['ctrl+shift+/'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeybinding Ctrl+K Ctrl+\\', () => {
        _assertResolveKeybinding(mapper, KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */), [
            {
                label: 'Ctrl+K Ctrl+ä',
                ariaLabel: 'Control+K Control+ä',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+k ctrl+oem_5',
                isWYSIWYG: false,
                isMultiChord: true,
                dispatchParts: ['ctrl+K', 'ctrl+\\'],
                singleModifierDispatchParts: [null, null],
            },
        ]);
    });
    test('resolveKeybinding Ctrl+K Ctrl+=', () => {
        _assertResolveKeybinding(mapper, KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */), []);
    });
    test('resolveKeybinding Ctrl+DownArrow', () => {
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, [
            {
                label: 'Ctrl+DownArrow',
                ariaLabel: 'Control+DownArrow',
                electronAccelerator: 'Ctrl+Down',
                userSettingsLabel: 'ctrl+down',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+DownArrow'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeybinding Ctrl+NUMPAD_0', () => {
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 98 /* KeyCode.Numpad0 */, [
            {
                label: 'Ctrl+NumPad0',
                ariaLabel: 'Control+NumPad0',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+numpad0',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+NumPad0'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeybinding Ctrl+Home', () => {
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */, [
            {
                label: 'Ctrl+Home',
                ariaLabel: 'Control+Home',
                electronAccelerator: 'Ctrl+Home',
                userSettingsLabel: 'ctrl+home',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+Home'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeyboardEvent Ctrl+Home', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 14 /* KeyCode.Home */,
            code: null,
        }, {
            label: 'Ctrl+Home',
            ariaLabel: 'Control+Home',
            electronAccelerator: 'Ctrl+Home',
            userSettingsLabel: 'ctrl+home',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+Home'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveUserBinding Ctrl+[Comma] Ctrl+/', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(true, false, false, false, 60 /* ScanCode.Comma */),
            new KeyCodeChord(true, false, false, false, 90 /* KeyCode.Slash */),
        ]), [
            {
                label: 'Ctrl+, Ctrl+§',
                ariaLabel: 'Control+, Control+§',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+oem_comma ctrl+oem_2',
                isWYSIWYG: false,
                isMultiChord: true,
                dispatchParts: ['ctrl+,', 'ctrl+/'],
                singleModifierDispatchParts: [null, null],
            },
        ]);
    });
    test('resolveKeyboardEvent Single Modifier Ctrl+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 5 /* KeyCode.Ctrl */,
            code: null,
        }, {
            label: 'Ctrl',
            ariaLabel: 'Control',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['ctrl'],
        });
    });
});
suite('keyboardMapper - WINDOWS en_us', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        mapper = await createKeyboardMapper(true, 'win_en_us', false);
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'win_en_us.txt');
    });
    test('resolveKeybinding Ctrl+K Ctrl+\\', () => {
        _assertResolveKeybinding(mapper, KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */), [
            {
                label: 'Ctrl+K Ctrl+\\',
                ariaLabel: 'Control+K Control+\\',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+k ctrl+\\',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+K', 'ctrl+\\'],
                singleModifierDispatchParts: [null, null],
            },
        ]);
    });
    test('resolveUserBinding Ctrl+[Comma] Ctrl+/', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(true, false, false, false, 60 /* ScanCode.Comma */),
            new KeyCodeChord(true, false, false, false, 90 /* KeyCode.Slash */),
        ]), [
            {
                label: 'Ctrl+, Ctrl+/',
                ariaLabel: 'Control+, Control+/',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+, ctrl+/',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+,', 'ctrl+/'],
                singleModifierDispatchParts: [null, null],
            },
        ]);
    });
    test('resolveUserBinding Ctrl+[Comma]', () => {
        assertResolveKeybinding(mapper, new Keybinding([new ScanCodeChord(true, false, false, false, 60 /* ScanCode.Comma */)]), [
            {
                label: 'Ctrl+,',
                ariaLabel: 'Control+,',
                electronAccelerator: 'Ctrl+,',
                userSettingsLabel: 'ctrl+,',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+,'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
    test('resolveKeyboardEvent Single Modifier Ctrl+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 5 /* KeyCode.Ctrl */,
            code: null,
        }, {
            label: 'Ctrl',
            ariaLabel: 'Control',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['ctrl'],
        });
    });
    test('resolveKeyboardEvent Single Modifier Shift+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: true,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 4 /* KeyCode.Shift */,
            code: null,
        }, {
            label: 'Shift',
            ariaLabel: 'Shift',
            electronAccelerator: null,
            userSettingsLabel: 'shift',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['shift'],
        });
    });
    test('resolveKeyboardEvent Single Modifier Alt+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: true,
            metaKey: false,
            altGraphKey: false,
            keyCode: 6 /* KeyCode.Alt */,
            code: null,
        }, {
            label: 'Alt',
            ariaLabel: 'Alt',
            electronAccelerator: null,
            userSettingsLabel: 'alt',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['alt'],
        });
    });
    test('resolveKeyboardEvent Single Modifier Meta+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: 57 /* KeyCode.Meta */,
            code: null,
        }, {
            label: 'Windows',
            ariaLabel: 'Windows',
            electronAccelerator: null,
            userSettingsLabel: 'win',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['meta'],
        });
    });
    test('resolveKeyboardEvent Only Modifiers Ctrl+Shift+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: true,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 4 /* KeyCode.Shift */,
            code: null,
        }, {
            label: 'Ctrl+Shift',
            ariaLabel: 'Control+Shift',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl+shift',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeyboardEvent mapAltGrToCtrlAlt AltGr+Z', async () => {
        const mapper = await createKeyboardMapper(true, 'win_en_us', true);
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: true,
            keyCode: 56 /* KeyCode.KeyZ */,
            code: null,
        }, {
            label: 'Ctrl+Alt+Z',
            ariaLabel: 'Control+Alt+Z',
            electronAccelerator: 'Ctrl+Alt+Z',
            userSettingsLabel: 'ctrl+alt+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+alt+Z'],
            singleModifierDispatchParts: [null],
        });
    });
});
suite('keyboardMapper - WINDOWS por_ptb', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        mapper = await createKeyboardMapper(false, 'win_por_ptb', false);
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'win_por_ptb.txt');
    });
    test('resolveKeyboardEvent Ctrl+[IntlRo]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 115 /* KeyCode.ABNT_C1 */,
            code: null,
        }, {
            label: 'Ctrl+/',
            ariaLabel: 'Control+/',
            electronAccelerator: 'Ctrl+ABNT_C1',
            userSettingsLabel: 'ctrl+abnt_c1',
            isWYSIWYG: false,
            isMultiChord: false,
            dispatchParts: ['ctrl+ABNT_C1'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeyboardEvent Ctrl+[NumpadComma]', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 116 /* KeyCode.ABNT_C2 */,
            code: null,
        }, {
            label: 'Ctrl+.',
            ariaLabel: 'Control+.',
            electronAccelerator: 'Ctrl+ABNT_C2',
            userSettingsLabel: 'ctrl+abnt_c2',
            isWYSIWYG: false,
            isMultiChord: false,
            dispatchParts: ['ctrl+ABNT_C2'],
            singleModifierDispatchParts: [null],
        });
    });
});
suite('keyboardMapper - WINDOWS ru', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let mapper;
    suiteSetup(async () => {
        mapper = await createKeyboardMapper(false, 'win_ru', false);
    });
    test('mapping', () => {
        return assertMapping(WRITE_FILE_IF_DIFFERENT, mapper, 'win_ru.txt');
    });
    test('issue ##24361: resolveKeybinding Ctrl+K Ctrl+K', () => {
        _assertResolveKeybinding(mapper, KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */), [
            {
                label: 'Ctrl+K Ctrl+K',
                ariaLabel: 'Control+K Control+K',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+k ctrl+k',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+K', 'ctrl+K'],
                singleModifierDispatchParts: [null, null],
            },
        ]);
    });
});
suite('keyboardMapper - misc', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #23513: Toggle Sidebar Visibility and Go to Line display same key mapping in Arabic keyboard', () => {
        const mapper = new WindowsKeyboardMapper(false, {
            KeyB: {
                vkey: 'VK_B',
                value: 'لا',
                withShift: 'لآ',
                withAltGr: '',
                withShiftAltGr: '',
            },
            KeyG: {
                vkey: 'VK_G',
                value: 'ل',
                withShift: 'لأ',
                withAltGr: '',
                withShiftAltGr: '',
            },
        }, false);
        _assertResolveKeybinding(mapper, 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */, [
            {
                label: 'Ctrl+B',
                ariaLabel: 'Control+B',
                electronAccelerator: 'Ctrl+B',
                userSettingsLabel: 'ctrl+b',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+B'],
                singleModifierDispatchParts: [null],
            },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0tleWJvYXJkTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL3Rlc3Qvbm9kZS93aW5kb3dzS2V5Ym9hcmRNYXBwZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUE2QixNQUFNLHdDQUF3QyxDQUFBO0FBQzVGLE9BQU8sRUFDTixZQUFZLEVBQ1osZ0JBQWdCLEVBQ2hCLGFBQWEsRUFDYixVQUFVLEdBQ1YsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVsRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sYUFBYSxFQUNiLDBCQUEwQixFQUMxQix1QkFBdUIsRUFDdkIsY0FBYyxHQUNkLE1BQU0sOEJBQThCLENBQUE7QUFFckMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLENBQUE7QUFFckMsS0FBSyxVQUFVLG9CQUFvQixDQUNsQyxZQUFxQixFQUNyQixJQUFZLEVBQ1osaUJBQTBCO0lBRTFCLE1BQU0sV0FBVyxHQUFHLE1BQU0sY0FBYyxDQUEwQixJQUFJLENBQUMsQ0FBQTtJQUN2RSxPQUFPLElBQUkscUJBQXFCLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0FBQy9FLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUNoQyxNQUE2QixFQUM3QixDQUFTLEVBQ1QsUUFBK0I7SUFFL0IsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxrQ0FBMEIsQ0FBQTtJQUMvRCx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsVUFBVyxFQUFFLFFBQVEsQ0FBQyxD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