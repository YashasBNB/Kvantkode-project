/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ChecksumService } from '../../node/checksumService.js';
import { FileService } from '../../../files/common/fileService.js';
import { DiskFileSystemProvider } from '../../../files/node/diskFileSystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
suite('Checksum Service', () => {
    let diskFileSystemProvider;
    let fileService;
    setup(() => {
        const logService = new NullLogService();
        fileService = new FileService(logService);
        diskFileSystemProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
    });
    teardown(() => {
        diskFileSystemProvider.dispose();
        fileService.dispose();
    });
    test('checksum', async () => {
        const checksumService = new ChecksumService(fileService);
        const checksum = await checksumService.checksum(URI.file(FileAccess.asFileUri('vs/platform/checksum/test/node/fixtures/lorem.txt').fsPath));
        assert.ok(checksum === 'd/9bMU0ydNCmc/hg8ItWeiLT/ePnf7gyPRQVGpd6tRI' ||
            checksum === 'eJeeTIS0dzi8MZY+nHhjPBVtNbmGqxfVvgEOB4sqVIc'); // depends on line endings git config
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tzdW1TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jaGVja3N1bS90ZXN0L25vZGUvY2hlY2tzdW1TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTNELEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsSUFBSSxzQkFBOEMsQ0FBQTtJQUNsRCxJQUFJLFdBQXlCLENBQUE7SUFFN0IsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDdkMsV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRXpDLHNCQUFzQixHQUFHLElBQUksc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDL0QsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNCLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRXhELE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBZSxDQUFDLFFBQVEsQ0FDOUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLG1EQUFtRCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQzFGLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUNSLFFBQVEsS0FBSyw2Q0FBNkM7WUFDekQsUUFBUSxLQUFLLDZDQUE2QyxDQUMzRCxDQUFBLENBQUMscUNBQXFDO0lBQ3hDLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9