/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ExtHostDecorations } from '../../common/extHostDecorations.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
suite('ExtHostDecorations', function () {
    let mainThreadShape;
    let extHostDecorations;
    const providers = new Set();
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        providers.clear();
        mainThreadShape = new (class extends mock() {
            $registerDecorationProvider(handle) {
                providers.add(handle);
            }
        })();
        extHostDecorations = new ExtHostDecorations(new (class extends mock() {
            getProxy() {
                return mainThreadShape;
            }
        })(), new NullLogService());
    });
    test('SCM Decorations missing #100524', async function () {
        let calledA = false;
        let calledB = false;
        // never returns
        extHostDecorations.registerFileDecorationProvider({
            provideFileDecoration() {
                calledA = true;
                return new Promise(() => { });
            },
        }, nullExtensionDescription);
        // always returns
        extHostDecorations.registerFileDecorationProvider({
            provideFileDecoration() {
                calledB = true;
                return new Promise((resolve) => resolve({ badge: 'H', tooltip: 'Hello' }));
            },
        }, nullExtensionDescription);
        const requests = [...providers.values()].map((handle, idx) => {
            return extHostDecorations.$provideDecorations(handle, [{ id: idx, uri: URI.parse('test:///file') }], CancellationToken.None);
        });
        assert.strictEqual(calledA, true);
        assert.strictEqual(calledB, true);
        assert.strictEqual(requests.length, 2);
        const [first, second] = requests;
        const firstResult = await Promise.race([first, timeout(30).then(() => false)]);
        assert.strictEqual(typeof firstResult, 'boolean'); // never finishes...
        const secondResult = await Promise.race([second, timeout(30).then(() => false)]);
        assert.strictEqual(typeof secondResult, 'object');
        await timeout(30);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3REZWNvcmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFNUYsS0FBSyxDQUFDLG9CQUFvQixFQUFFO0lBQzNCLElBQUksZUFBMkMsQ0FBQTtJQUMvQyxJQUFJLGtCQUFzQyxDQUFBO0lBQzFDLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFFbkMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUM7UUFDTCxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFakIsZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUE4QjtZQUM3RCwyQkFBMkIsQ0FBQyxNQUFjO2dCQUNsRCxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFB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