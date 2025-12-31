/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Lazy } from '../../common/lazy.js';
import { FileAccess } from '../../common/network.js';
import { URI } from '../../common/uri.js';
// setup on import so assertSnapshot has the current context without explicit passing
let context;
const sanitizeName = (name) => name.replace(/[^a-z0-9_-]/gi, '_');
const normalizeCrlf = (str) => str.replace(/\r\n/g, '\n');
/**
 * This is exported only for tests against the snapshotting itself! Use
 * {@link assertSnapshot} as a consumer!
 */
export class SnapshotContext {
    constructor(test) {
        this.test = test;
        this.nextIndex = 0;
        this.usedNames = new Set();
        if (!test) {
            throw new Error('assertSnapshot can only be used in a test');
        }
        if (!test.file) {
            throw new Error("currentTest.file is not set, please open an issue with the test you're trying to run");
        }
        const src = URI.joinPath(FileAccess.asFileUri(''), '../src');
        const parts = test.file.split(/[/\\]/g);
        this.namePrefix = sanitizeName(test.fullTitle()) + '.';
        this.snapshotsDir = URI.joinPath(src, ...[...parts.slice(0, -1), '__snapshots__']);
    }
    async assert(value, options) {
        const originalStack = new Error().stack; // save to make the stack nicer on failure
        const nameOrIndex = options?.name ? sanitizeName(options.name) : this.nextIndex++;
        const fileName = this.namePrefix + nameOrIndex + '.' + (options?.extension || 'snap');
        this.usedNames.add(fileName);
        const fpath = URI.joinPath(this.snapshotsDir, fileName).fsPath;
        const actual = formatValue(value);
        let expected;
        try {
            expected = await __readFileInTests(fpath);
        }
        catch {
            console.info(`Creating new snapshot in: ${fpath}`);
            await __mkdirPInTests(this.snapshotsDir.fsPath);
            await __writeFileInTests(fpath, actual);
            return;
        }
        if (normalizeCrlf(expected) !== normalizeCrlf(actual)) {
            await __writeFileInTests(fpath + '.actual', actual);
            const err = new Error(`Snapshot #${nameOrIndex} does not match expected output`);
            err.expected = expected;
            err.actual = actual;
            err.snapshotPath = fpath;
            err.stack = err.stack
                .split('\n')
                // remove all frames from the async stack and keep the original caller's frame
                .slice(0, 1)
                .concat(originalStack.split('\n').slice(3))
                .join('\n');
            throw err;
        }
    }
    async removeOldSnapshots() {
        const contents = await __readDirInTests(this.snapshotsDir.fsPath);
        const toDelete = contents.filter((f) => f.startsWith(this.namePrefix) && !this.usedNames.has(f));
        if (toDelete.length) {
            console.info(`Deleting ${toDelete.length} old snapshots for ${this.test?.fullTitle()}`);
        }
        await Promise.all(toDelete.map((f) => __unlinkInTests(URI.joinPath(this.snapshotsDir, f).fsPath)));
    }
}
const debugDescriptionSymbol = Symbol.for('debug.description');
function formatValue(value, level = 0, seen = []) {
    switch (typeof value) {
        case 'bigint':
        case 'boolean':
        case 'number':
        case 'symbol':
        case 'undefined':
            return String(value);
        case 'string':
            return level === 0 ? value : JSON.stringify(value);
        case 'function':
            return `[Function ${value.name}]`;
        case 'object': {
            if (value === null) {
                return 'null';
            }
            if (value instanceof RegExp) {
                return String(value);
            }
            if (seen.includes(value)) {
                return '[Circular]';
            }
            if (debugDescriptionSymbol in value &&
                typeof value[debugDescriptionSymbol] === 'function') {
                return value[debugDescriptionSymbol]();
            }
            const oi = '  '.repeat(level);
            const ci = '  '.repeat(level + 1);
            if (Array.isArray(value)) {
                const children = value.map((v) => formatValue(v, level + 1, [...seen, value]));
                const multiline = children.some((c) => c.includes('\n')) || children.join(', ').length > 80;
                return multiline
                    ? `[\n${ci}${children.join(`,\n${ci}`)}\n${oi}]`
                    : `[ ${children.join(', ')} ]`;
            }
            let entries;
            let prefix = '';
            if (value instanceof Map) {
                prefix = 'Map ';
                entries = [...value.entries()];
            }
            else if (value instanceof Set) {
                prefix = 'Set ';
                entries = [...value.entries()];
            }
            else {
                entries = Object.entries(value);
            }
            const lines = entries.map(([k, v]) => `${k}: ${formatValue(v, level + 1, [...seen, value])}`);
            return (prefix +
                (lines.length > 1
                    ? `{\n${ci}${lines.join(`,\n${ci}`)}\n${oi}}`
                    : `{ ${lines.join(',\n')} }`));
        }
        default:
            throw new Error(`Unknown type ${value}`);
    }
}
setup(function () {
    const currentTest = this.currentTest;
    context = new Lazy(() => new SnapshotContext(currentTest));
});
teardown(async function () {
    if (this.currentTest?.state === 'passed') {
        await context?.rawValue?.removeOldSnapshots();
    }
    context = undefined;
});
/**
 * Implements a snapshot testing utility. ⚠️ This is async! ⚠️
 *
 * The first time a snapshot test is run, it'll record the value it's called
 * with as the expected value. Subsequent runs will fail if the value differs,
 * but the snapshot can be regenerated by hand or using the Selfhost Test
 * Provider Extension which'll offer to update it.
 *
 * The snapshot will be associated with the currently running test and stored
 * in a `__snapshots__` directory next to the test file, which is expected to
 * be the first `.test.js` file in the callstack.
 */
export function assertSnapshot(value, options) {
    if (!context) {
        throw new Error('assertSnapshot can only be used in a test');
    }
    return context.value.assert(value, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3NuYXBzaG90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBUXpDLHFGQUFxRjtBQUNyRixJQUFJLE9BQTBDLENBQUE7QUFDOUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ3pFLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBVyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtBQVNqRTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZUFBZTtJQU0zQixZQUE2QixJQUE0QjtRQUE1QixTQUFJLEdBQUosSUFBSSxDQUF3QjtRQUxqRCxjQUFTLEdBQUcsQ0FBQyxDQUFBO1FBR0osY0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7UUFHckMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQ2Qsc0ZBQXNGLENBQ3RGLENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFD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