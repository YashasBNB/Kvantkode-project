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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemlwLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3ppcC96aXAudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdkQsT0FBTyxLQUFLLElBQUksTUFBTSx5QkFBeUIsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzlDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRW5ELEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO0lBQ2pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BELE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5RCxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXJELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDOUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFFbEQsTUFBTSx1QkFBdUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDOUUsTUFBTSxTQUFTLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWpCLE1BQU0sUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUMzQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=