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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY3Rpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbEFjdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBRU4sNkJBQTZCLEdBQzdCLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsU0FBUyxjQUFjLENBQUMsSUFBWSxFQUFFLEdBQVE7SUFDN0MsT0FBTztRQUNOLElBQUk7UUFDSixHQUFHO1FBQ0gsS0FBSyxFQUFFLENBQUM7UUFDUixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRztLQUNyQixDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUNoQixNQUF3QixFQUN4QixHQUE0QixFQUM1QixVQUFvQjtJQUVwQixPQUFPO1FBQ04sTUFBTTtRQUNOLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRztRQUMzRCxVQUFVLEVBQUUsQ0FBQyxDQUFDLFVBQVU7UUFDeEIsWUFBWSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO0tBQy9E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