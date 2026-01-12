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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tzdW1TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NoZWNrc3VtL3Rlc3Qvbm9kZS9jaGVja3N1bVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRS9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFM0QsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5QixJQUFJLHNCQUE4QyxDQUFBO0lBQ2xELElBQUksV0FBeUIsQ0FBQTtJQUU3QixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxVQUFVLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUN2QyxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFekMsc0JBQXNCLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUMvRCxXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2hDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0IsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFeEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFlLENBQUMsUUFBUSxDQUM5QyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsbURBQW1ELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FDMUYsQ0FBQTtRQUNELE1BQU0sQ0FBQyxFQUFFLENBQ1IsUUFBUSxLQUFLLDZDQUE2QztZQUN6RCxRQUFRLEtBQUssNkNBQTZDLENBQzNELENBQUEsQ0FBQyxxQ0FBcUM7SUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=