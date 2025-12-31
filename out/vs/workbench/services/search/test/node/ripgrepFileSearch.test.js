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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcEZpbGVTZWFyY2gudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9ub2RlL3JpcGdyZXBGaWxlU2VhcmNoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxRQUFRLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU1RSxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLHVDQUF1QyxFQUFFLENBQUE7SUFDekMsU0FBUyxjQUFjLENBQUMsTUFBZ0I7UUFDdkMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFNBQVMsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQ3hDLGNBQWMsRUFDZCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUN0QixDQUFBO0lBQ0YsQ0FBQztJQUVELENBQUM7SUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ3JFLENBQUM7UUFBQTtZQUNBLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQztZQUNoRCxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDO1lBQy9CLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQztZQUNuRCxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUscUJBQXFCLENBQUM7WUFDbkQsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQztZQUNqQyxDQUFDLDZCQUE2QixFQUFFLFNBQVMsRUFBRSx1Q0FBdUMsQ0FBQztZQUVuRiwwQ0FBMEM7WUFDMUMsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7WUFDcEQsQ0FBQyxZQUFZLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLENBQUM7U0FDekQsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDMUIsQ0FBQyxDQUFDLENBRUQ7SUFBQSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUN0RSxDQUFDO1FBQUE7WUFDQSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLENBQUM7WUFDM0MsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQztZQUU1QiwwQ0FBMEM7WUFDMUMsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7U0FDM0MsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDMUIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9