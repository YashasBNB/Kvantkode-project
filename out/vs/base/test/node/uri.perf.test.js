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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpLnBlcmYudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3VyaS5wZXJmLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDakMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1RSxLQUFLLENBQUMsWUFBWSxFQUFFO0lBQ25CLCtCQUErQjtJQUMvQixJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ1AsT0FBTTtJQUNQLENBQUM7SUFFRCx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksWUFBbUIsQ0FBQTtJQUN2QixLQUFLLENBQUM7UUFDTCxZQUFZLEdBQUcsRUFBRSxDQUFBO1FBQ2pCLE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FDeEIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLE1BQU0sQ0FDbEUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNaLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNsQyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixTQUFTLFFBQVEsQ0FBQyxJQUFZLEVBQUUsUUFBa0I7UUFDakQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUNyQixRQUFRLEVBQUUsQ0FBQTtZQUNWLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUE7WUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FDVixHQUFHLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxZQUFZLENBQUMsTUFBTSxRQUFRLENBQ3hHLENBQUE7WUFDRCxLQUFLLEVBQUUsQ0FBQTtRQUNSLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFFBQVEsQ0FBQyxVQUFVLEVBQUU7UUFDcEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDM0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsd0JBQXdCLEVBQUU7UUFDbEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLFFBQVEsRUFBRTtRQUNsQixLQUFLLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7WUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsUUFBUSxFQUFFO1FBQ2xCLEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==