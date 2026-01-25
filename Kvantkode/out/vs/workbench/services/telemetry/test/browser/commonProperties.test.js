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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGVsZW1ldHJ5L3Rlc3QvYnJvd3Nlci9jb21tb25Qcm9wZXJ0aWVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyx1Q0FBdUMsRUFBRTtJQUM5QyxNQUFNLE1BQU0sR0FBVyxTQUFVLENBQUE7SUFDakMsTUFBTSxPQUFPLEdBQVcsU0FBVSxDQUFBO0lBQ2xDLElBQUksa0JBQTBDLENBQUE7SUFFOUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzdCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysa0JBQWtCLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFBO0lBQ2xELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUs7UUFDM0MsTUFBTSxnQ0FBZ0MsR0FBRyxHQUFHLEVBQUU7WUFDN0MsT0FBTztnQkFDTixNQUFNLEVBQUUsR0FBRzthQUNYLENBQUE7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxnQ0FBZ0MsQ0FDN0Msa0JBQWtCLEVBQ2xCLE1BQU0sRUFDTixPQUFPLEVBQ1AsS0FBSyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBQ1QsS0FBSyxFQUNMLGdDQUFnQyxDQUNoQyxDQUFBO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLElBQUksS0FBSyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsSUFBSSxLQUFLLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLDhCQUE4QixJQUFJLEtBQUssQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxFQUFFLENBQUMsaUJBQWlCLElBQUksS0FBSyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsSUFBSSxLQUFLLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsRUFBRSxDQUFDLHdCQUF3QixJQUFJLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxFQUFFLENBQUMscUJBQXFCLElBQUksS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxFQUFFLENBQUMsa0JBQWtCLElBQUksS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUs7UUFDbkQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1QsTUFBTSxnQ0FBZ0MsR0FBRyxHQUFHLEVBQUU7WUFDN0MsT0FBTyxNQUFNLENBQUMsZ0JBQWdCLENBQzdCLEVBQUUsRUFDRjtnQkFDQyxNQUFNLEVBQUU7b0JBQ1AsR0FBRyxFQUFFLEdBQUcsRUFBRTt3QkFDVCxPQUFPLENBQUMsRUFBRSxDQUFBO29CQUNYLENBQUM7b0JBQ0QsVUFBVSxFQUFFLElBQUk7aUJBQ2hCO2FBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsZ0NBQWdDLENBQzdDLGtCQUFrQixFQUNsQixNQUFNLEVBQ04sT0FBTyxFQUNQLEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULEtBQUssRUFDTCxnQ0FBZ0MsQ0FDaEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRDLE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxDQUM5QyxrQkFBa0IsRUFDbEIsTUFBTSxFQUNOLE9BQU8sRUFDUCxLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsRUFDVCxLQUFLLEVBQ0wsZ0NBQWdDLENBQ2hDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN4QyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=