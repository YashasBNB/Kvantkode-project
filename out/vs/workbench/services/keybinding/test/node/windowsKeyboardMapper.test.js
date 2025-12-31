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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0tleWJvYXJkTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy90ZXN0L25vZGUvd2luZG93c0tleWJvYXJkTWFwcGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBNkIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM1RixPQUFPLEVBQ04sWUFBWSxFQUNaLGdCQUFnQixFQUNoQixhQUFhLEVBQ2IsVUFBVSxHQUNWLE1BQU0sMkNBQTJDLENBQUE7QUFFbEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0UsT0FBTyxFQUVOLGFBQWEsRUFDYiwwQkFBMEIsRUFDMUIsdUJBQXVCLEVBQ3ZCLGNBQWMsR0FDZCxNQUFNLDhCQUE4QixDQUFBO0FBRXJDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE1BQU0sdUJBQXVCLEdBQUcsS0FBSyxDQUFBO0FBRXJDLEtBQUssVUFBVSxvQkFBb0IsQ0FDbEMsWUFBcUIsRUFDckIsSUFBWSxFQUNaLGlCQUEwQjtJQUUxQixNQUFNLFdBQVcsR0FBRyxNQUFNLGNBQWMsQ0FBMEIsSUFBSSxDQUFDLENBQUE7SUFDdkUsT0FBTyxJQUFJLHFCQUFxQixDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtBQUMvRSxDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FDaEMsTUFBNkIsRUFDN0IsQ0FBUyxFQUNULFFBQStCO0lBRS9CLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDLENBQUMsa0NBQTBCLENBQUE7SUFDL0QsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFVBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtB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