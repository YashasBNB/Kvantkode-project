/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { getRandomTestPath } from './testUtils.js';
import { Promises } from '../../node/pfs.js';
import { SnapshotContext, assertSnapshot } from '../common/snapshot.js';
import { URI } from '../../common/uri.js';
import * as path from 'path';
import { assertThrowsAsync, ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
// tests for snapshot are in Node so that we can use native FS operations to
// set up and validate things.
//
// Uses snapshots for testing snapshots. It's snapception!
suite('snapshot', () => {
    let testDir;
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'snapshot');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(function () {
        return Promises.rm(testDir);
    });
    const makeContext = (test) => {
        return new (class extends SnapshotContext {
            constructor() {
                super(test);
                this.snapshotsDir = URI.file(testDir);
            }
        })();
    };
    const snapshotFileTree = async () => {
        let str = '';
        const printDir = async (dir, indent) => {
            const children = await Promises.readdir(dir);
            for (const child of children) {
                const p = path.join(dir, child);
                if ((await fs.promises.stat(p)).isFile()) {
                    const content = await fs.promises.readFile(p, 'utf-8');
                    str += `${' '.repeat(indent)}${child}:\n`;
                    for (const line of content.split('\n')) {
                        str += `${' '.repeat(indent + 2)}${line}\n`;
                    }
                }
                else {
                    str += `${' '.repeat(indent)}${child}/\n`;
                    await printDir(p, indent + 2);
                }
            }
        };
        await printDir(testDir, 0);
        await assertSnapshot(str);
    };
    test('creates a snapshot', async () => {
        const ctx = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!',
        });
        await ctx.assert({ cool: true });
        await snapshotFileTree();
    });
    test('validates a snapshot', async () => {
        const ctx1 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!',
        });
        await ctx1.assert({ cool: true });
        const ctx2 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!',
        });
        // should pass:
        await ctx2.assert({ cool: true });
        const ctx3 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!',
        });
        // should fail:
        await assertThrowsAsync(() => ctx3.assert({ cool: false }));
    });
    test('cleans up old snapshots', async () => {
        const ctx1 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!',
        });
        await ctx1.assert({ cool: true });
        await ctx1.assert({ nifty: true });
        await ctx1.assert({ customName: 1 }, { name: 'thirdTest', extension: 'txt' });
        await ctx1.assert({ customName: 2 }, { name: 'fourthTest' });
        await snapshotFileTree();
        const ctx2 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!',
        });
        await ctx2.assert({ cool: true });
        await ctx2.assert({ customName: 1 }, { name: 'thirdTest' });
        await ctx2.removeOldSnapshots();
        await snapshotFileTree();
    });
    test('formats object nicely', async () => {
        const circular = {};
        circular.a = circular;
        await assertSnapshot([
            1,
            true,
            undefined,
            null,
            123n,
            Symbol('heyo'),
            'hello',
            { hello: 'world' },
            circular,
            new Map([
                ['hello', 1],
                ['goodbye', 2],
            ]),
            new Set([1, 2, 3]),
            function helloWorld() { },
            /hello/g,
            new Array(10).fill('long string'.repeat(10)),
            {
                [Symbol.for('debug.description')]() {
                    return `Range [1 -> 5]`;
                },
            },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3NuYXBzaG90LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDNUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFL0YsNEVBQTRFO0FBQzVFLDhCQUE4QjtBQUM5QixFQUFFO0FBQ0YsMERBQTBEO0FBRTFELEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBQ3RCLElBQUksT0FBZSxDQUFBO0lBRW5CLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDO1FBQ0wsT0FBTyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM3RCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZELENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDO1FBQ1IsT0FBTyxRQUFRLENBQUMsRUFBRSxD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