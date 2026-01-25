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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlcktleWJvYXJkTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL3Rlc3QvYnJvd3Nlci9icm93c2VyS2V5Ym9hcmRNYXBwZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFckYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDckgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsTUFBTSx5QkFBMEIsU0FBUSxnQ0FBZ0M7SUFDdkUsWUFDQyxvQkFBMkMsRUFDM0MsbUJBQXlDLEVBQ3pDLGNBQStCLEVBQy9CLGNBQStCO1FB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