/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as platform from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { fixDriveC, getAbsoluteGlob } from '../../node/ripgrepFileSearch.js';
suite('RipgrepFileSearch - etc', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testGetAbsGlob(params) {
        const [folder, glob, expectedResult] = params;
        assert.strictEqual(fixDriveC(getAbsoluteGlob(folder, glob)), expectedResult, JSON.stringify(params));
    }
    ;
    (!platform.isWindows ? test.skip : test)('getAbsoluteGlob_win', () => {
        ;
        [
            ['C:/foo/bar', 'glob/**', '/foo\\bar\\glob\\**'],
            ['c:/', 'glob/**', '/glob\\**'],
            ['C:\\foo\\bar', 'glob\\**', '/foo\\bar\\glob\\**'],
            ['c:\\foo\\bar', 'glob\\**', '/foo\\bar\\glob\\**'],
            ['c:\\', 'glob\\**', '/glob\\**'],
            ['\\\\localhost\\c$\\foo\\bar', 'glob/**', '\\\\localhost\\c$\\foo\\bar\\glob\\**'],
            // absolute paths are not resolved further
            ['c:/foo/bar', '/path/something', '/path/something'],
            ['c:/foo/bar', 'c:\\project\\folder', '/project\\folder'],
        ].forEach(testGetAbsGlob);
    });
    (platform.isWindows ? test.skip : test)('getAbsoluteGlob_posix', () => {
        ;
        [
            ['/foo/bar', 'glob/**', '/foo/bar/glob/**'],
            ['/', 'glob/**', '/glob/**'],
            // absolute paths are not resolved further
            ['/', '/project/folder', '/project/folder'],
        ].forEach(testGetAbsGlob);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcEZpbGVTZWFyY2gudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L25vZGUvcmlwZ3JlcEZpbGVTZWFyY2gudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTVFLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsdUNBQXVDLEVBQUUsQ0FBQTtJQUN6QyxTQUFTLGNBQWMsQ0FBQyxNQUFnQjtRQUN2QyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FDakIsU0FBUyxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFDeEMsY0FBYyxFQUNkLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQ3RCLENBQUE7SUFDRixDQUFDO0lBRUQsQ0FBQztJQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDckUsQ0FBQztRQUFBO1lBQ0EsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixDQUFDO1lBQ2hELENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUM7WUFDL0IsQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLHFCQUFxQixDQUFDO1lBQ25ELENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQztZQUNuRCxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDO1lBQ2pDLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxFQUFFLHVDQUF1QyxDQUFDO1lBRW5GLDBDQUEwQztZQUMxQyxDQUFDLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQztZQUNwRCxDQUFDLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsQ0FBQztTQUN6RCxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FFRDtJQUFBLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ3RFLENBQUM7UUFBQTtZQUNBLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQztZQUMzQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO1lBRTVCLDBDQUEwQztZQUMxQyxDQUFDLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQztTQUMzQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=