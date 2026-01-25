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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9jb21tb24vdGVzdENvdmVyYWdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBZ0IsYUFBYSxFQUFFLE1BQU0sT0FBTyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRSxPQUFPLEVBQXFCLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBSTlFLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLElBQUksT0FBcUIsQ0FBQTtJQUN6QixJQUFJLGdCQUFtQyxDQUFBO0lBQ3ZDLElBQUksWUFBMEIsQ0FBQTtJQUU5QixNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXBELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLEdBQUcsYUFBYSxFQUFFLENBQUE7UUFDekIsZ0JBQWdCLEdBQUc7WUFDbEIsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7U0FDL0MsQ0FBQTtRQUNELFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDOUIsRUFBb0IsRUFDcEIsUUFBUSxFQUNSLEVBQUUsTUFBTSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQVMsRUFDbkQsZ0JB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