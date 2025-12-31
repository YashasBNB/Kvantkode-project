/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { mock, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { TestingContinuousRunService, } from '../../common/testingContinuousRunService.js';
suite('TestingContinuousRunService', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let testService;
    let cr;
    const profile1 = {
        profileId: 1,
        controllerId: 'ctrl',
        group: 2 /* TestRunProfileBitset.Run */,
        label: 'label',
        supportsContinuousRun: true,
        isDefault: false,
        hasConfigurationHandler: true,
        tag: null,
    };
    const profile2 = {
        profileId: 2,
        controllerId: 'ctrl',
        group: 2 /* TestRunProfileBitset.Run */,
        label: 'label',
        supportsContinuousRun: true,
        isDefault: false,
        hasConfigurationHandler: true,
        tag: null,
    };
    class MockTestService extends mock() {
        constructor() {
            super(...arguments);
            this.requests = new Set();
            this.log = [];
        }
        startContinuousRun(req, token) {
            this.requests.add(req);
            this.log.push(['start', req.targets[0].profileId, req.targets[0].testIds]);
            ds.add(token.onCancellationRequested(() => {
                this.log.push(['stop', req.targets[0].profileId, req.targets[0].testIds]);
                this.requests.delete(req);
            }));
            return Promise.resolve();
        }
    }
    class MockProfilesService extends mock() {
        constructor() {
            super(...arguments);
            this.didChangeEmitter = ds.add(new Emitter());
            this.onDidChange = this.didChangeEmitter.event;
        }
        getGroupDefaultProfiles(group, controllerId) {
            return [];
        }
    }
    setup(() => {
        testService = new MockTestService();
        cr = ds.add(new TestingContinuousRunService(testService, ds.add(new TestStorageService()), ds.add(new MockContextKeyService()), new MockProfilesService()));
    });
    test('isSpecificallyEnabledFor', () => {
        assert.strictEqual(cr.isEnabled(), false);
        assert.strictEqual(cr.isSpecificallyEnabledFor('testId'), false);
        cr.start([profile1], 'testId\0child');
        assert.strictEqual(cr.isSpecificallyEnabledFor('testId'), false);
        assert.strictEqual(cr.isSpecificallyEnabledFor('testId\0child'), true);
        assert.deepStrictEqual(testService.log, [['start', 1, ['testId\0child']]]);
    });
    test('isEnabledForAParentOf', () => {
        assert.strictEqual(cr.isEnabled(), false);
        assert.strictEqual(cr.isEnabledForAParentOf('testId'), false);
        cr.start([profile1], 'parentTestId\0testId');
        assert.strictEqual(cr.isEnabledForAParentOf('parentTestId'), false);
        assert.strictEqual(cr.isEnabledForAParentOf('parentTestId\0testId'), true);
        assert.strictEqual(cr.isEnabledForAParentOf('parentTestId\0testId\0nestd'), true);
        assert.strictEqual(cr.isEnabled(), true);
        assert.deepStrictEqual(testService.log, [['start', 1, ['parentTestId\0testId']]]);
    });
    test('isEnabledForAChildOf', () => {
        assert.strictEqual(cr.isEnabled(), false);
        assert.strictEqual(cr.isEnabledForAChildOf('testId'), false);
        cr.start([profile1], 'testId\0childTestId');
        assert.strictEqual(cr.isEnabledForAChildOf('testId'), true);
        assert.strictEqual(cr.isEnabledForAChildOf('testId\0childTestId'), true);
        assert.strictEqual(cr.isEnabledForAChildOf('testId\0childTestId\0neested'), false);
        assert.strictEqual(cr.isEnabled(), true);
    });
    suite('lifecycle', () => {
        test('stops general in DFS order', () => {
            cr.start([profile1], 'a\0b\0c\0d');
            cr.start([profile1], 'a\0b');
            cr.start([profile1], 'a\0b\0c');
            cr.stop();
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['a\0b\0c\0d']],
                ['start', 1, ['a\0b']],
                ['start', 1, ['a\0b\0c']],
                ['stop', 1, ['a\0b\0c\0d']],
                ['stop', 1, ['a\0b\0c']],
                ['stop', 1, ['a\0b']],
            ]);
            assert.strictEqual(cr.isEnabled(), false);
        });
        test('stops profiles in DFS order', () => {
            cr.start([profile1], 'a\0b\0c\0d');
            cr.start([profile1], 'a\0b');
            cr.start([profile1], 'a\0b\0c');
            cr.stopProfile(profile1);
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['a\0b\0c\0d']],
                ['start', 1, ['a\0b']],
                ['start', 1, ['a\0b\0c']],
                ['stop', 1, ['a\0b\0c\0d']],
                ['stop', 1, ['a\0b\0c']],
                ['stop', 1, ['a\0b']],
            ]);
            assert.strictEqual(cr.isEnabled(), false);
        });
        test('updates profile for a test if profile is changed', () => {
            cr.start([profile1], 'parent\0testId');
            cr.start([profile2], 'parent\0testId');
            assert.strictEqual(cr.isEnabled(), true);
            cr.stop();
            assert.strictEqual(cr.isEnabled(), false);
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['parent\0testId']],
                ['start', 2, ['parent\0testId']],
                ['stop', 1, ['parent\0testId']],
                ['stop', 2, ['parent\0testId']],
            ]);
            assert.strictEqual(cr.isEnabled(), false);
        });
        test('stops a single profile test', () => {
            cr.start([profile1, profile2], 'parent\0testId');
            cr.stopProfile(profile1);
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['parent\0testId']],
                ['start', 2, ['parent\0testId']],
                ['stop', 1, ['parent\0testId']],
            ]);
            assert.strictEqual(cr.isEnabled(), true);
            cr.stopProfile(profile2);
            assert.deepStrictEqual(testService.log, [
                ['start', 1, ['parent\0testId']],
                ['start', 2, ['parent\0testId']],
                ['stop', 1, ['parent\0testId']],
                ['stop', 2, ['parent\0testId']],
            ]);
            assert.strictEqual(cr.isEnabled(), false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRpbnVvdXNSdW5TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvY29tbW9uL3Rlc3RpbmdDb250aW51b3VzUnVuU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRWhDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0YsT0FBTyxFQUVOLDJCQUEyQixHQUMzQixNQUFNLDZDQUE2QyxDQUFBO0FBU3BELEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUNwRCxJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxFQUFnQyxDQUFBO0lBRXBDLE1BQU0sUUFBUSxHQUFvQjtRQUNqQyxTQUFTLEVBQUUsQ0FBQztRQUNaLFlBQVksRUFBRSxNQUFNO1FBQ3BCLEtBQUssa0NBQTBCO1FBQy9CLEtBQUssRUFBRSxPQUFPO1FBQ2QscUJBQXFCLEVBQUUsSUFBSTtRQUMzQixTQUFTLEVBQUUsS0FBSztRQUNoQix1QkFBdUIsRUFBRSxJQUFJO1FBQzdCLEdBQUcsRUFBRSxJQUFJO0tBQ1QsQ0FBQTtJQUNELE1BQU0sUUFBUSxHQUFvQjtRQUNqQyxTQUFTLEVBQUUsQ0FBQztRQUNaLFlBQVksRUFBRSxNQUFNO1FB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