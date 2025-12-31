/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { UserActivityService, } from '../../common/userActivityService.js';
const MARK_INACTIVE_DEBOUNCE = 10_000;
suite('UserActivityService', () => {
    let userActivityService;
    let clock;
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        clock = sinon.useFakeTimers();
        userActivityService = ds.add(new UserActivityService(ds.add(new TestInstantiationService())));
    });
    teardown(() => {
        clock.restore();
    });
    test('isActive should be true initially', () => {
        assert.ok(userActivityService.isActive);
    });
    test('markActive should be inactive when all handles gone', () => {
        const h1 = userActivityService.markActive();
        const h2 = userActivityService.markActive();
        assert.strictEqual(userActivityService.isActive, true);
        h1.dispose();
        assert.strictEqual(userActivityService.isActive, true);
        h2.dispose();
        clock.tick(MARK_INACTIVE_DEBOUNCE);
        assert.strictEqual(userActivityService.isActive, false);
    });
    test('markActive sets active whenHeldFor', async () => {
        userActivityService.markActive().dispose();
        clock.tick(MARK_INACTIVE_DEBOUNCE);
        const duration = 100; // milliseconds
        const opts = { whenHeldFor: duration };
        const handle = userActivityService.markActive(opts);
        assert.strictEqual(userActivityService.isActive, false);
        clock.tick(duration - 1);
        assert.strictEqual(userActivityService.isActive, false);
        clock.tick(1);
        assert.strictEqual(userActivityService.isActive, true);
        handle.dispose();
        clock.tick(MARK_INACTIVE_DEBOUNCE);
        assert.strictEqual(userActivityService.isActive, false);
    });
    test('markActive whenHeldFor before triggers', async () => {
        userActivityService.markActive().dispose();
        clock.tick(MARK_INACTIVE_DEBOUNCE);
        const duration = 100; // milliseconds
        const opts = { whenHeldFor: duration };
        userActivityService.markActive(opts).dispose();
        assert.strictEqual(userActivityService.isActive, false);
        clock.tick(duration + MARK_INACTIVE_DEBOUNCE);
        assert.strictEqual(userActivityService.isActive, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckFjdGl2aXR5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJBY3Rpdml0eS90ZXN0L2NvbW1vbi91c2VyQWN0aXZpdHlTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUdOLG1CQUFtQixHQUNuQixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxDQUFBO0FBRXJDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsSUFBSSxtQkFBeUMsQ0FBQTtJQUM3QyxJQUFJLEtBQTRCLENBQUE7SUFFaEMsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVwRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUM3QixtQkFBbUIsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksbUJBQW1CLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDOUYsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFF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