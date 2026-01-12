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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGVsZW1ldHJ5L3Rlc3Qvbm9kZS9jb21tb25Qcm9wZXJ0aWVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzVGLE9BQU8sRUFFTixzQkFBc0IsR0FFdEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLCtCQUErQixFQUFFO0lBQ3RDLE1BQU0sTUFBTSxHQUFXLFNBQVUsQ0FBQTtJQUNqQyxNQUFNLE9BQU8sR0FBVyxTQUFVLENBQUE7SUFDbEMsSUFBSSxrQkFBMEMsQ0FBQTtJQUU5QyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2Isa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixrQkFBa0IsR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUE7SUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsU0FBUyxFQUFFO1FBQ2YsTUFBTSxLQUFLLEdBQUcsZ0NBQWdDLENBQzdDLGtCQUFrQixFQUNsQixPQUFPLEVBQUUsRUFDVCxRQUFRLEVBQUUsRUFDVixNQUFNLEVB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