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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFByb2ZpbGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9jb21tb24vdGVzdFByb2ZpbGVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVyRixLQUFLLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO0lBQzVDLElBQUksQ0FBcUIsQ0FBQTtJQUN6QixJQUFJLEVBQW1CLENBQUE7SUFDdkIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO0lBRWpCLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixFQUFFLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDYixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDYixFQUFFLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUMxQixDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FDVCxJQUFJLGtCQUFrQixDQUFDLElBQUkscUJBQXFCLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FB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