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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRpbnVvdXNSdW5TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9jb21tb24vdGVzdGluZ0NvbnRpbnVvdXNSdW5TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFaEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRixPQUFPLEVBRU4sMkJBQTJCLEdBQzNCLE1BQU0sNkNBQTZDLENBQUE7QUFTcEQsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBQ3BELElBQUksV0FBNEIsQ0FBQTtJQUNoQyxJQUFJLEVBQWdDLENBQUE7SUFFcEMsTUFBTSxRQUFRLEdBQW9CO1FBQ2pDLFNBQVMsRUFBRSxDQUFDO1FBQ1osWUFBWSxFQUFFLE1BQU07UUFDcEIsS0FBSyxrQ0FBMEI7UUFDL0IsS0FBSyxFQUFFLE9BQU87UUFDZCxxQkFBcUIsRUFBRSxJQUFJO1FBQzNCLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLHVCQUF1QixFQUFFLElBQUk7UUFDN0IsR0FBRyxFQUFFLElBQUk7S0FDVCxDQUFBO0lBQ0QsTUFBTSxRQUFRLEdBQW9CO1FBQ2pDLFNBQVMsRUFBRSxDQUFDO1FBQ1osWUFBWSxFQUFFLE1B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