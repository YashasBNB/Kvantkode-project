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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckFjdGl2aXR5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckFjdGl2aXR5L3Rlc3QvY29tbW9uL3VzZXJBY3Rpdml0eVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUNoQyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBR04sbUJBQW1CLEdBQ25CLE1BQU0scUNBQXFDLENBQUE7QUFFNUMsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUE7QUFFckMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxJQUFJLG1CQUF5QyxDQUFBO0lBQzdDLElBQUksS0FBNEIsQ0FBQTtJQUVoQyxNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXBELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQzdCLG1CQUFtQixHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5RixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFF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