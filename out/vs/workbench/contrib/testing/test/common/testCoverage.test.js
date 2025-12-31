/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createSandbox } from 'sinon';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { onObservableChange } from '../../common/observableUtils.js';
import { TestCoverage } from '../../common/testCoverage.js';
suite('TestCoverage', () => {
    let sandbox;
    let coverageAccessor;
    let testCoverage;
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        sandbox = createSandbox();
        coverageAccessor = {
            getCoverageDetails: sandbox.stub().resolves([]),
        };
        testCoverage = new TestCoverage({}, 'taskId', { extUri: { ignorePathCasing: () => true } }, coverageAccessor);
    });
    teardown(() => {
        sandbox.restore();
    });
    function addTests() {
        const raw1 = {
            id: '1',
            uri: URI.file('/path/to/file'),
            statement: { covered: 10, total: 20 },
            branch: { covered: 5, total: 10 },
            declaration: { covered: 2, total: 5 },
        };
        testCoverage.append(raw1, undefined);
        const raw2 = {
            id: '1',
            uri: URI.file('/path/to/file2'),
            statement: { covered: 5, total: 10 },
            branch: { covered: 1, total: 5 },
        };
        testCoverage.append(raw2, undefined);
        return { raw1, raw2 };
    }
    test('should look up file coverage', async () => {
        const { raw1 } = addTests();
        const fileCoverage = testCoverage.getUri(raw1.uri);
        assert.equal(fileCoverage?.id, raw1.id);
        assert.deepEqual(fileCoverage?.statement, raw1.statement);
        assert.deepEqual(fileCoverage?.branch, raw1.branch);
        assert.deepEqual(fileCoverage?.declaration, raw1.declaration);
        assert.strictEqual(testCoverage.getComputedForUri(raw1.uri), testCoverage.getUri(raw1.uri));
        assert.strictEqual(testCoverage.getComputedForUri(URI.file('/path/to/x')), undefined);
        assert.strictEqual(testCoverage.getUri(URI.file('/path/to/x')), undefined);
    });
    test('should compute coverage for directories', async () => {
        const { raw1 } = addTests();
        const dirCoverage = testCoverage.getComputedForUri(URI.file('/path/to'));
        assert.deepEqual(dirCoverage?.statement, { covered: 15, total: 30 });
        assert.deepEqual(dirCoverage?.branch, { covered: 6, total: 15 });
        assert.deepEqual(dirCoverage?.declaration, raw1.declaration);
    });
    test('should incrementally diff updates to existing files', async () => {
        addTests();
        const raw3 = {
            id: '1',
            uri: URI.file('/path/to/file'),
            statement: { covered: 12, total: 24 },
            branch: { covered: 7, total: 10 },
            declaration: { covered: 2, total: 5 },
        };
        testCoverage.append(raw3, undefined);
        const fileCoverage = testCoverage.getUri(raw3.uri);
        assert.deepEqual(fileCoverage?.statement, raw3.statement);
        assert.deepEqual(fileCoverage?.branch, raw3.branch);
        assert.deepEqual(fileCoverage?.declaration, raw3.declaration);
        const dirCoverage = testCoverage.getComputedForUri(URI.file('/path/to'));
        assert.deepEqual(dirCoverage?.statement, { covered: 17, total: 34 });
        assert.deepEqual(dirCoverage?.branch, { covered: 8, total: 15 });
        assert.deepEqual(dirCoverage?.declaration, raw3.declaration);
    });
    test('should emit changes', async () => {
        const changes = [];
        ds.add(onObservableChange(testCoverage.didAddCoverage, (value) => changes.push(value.map((v) => v.value.uri.toString()))));
        addTests();
        assert.deepStrictEqual(changes, [
            [
                'file:///',
                'file:///',
                'file:///',
                'file:///path',
                'file:///path/to',
                'file:///path/to/file',
            ],
            [
                'file:///',
                'file:///',
                'file:///',
                'file:///path',
                'file:///path/to',
                'file:///path/to/file2',
            ],
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL3Rlc3QvY29tbW9uL3Rlc3RDb3ZlcmFnZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQWdCLGFBQWEsRUFBRSxNQUFNLE9BQU8sQ0FBQTtBQUNuRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEUsT0FBTyxFQUFxQixZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUk5RSxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQixJQUFJLE9BQXFCLENBQUE7SUFDekIsSUFBSSxnQkFBbUMsQ0FBQTtJQUN2QyxJQUFJLFlBQTBCLENBQUE7SUFFOUIsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVwRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLGFBQWEsRUFBRSxDQUFBO1FBQ3pCLGdCQUFnQixHQUFHO1lBQ2xCLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1NBQy9DLENBQUE7UUFDRCxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQzlCLEVBQW9CLEVBQ3BCLFFBQVEsRUFDUixFQUFFLE1BQU0sRUFBRSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFTLEVBQ25ELGdCQUFnQixD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