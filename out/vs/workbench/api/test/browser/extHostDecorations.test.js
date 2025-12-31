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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RGVjb3JhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTVGLEtBQUssQ0FBQyxvQkFBb0IsRUFBRTtJQUMzQixJQUFJLGVBQTJDLENBQUE7SUFDL0MsSUFBSSxrQkFBc0MsQ0FBQTtJQUMxQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO0lBRW5DLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDO1FBQ0wsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRWpCLGVBQWUsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBOEI7WUFDN0QsMkJBQTJCLENBQUMsTUFBYztnQkFDbEQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0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