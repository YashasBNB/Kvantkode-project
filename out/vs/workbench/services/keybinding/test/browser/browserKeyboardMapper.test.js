/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import '../../browser/keyboardLayouts/en.darwin.js';
import '../../browser/keyboardLayouts/de.darwin.js';
import { KeyboardLayoutContribution } from '../../browser/keyboardLayouts/_.contribution.js';
import { BrowserKeyboardMapperFactoryBase } from '../../browser/keyboardLayoutService.js';
import { KeymapInfo } from '../../common/keymapInfo.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class TestKeyboardMapperFactory extends BrowserKeyboardMapperFactoryBase {
    constructor(configurationService, notificationService, storageService, commandService) {
        // super(notificationService, storageService, commandService);
        super(configurationService);
        const keymapInfos = KeyboardLayoutContribution.INSTANCE.layoutInfos;
        this._keymapInfos.push(...keymapInfos.map((info) => new KeymapInfo(info.layout, info.secondaryLayouts, info.mapping, info.isUserKeyboardLayout)));
        this._mru = this._keymapInfos;
        this._initialized = true;
        this.setLayoutFromBrowserAPI();
        const usLayout = this.getUSStandardLayout();
        if (usLayout) {
            this.setActiveKeyMapping(usLayout.mapping);
        }
    }
}
suite('keyboard layout loader', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let instance;
    setup(() => {
        instantiationService = new TestInstantiationService();
        const storageService = new TestStorageService();
        const notitifcationService = instantiationService.stub(INotificationService, new TestNotificationService());
        const configurationService = instantiationService.stub(IConfigurationService, new TestConfigurationService());
        const commandService = instantiationService.stub(ICommandService, {});
        ds.add(instantiationService);
        ds.add(storageService);
        instance = new TestKeyboardMapperFactory(configurationService, notitifcationService, storageService, commandService);
        ds.add(instance);
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('load default US keyboard layout', () => {
        assert.notStrictEqual(instance.activeKeyboardLayout, null);
    });
    test('isKeyMappingActive', () => {
        instance.setUSKeyboardLayout();
        assert.strictEqual(instance.isKeyMappingActive({
            KeyA: {
                value: 'a',
                valueIsDeadKey: false,
                withShift: 'A',
                withShiftIsDeadKey: false,
                withAltGr: 'å',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Å',
                withShiftAltGrIsDeadKey: false,
            },
        }), true);
        assert.strictEqual(instance.isKeyMappingActive({
            KeyA: {
                value: 'a',
                valueIsDeadKey: false,
                withShift: 'A',
                withShiftIsDeadKey: false,
                withAltGr: 'å',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Å',
                withShiftAltGrIsDeadKey: false,
            },
            KeyZ: {
                value: 'z',
                valueIsDeadKey: false,
                withShift: 'Z',
                withShiftIsDeadKey: false,
                withAltGr: 'Ω',
                withAltGrIsDeadKey: false,
                withShiftAltGr: '¸',
                withShiftAltGrIsDeadKey: false,
            },
        }), true);
        assert.strictEqual(instance.isKeyMappingActive({
            KeyZ: {
                value: 'y',
                valueIsDeadKey: false,
                withShift: 'Y',
                withShiftIsDeadKey: false,
                withAltGr: '¥',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Ÿ',
                withShiftAltGrIsDeadKey: false,
            },
        }), false);
    });
    test('Switch keymapping', () => {
        instance.setActiveKeyMapping({
            KeyZ: {
                value: 'y',
                valueIsDeadKey: false,
                withShift: 'Y',
                withShiftIsDeadKey: false,
                withAltGr: '¥',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Ÿ',
                withShiftAltGrIsDeadKey: false,
            },
        });
        assert.strictEqual(!!instance.activeKeyboardLayout.isUSStandard, false);
        assert.strictEqual(instance.isKeyMappingActive({
            KeyZ: {
                value: 'y',
                valueIsDeadKey: false,
                withShift: 'Y',
                withShiftIsDeadKey: false,
                withAltGr: '¥',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Ÿ',
                withShiftAltGrIsDeadKey: false,
            },
        }), true);
        instance.setUSKeyboardLayout();
        assert.strictEqual(instance.activeKeyboardLayout.isUSStandard, true);
    });
    test('Switch keyboard layout info', () => {
        instance.setKeyboardLayout('com.apple.keylayout.German');
        assert.strictEqual(!!instance.activeKeyboardLayout.isUSStandard, false);
        assert.strictEqual(instance.isKeyMappingActive({
            KeyZ: {
                value: 'y',
                valueIsDeadKey: false,
                withShift: 'Y',
                withShiftIsDeadKey: false,
                withAltGr: '¥',
                withAltGrIsDeadKey: false,
                withShiftAltGr: 'Ÿ',
                withShiftAltGrIsDeadKey: false,
            },
        }), true);
        instance.setUSKeyboardLayout();
        assert.strictEqual(instance.activeKeyboardLayout.isUSStandard, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlcktleWJvYXJkTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy90ZXN0L2Jyb3dzZXIvYnJvd3NlcktleWJvYXJkTWFwcGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sNENBQTRDLENBQUE7QUFDbkQsT0FBTyw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sNEJBQTRCLENBQUE7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE1BQU0seUJBQTBCLFNBQVEsZ0NBQWdDO0lBQ3ZFLFlBQ0Msb0JBQTJDLEVBQzNDLG1CQUF5QyxFQUN6QyxjQUErQixFQUMvQixjQUErQjtRQUUvQiw4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