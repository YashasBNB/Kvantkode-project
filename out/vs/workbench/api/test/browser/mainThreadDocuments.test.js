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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZERvY3VtZW50cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsK0JBQStCLEVBQUU7SUFDdEMsSUFBSSxHQUFrQyxDQUFBO0lBRXRDLEtBQUssQ0FBQztRQUNMLEdBQUcsR0FBRyxJQUFJLDZCQUE2QixDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDeEQsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUM7UUFDUixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDZCxDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLO1FBQ3BCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQTtRQUV0QixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDbkMsTUFBTSxFQUFFLEVBQUU7WUFDVixPQUFPO2dCQUNOLFVBQVUsR0FBRyxJQUFJLENBQUE7WUFDbEIsQ0FB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