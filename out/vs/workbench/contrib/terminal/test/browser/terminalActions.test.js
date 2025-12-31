/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { shrinkWorkspaceFolderCwdPairs, } from '../../browser/terminalActions.js';
function makeFakeFolder(name, uri) {
    return {
        name,
        uri,
        index: 0,
        toResource: () => uri,
    };
}
function makePair(folder, cwd, isAbsolute) {
    return {
        folder,
        cwd: !cwd ? folder.uri : cwd instanceof URI ? cwd : cwd.uri,
        isAbsolute: !!isAbsolute,
        isOverridden: !!cwd && cwd.toString() !== folder.uri.toString(),
    };
}
suite('terminalActions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const root = URI.file('/some-root');
    const a = makeFakeFolder('a', URI.joinPath(root, 'a'));
    const b = makeFakeFolder('b', URI.joinPath(root, 'b'));
    const c = makeFakeFolder('c', URI.joinPath(root, 'c'));
    const d = makeFakeFolder('d', URI.joinPath(root, 'd'));
    suite('shrinkWorkspaceFolderCwdPairs', () => {
        test('should return empty when given array is empty', () => {
            deepStrictEqual(shrinkWorkspaceFolderCwdPairs([]), []);
        });
        test('should return the only single pair when given argument is a single element array', () => {
            const pairs = [makePair(a)];
            deepStrictEqual(shrinkWorkspaceFolderCwdPairs(pairs), pairs);
        });
        test('should return all pairs when no repeated cwds', () => {
            const pairs = [makePair(a), makePair(b), makePair(c)];
            deepStrictEqual(shrinkWorkspaceFolderCwdPairs(pairs), pairs);
        });
        suite('should select the pair that has the same URI when repeated cwds exist', () => {
            test('all repeated', () => {
                const pairA = makePair(a);
                const pairB = makePair(b, a); // CWD points to A
                const pairC = makePair(c, a); // CWD points to A
                deepStrictEqual(shrinkWorkspaceFolderCwdPairs([pairA, pairB, pairC]), [pairA]);
            });
            test('two repeated + one different', () => {
                const pairA = makePair(a);
                const pairB = makePair(b, a); // CWD points to A
                const pairC = makePair(c);
                deepStrictEqual(shrinkWorkspaceFolderCwdPairs([pairA, pairB, pairC]), [pairA, pairC]);
            });
            test('two repeated + two repeated', () => {
                const pairA = makePair(a);
                const pairB = makePair(b, a); // CWD points to A
                const pairC = makePair(c);
                const pairD = makePair(d, c);
                deepStrictEqual(shrinkWorkspaceFolderCwdPairs([pairA, pairB, pairC, pairD]), [pairA, pairC]);
            });
            test('two repeated + two repeated (reverse order)', () => {
                const pairB = makePair(b, a); // CWD points to A
                const pairA = makePair(a);
                const pairD = makePair(d, c);
                const pairC = makePair(c);
                deepStrictEqual(shrinkWorkspaceFolderCwdPairs([pairA, pairB, pairC, pairD]), [pairA, pairC]);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY3Rpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUVOLDZCQUE2QixHQUM3QixNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLFNBQVMsY0FBYyxDQUFDLElBQVksRUFBRSxHQUFRO0lBQzdDLE9BQU87UUFDTixJQUFJO1FBQ0osR0FBRztRQUNILEtBQUssRUFBRSxDQUFDO1FBQ1IsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUc7S0FDckIsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FDaEIsTUFBd0IsRUFDeEIsR0FBNEIsRUFDNUIsVUFBb0I7SUFFcEIsT0FBTztRQUNOLE1BQU07UUFDTixHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUc7UUFDM0QsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVO1FBQ3hCLFlBQVksRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRTtLQUMvRCxDQUFBO0FBQ0YsQ0FBQztBQUVELEtB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