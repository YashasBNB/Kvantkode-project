/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import assert from 'assert';
import { tmpdir } from 'os';
import { realcase, realpath, realpathSync } from '../../node/extpath.js';
import { Promises } from '../../node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
import { flakySuite, getRandomTestPath } from './testUtils.js';
flakySuite('Extpath', () => {
    let testDir;
    setup(() => {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'extpath');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(() => {
        return Promises.rm(testDir);
    });
    test('realcase', async () => {
        // assume case insensitive file system
        if (process.platform === 'win32' || process.platform === 'darwin') {
            const upper = testDir.toUpperCase();
            const real = await realcase(upper);
            if (real) {
                // can be null in case of permission errors
                assert.notStrictEqual(real, upper);
                assert.strictEqual(real.toUpperCase(), upper);
                assert.strictEqual(real, testDir);
            }
        }
        // linux, unix, etc. -> assume case sensitive file system
        else {
            let real = await realcase(testDir);
            assert.strictEqual(real, testDir);
            real = await realcase(testDir.toUpperCase());
            assert.strictEqual(real, testDir.toUpperCase());
        }
    });
    test('realpath', async () => {
        const realpathVal = await realpath(testDir);
        assert.ok(realpathVal);
    });
    test('realpathSync', () => {
        const realpath = realpathSync(testDir);
        assert.ok(realpath);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cGF0aC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9leHRwYXRoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzVDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUU5RCxVQUFVLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUMxQixJQUFJLE9BQWUsQ0FBQTtJQUVuQixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU1RCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZELENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLE9BQU8sUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM1QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0Isc0NBQXNDO1FBQ3RDLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNuRSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDbkMsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFbEMsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDViwyQ0FBMkM7Z0JBQzNDLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDbEMsQ0FBQztRQUNGLENBQUM7UUFFRCx5REFBeUQ7YUFDcEQsQ0FBQztZQUNMLElBQUksSUFBSSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBRWpDLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUNoRCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNCLE1BQU0sV0FBVyxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDdkIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==