/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { BoundModelReferenceCollection } from '../../browser/mainThreadDocuments.js';
import { timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { extUri } from '../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('BoundModelReferenceCollection', function () {
    let col;
    setup(function () {
        col = new BoundModelReferenceCollection(extUri, 15, 75);
    });
    teardown(function () {
        col.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('max age', async function () {
        let didDispose = false;
        col.add(URI.parse('test://farboo'), {
            object: {},
            dispose() {
                didDispose = true;
            },
        });
        await timeout(30);
        assert.strictEqual(didDispose, true);
    });
    test('max size', function () {
        const disposed = [];
        col.add(URI.parse('test://farboo'), {
            object: {},
            dispose() {
                disposed.push(0);
            },
        }, 6);
        col.add(URI.parse('test://boofar'), {
            object: {},
            dispose() {
                disposed.push(1);
            },
        }, 6);
        col.add(URI.parse('test://xxxxxxx'), {
            object: {},
            dispose() {
                disposed.push(2);
            },
        }, 70);
        assert.deepStrictEqual(disposed, [0, 1]);
    });
    test('max count', function () {
        col.dispose();
        col = new BoundModelReferenceCollection(extUri, 10000, 10000, 2);
        const disposed = [];
        col.add(URI.parse('test://xxxxxxx'), {
            object: {},
            dispose() {
                disposed.push(0);
            },
        });
        col.add(URI.parse('test://xxxxxxx'), {
            object: {},
            dispose() {
                disposed.push(1);
            },
        });
        col.add(URI.parse('test://xxxxxxx'), {
            object: {},
            dispose() {
                disposed.push(2);
            },
        });
        assert.deepStrictEqual(disposed, [0]);
    });
    test('dispose uri', function () {
        let disposed = [];
        col.add(URI.parse('test:///farboo'), {
            object: {},
            dispose() {
                disposed.push(0);
            },
        });
        col.add(URI.parse('test:///boofar'), {
            object: {},
            dispose() {
                disposed.push(1);
            },
        });
        col.add(URI.parse('test:///boo/far1'), {
            object: {},
            dispose() {
                disposed.push(2);
            },
        });
        col.add(URI.parse('test:///boo/far2'), {
            object: {},
            dispose() {
                disposed.push(3);
            },
        });
        col.add(URI.parse('test:///boo1/far'), {
            object: {},
            dispose() {
                disposed.push(4);
            },
        });
        col.remove(URI.parse('test:///unknown'));
        assert.strictEqual(disposed.length, 0);
        col.remove(URI.parse('test:///farboo'));
        assert.deepStrictEqual(disposed, [0]);
        disposed = [];
        col.remove(URI.parse('test:///boo'));
        assert.deepStrictEqual(disposed, [2, 3]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkRG9jdW1lbnRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQywrQkFBK0IsRUFBRTtJQUN0QyxJQUFJLEdBQWtDLENBQUE7SUFFdEMsS0FBSyxDQUFDO1FBQ0wsR0FBRyxHQUFHLElBQUksNkJBQTZCLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN4RCxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQztRQUNSLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNkLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUs7UUFDcEIsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO1FBRXRCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUNuQyxNQUFNLEVBQUUsRUFBRTtZQUNWLE9BQU87Z0JBQ04sVUFBVSxH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