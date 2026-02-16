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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vc25hcHNob3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFRekMscUZBQXFGO0FBQ3JGLElBQUksT0FBMEMsQ0FBQTtBQUM5QyxNQUFNLFlBQVksR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDekUsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO0FBU2pFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxlQUFlO0lBTTNCLFlBQTZCLElBQTRCO1FBQTVCLFNBQUksR0FBSixJQUFJLENBQXdCO1FBTGpELGNBQVMsR0FBRyxDQUFDLENBQUE7UUFHSixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUdyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUE7UUFDN0QsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FDZCxzRkFBc0YsQ0FDdEYsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxD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