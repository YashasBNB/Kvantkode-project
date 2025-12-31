/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { release, hostname } from 'os';
import { resolveWorkbenchCommonProperties } from '../../common/workbenchCommonProperties.js';
import { InMemoryStorageService, } from '../../../../../platform/storage/common/storage.js';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Telemetry - common properties', function () {
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
    test('default', function () {
        const props = resolveWorkbenchCommonProperties(testStorageService, release(), hostname(), commit, version, 'someMachineId', 'someSqmId', 'somedevDeviceId', false, process);
        assert.ok('commitHash' in props);
        assert.ok('sessionID' in props);
        assert.ok('timestamp' in props);
        assert.ok('common.platform' in props);
        assert.ok('common.nodePlatform' in props);
        assert.ok('common.nodeArch' in props);
        assert.ok('common.timesincesessionstart' in props);
        assert.ok('common.sequence' in props);
        // assert.ok('common.version.shell' in first.data); // only when running on electron
        // assert.ok('common.version.renderer' in first.data);
        assert.ok('common.platformVersion' in props, 'platformVersion');
        assert.ok('version' in props);
        assert.ok('common.firstSessionDate' in props, 'firstSessionDate');
        assert.ok('common.lastSessionDate' in props, 'lastSessionDate'); // conditional, see below, 'lastSessionDate'ow
        assert.ok('common.isNewSession' in props, 'isNewSession');
        // machine id et al
        assert.ok('common.machineId' in props, 'machineId');
    });
    test('lastSessionDate when available', function () {
        testStorageService.store('telemetry.lastSessionDate', new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const props = resolveWorkbenchCommonProperties(testStorageService, release(), hostname(), commit, version, 'someMachineId', 'someSqmId', 'somedevDeviceId', false, process);
        assert.ok('common.lastSessionDate' in props); // conditional, see below
        assert.ok('common.isNewSession' in props);
        assert.strictEqual(props['common.isNewSession'], '0');
    });
    test('values chance on ask', async function () {
        const props = resolveWorkbenchCommonProperties(testStorageService, release(), hostname(), commit, version, 'someMachineId', 'someSqmId', 'somedevDeviceId', false, process);
        let value1 = props['common.sequence'];
        let value2 = props['common.sequence'];
        assert.ok(value1 !== value2, 'seq');
        value1 = props['timestamp'];
        value2 = props['timestamp'];
        assert.ok(value1 !== value2, 'timestamp');
        value1 = props['common.timesincesessionstart'];
        await timeout(10);
        value2 = props['common.timesincesessionstart'];
        assert.ok(value1 !== value2, 'timesincesessionstart');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RlbGVtZXRyeS90ZXN0L25vZGUvY29tbW9uUHJvcGVydGllcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN0QyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM1RixPQUFPLEVBRU4sc0JBQXNCLEdBRXRCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQywrQkFBK0IsRUFBRTtJQUN0QyxNQUFNLE1BQU0sR0FBVyxTQUFVLENBQUE7SUFDakMsTUFBTSxPQUFPLEdBQVcsU0FBVSxDQUFBO0lBQ2xDLElBQUksa0JBQTBDLENBQUE7SUFFOUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzdCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysa0JBQWtCLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFBO0lBQ2xELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFNBQVMsRUFBRTtRQUNmLE1BQU0sS0FBSyxHQUFHLGdDQUFnQyxDQUM3QyxrQkFBa0IsRUFDbEIsT0FBTyxFQUFFLEVBQ1QsUUFBUSxFQUFFLEVBQ1YsTUFBTSxFQUNOLE9B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