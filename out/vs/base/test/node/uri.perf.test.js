/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { readFileSync } from 'fs';
import { FileAccess } from '../../common/network.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('URI - perf', function () {
    // COMMENT THIS OUT TO RUN TEST
    if (1) {
        return;
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    let manyFileUris;
    setup(function () {
        manyFileUris = [];
        const data = readFileSync(FileAccess.asFileUri('vs/base/test/node/uri.perf.data.txt').fsPath).toString();
        const lines = data.split('\n');
        for (const line of lines) {
            manyFileUris.push(URI.file(line));
        }
    });
    function perfTest(name, callback) {
        test(name, (_done) => {
            const t1 = Date.now();
            callback();
            const d = Date.now() - t1;
            console.log(`${name} took ${d}ms (${(d / manyFileUris.length).toPrecision(3)} ms/uri) (${manyFileUris.length} uris)`);
            _done();
        });
    }
    perfTest('toString', function () {
        for (const uri of manyFileUris) {
            const data = uri.toString();
            assert.ok(data);
        }
    });
    perfTest('toString(skipEncoding)', function () {
        for (const uri of manyFileUris) {
            const data = uri.toString(true);
            assert.ok(data);
        }
    });
    perfTest('fsPath', function () {
        for (const uri of manyFileUris) {
            const data = uri.fsPath;
            assert.ok(data);
        }
    });
    perfTest('toJSON', function () {
        for (const uri of manyFileUris) {
            const data = uri.toJSON();
            assert.ok(data);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpLnBlcmYudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvdXJpLnBlcmYudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLElBQUksQ0FBQTtBQUNqQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTVFLEtBQUssQ0FBQyxZQUFZLEVBQUU7SUFDbkIsK0JBQStCO0lBQy9CLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDUCxPQUFNO0lBQ1AsQ0FBQztJQUVELHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxZQUFtQixDQUFBO0lBQ3ZCLEtBQUssQ0FBQztRQUNMLFlBQVksR0FBRyxFQUFFLENBQUE7UUFDakIsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUN4QixVQUFVLENBQUMsU0FBUyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsTUFBTSxDQUNsRSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ1osTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsUUFBUSxDQUFDLElBQVksRUFBRSxRQUFrQjtRQUNqRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ3JCLFFBQVEsRUFBRSxDQUFBO1lBQ1YsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQTtZQUN6QixPQUFPLENBQUMsR0FBRyxDQUNWLEdBQUcsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLFlBQVksQ0FBQyxNQUFNLFFBQVEsQ0FDeEcsQ0FBQTtZQUNELEtBQUssRUFBRSxDQUFBO1FBQ1IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsUUFBUSxDQUFDLFVBQVUsRUFBRTtRQUNwQixLQUFLLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMzQixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRTtRQUNsQyxLQUFLLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsUUFBUSxFQUFFO1FBQ2xCLEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQTtZQUN2QixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxRQUFRLEVBQUU7UUFDbEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDekIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9