/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { TestProfileService } from '../../common/testProfileService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
suite('Workbench - TestProfileService', () => {
    let t;
    let ds;
    let idCounter = 0;
    teardown(() => {
        ds.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        idCounter = 0;
        ds = new DisposableStore();
        t = ds.add(new TestProfileService(new MockContextKeyService(), ds.add(new TestStorageService())));
    });
    const addProfile = (profile) => {
        const p = {
            controllerId: 'ctrlId',
            group: 2 /* TestRunProfileBitset.Run */,
            isDefault: true,
            label: 'profile',
            profileId: idCounter++,
            hasConfigurationHandler: false,
            tag: null,
            supportsContinuousRun: false,
            ...profile,
        };
        t.addProfile({ id: 'ctrlId' }, p);
        return p;
    };
    const assertGroupDefaults = (group, expected) => {
        assert.deepStrictEqual(t.getGroupDefaultProfiles(group).map((p) => p.label), expected.map((e) => e.label));
    };
    const expectProfiles = (expected, actual) => {
        const e = expected.map((e) => e.label).sort();
        const a = actual.sort();
        assert.deepStrictEqual(e, a);
    };
    test('getGroupDefaultProfiles', () => {
        addProfile({ isDefault: true, group: 4 /* TestRunProfileBitset.Debug */, label: 'a' });
        addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'b' });
        addProfile({ isDefault: true, group: 2 /* TestRunProfileBitset.Run */, label: 'c' });
        addProfile({ isDefault: true, group: 2 /* TestRunProfileBitset.Run */, label: 'd', controllerId: '2' });
        addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'e', controllerId: '2' });
        expectProfiles(t.getGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */), ['c', 'd']);
        expectProfiles(t.getGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */), ['a']);
    });
    suite('setGroupDefaultProfiles', () => {
        test('applies simple changes', () => {
            const p1 = addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'a' });
            addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'b' });
            const p3 = addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'c' });
            addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'd' });
            t.setGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */, [p3]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p3]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p1]);
        });
        test('syncs labels if same', () => {
            const p1 = addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'a' });
            const p2 = addProfile({ isDefault: false, group: 4 /* TestRunProfileBitset.Debug */, label: 'b' });
            const p3 = addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'a' });
            const p4 = addProfile({ isDefault: false, group: 2 /* TestRunProfileBitset.Run */, label: 'b' });
            t.setGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */, [p3]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p3]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p1]);
            t.setGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */, [p2]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p4]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p2]);
        });
        test('does not mess up sync for multiple controllers', () => {
            // ctrl a and b both of have their own labels. ctrl c does not and should be unaffected
            const p1 = addProfile({
                isDefault: false,
                controllerId: 'a',
                group: 4 /* TestRunProfileBitset.Debug */,
                label: 'a',
            });
            const p2 = addProfile({
                isDefault: false,
                controllerId: 'b',
                group: 4 /* TestRunProfileBitset.Debug */,
                label: 'b1',
            });
            const p3 = addProfile({
                isDefault: false,
                controllerId: 'b',
                group: 4 /* TestRunProfileBitset.Debug */,
                label: 'b2',
            });
            const p4 = addProfile({
                isDefault: false,
                controllerId: 'c',
                group: 4 /* TestRunProfileBitset.Debug */,
                label: 'c1',
            });
            const p5 = addProfile({
                isDefault: false,
                controllerId: 'a',
                group: 2 /* TestRunProfileBitset.Run */,
                label: 'a',
            });
            const p6 = addProfile({
                isDefault: false,
                controllerId: 'b',
                group: 2 /* TestRunProfileBitset.Run */,
                label: 'b1',
            });
            const p7 = addProfile({
                isDefault: false,
                controllerId: 'b',
                group: 2 /* TestRunProfileBitset.Run */,
                label: 'b2',
            });
            const p8 = addProfile({
                isDefault: false,
                controllerId: 'b',
                group: 2 /* TestRunProfileBitset.Run */,
                label: 'b3',
            });
            // same profile on both
            t.setGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */, [p3]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p7]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p3]);
            // different profile, other should be unaffected
            t.setGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */, [p8]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p8]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p5]);
            // multiple changes in one go, with unmatched c
            t.setGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */, [p1, p2, p4]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p5, p6, p8]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p1, p2, p4]);
            // identity
            t.setGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */, [p5, p6, p8]);
            assertGroupDefaults(2 /* TestRunProfileBitset.Run */, [p5, p6, p8]);
            assertGroupDefaults(4 /* TestRunProfileBitset.Debug */, [p1, p2, p4]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFByb2ZpbGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvY29tbW9uL3Rlc3RQcm9maWxlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDL0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFckYsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUM1QyxJQUFJLENBQXFCLENBQUE7SUFDekIsSUFBSSxFQUFtQixDQUFBO0lBQ3ZCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUVqQixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2IsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsRUFBRSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDMUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQ1QsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FB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