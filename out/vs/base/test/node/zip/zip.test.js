/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import assert from 'assert';
import { tmpdir } from 'os';
import { createCancelablePromise } from '../../../common/async.js';
import { FileAccess } from '../../../common/network.js';
import * as path from '../../../common/path.js';
import { Promises } from '../../../node/pfs.js';
import { extract } from '../../../node/zip.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../common/utils.js';
import { getRandomTestPath } from '../testUtils.js';
suite('Zip', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('extract should handle directories', async () => {
        const testDir = getRandomTestPath(tmpdir(), 'vsctests', 'zip');
        await fs.promises.mkdir(testDir, { recursive: true });
        const fixtures = FileAccess.asFileUri('vs/base/test/node/zip/fixtures').fsPath;
        const fixture = path.join(fixtures, 'extract.zip');
        await createCancelablePromise((token) => extract(fixture, testDir, {}, token));
        const doesExist = await Promises.exists(path.join(testDir, 'extension'));
        assert(doesExist);
        await Promises.rm(testDir);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemlwLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS96aXAvemlwLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZELE9BQU8sS0FBSyxJQUFJLE1BQU0seUJBQXlCLENBQUE7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUVuRCxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtJQUNqQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwRCxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUQsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUVyRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQzlFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRWxELE1BQU0sdUJBQXVCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sU0FBUyxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVqQixNQUFNLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDM0IsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9