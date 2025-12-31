/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { resolveWorkbenchCommonProperties } from '../../browser/workbenchCommonProperties.js';
import { InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Browser Telemetry - common properties', function () {
    const commit = undefined;
    const version = undefined;
    let testStorageService;
    teardown(() => {
        testStorageService.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testStorageService = new InMemoryStorageService();
    });
    test('mixes in additional properties', async function () {
        const resolveCommonTelemetryProperties = () => {
            return {
                userId: '1',
            };
        };
        const props = resolveWorkbenchCommonProperties(testStorageService, commit, version, false, undefined, undefined, false, resolveCommonTelemetryProperties);
        assert.ok('commitHash' in props);
        assert.ok('sessionID' in props);
        assert.ok('timestamp' in props);
        assert.ok('common.platform' in props);
        assert.ok('common.timesincesessionstart' in props);
        assert.ok('common.sequence' in props);
        assert.ok('version' in props);
        assert.ok('common.firstSessionDate' in props, 'firstSessionDate');
        assert.ok('common.lastSessionDate' in props, 'lastSessionDate');
        assert.ok('common.isNewSession' in props, 'isNewSession');
        assert.ok('common.machineId' in props, 'machineId');
        assert.strictEqual(props['userId'], '1');
    });
    test('mixes in additional dyanmic properties', async function () {
        let i = 1;
        const resolveCommonTelemetryProperties = () => {
            return Object.defineProperties({}, {
                userId: {
                    get: () => {
                        return i++;
                    },
                    enumerable: true,
                },
            });
        };
        const props = resolveWorkbenchCommonProperties(testStorageService, commit, version, false, undefined, undefined, false, resolveCommonTelemetryProperties);
        assert.strictEqual(props['userId'], 1);
        const props2 = resolveWorkbenchCommonProperties(testStorageService, commit, version, false, undefined, undefined, false, resolveCommonTelemetryProperties);
        assert.strictEqual(props2['userId'], 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RlbGVtZXRyeS90ZXN0L2Jyb3dzZXIvY29tbW9uUHJvcGVydGllcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsdUNBQXVDLEVBQUU7SUFDOUMsTUFBTSxNQUFNLEdBQVcsU0FBVSxDQUFBO0lBQ2pDLE1BQU0sT0FBTyxHQUFXLFNBQVUsQ0FBQTtJQUNsQyxJQUFJLGtCQUEwQyxDQUFBO0lBRTlDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM3QixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGtCQUFrQixHQUFHLElBQUksc0JBQXNCLEVBQUUsQ0FBQTtJQUNsRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLO1FBQzNDLE1BQU0sZ0NBQWdDLEdBQUcsR0FBRyxFQUFFO1lBQzdDLE9BQU87Z0JBQ04sTUFBTSxFQUFFLEdBQUc7YUFDWCxDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsZ0NBQWdDLENBQzdDLGtCQUFrQixFQUNsQixNQUFNLEVBQ04sT0FBTyxFQUNQLEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULEtBQUssRUFDTCxnQ0FBZ0MsQ0FDaEMsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxJQUFJLEtBQUssQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsaUJBQWlCLElBQUksS0FBSyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyw4QkFBOEIsSUFBSSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixJQUFJLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMseUJBQXlCLElBQUksS0FBSyxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLEVBQUUsQ0FBQyx3QkFBd0IsSUFBSSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsRUFBRSxDQUFDLHFCQUFxQixJQUFJLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsRUFBRSxDQUFDLGtCQUFrQixJQUFJLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLO1FBQ25ELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNULE1BQU0sZ0NBQWdDLEdBQUcsR0FBRyxFQUFFO1lBQzdDLE9BQU8sTUFBTSxDQUFDLGdCQUFnQixDQUM3QixFQUFFLEVBQ0Y7Z0JBQ0MsTUFBTSxFQUFFO29CQUNQLEdBQUcsRUFBRSxHQUFHLEVBQUU7d0JBQ1QsT0FBTyxDQUFDLEVBQUUsQ0FBQTtvQkFDWCxDQUFDO29CQUNELFVBQVUsRUFBRSxJQUFJO2lCQUNoQjthQUNELENBQ0QsQ0FBQTtRQUNGLENBQUMsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLGdDQUFnQyxDQUM3QyxrQkFBa0IsRUFDbEIsTUFBTSxFQUNOLE9BQU8sRUFDUCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsRUFDVCxLQUFLLEVBQ0wsZ0NBQWdDLENBQ2hDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0QyxNQUFNLE1BQU0sR0FBRyxnQ0FBZ0MsQ0FDOUMsa0JBQWtCLEVBQ2xCLE1BQU0sRUFDTixPQUFPLEVBQ1AsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBQ1QsS0FBSyxFQUNMLGdDQUFnQyxDQUNoQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDeEMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9