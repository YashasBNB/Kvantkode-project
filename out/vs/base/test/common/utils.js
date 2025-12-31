/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, DisposableTracker, setDisposableTracker, } from '../../common/lifecycle.js';
import { join } from '../../common/path.js';
import { isWindows } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
export function toResource(path) {
    if (isWindows) {
        return URI.file(join('C:\\', btoa(this.test.fullTitle()), path));
    }
    return URI.file(join('/', btoa(this.test.fullTitle()), path));
}
export function suiteRepeat(n, description, callback) {
    for (let i = 0; i < n; i++) {
        suite(`${description} (iteration ${i})`, callback);
    }
}
export function testRepeat(n, description, callback) {
    for (let i = 0; i < n; i++) {
        test(`${description} (iteration ${i})`, callback);
    }
}
export async function assertThrowsAsync(block, message = 'Missing expected exception') {
    try {
        await block();
    }
    catch {
        return;
    }
    const err = message instanceof Error ? message : new Error(message);
    throw err;
}
/**
 * Use this function to ensure that all disposables are cleaned up at the end of each test in the current suite.
 *
 * Use `markAsSingleton` if disposable singletons are created lazily that are allowed to outlive the test.
 * Make sure that the singleton properly registers all child disposables so that they are excluded too.
 *
 * @returns A {@link DisposableStore} that can optionally be used to track disposables in the test.
 * This will be automatically disposed on test teardown.
 */
export function ensureNoDisposablesAreLeakedInTestSuite() {
    let tracker;
    let store;
    setup(() => {
        store = new DisposableStore();
        tracker = new DisposableTracker();
        setDisposableTracker(tracker);
    });
    teardown(function () {
        store.dispose();
        setDisposableTracker(null);
        if (this.currentTest?.state !== 'failed') {
            const result = tracker.computeLeakingDisposables();
            if (result) {
                console.error(result.details);
                throw new Error(`There are ${result.leaks.length} undisposed disposables!${result.details}`);
            }
        }
    });
    // Wrap store as the suite function is called before it's initialized
    const testContext = {
        add(o) {
            return store.add(o);
        },
    };
    return testContext;
}
export function throwIfDisposablesAreLeaked(body, logToConsole = true) {
    const tracker = new DisposableTracker();
    setDisposableTracker(tracker);
    body();
    setDisposableTracker(null);
    computeLeakingDisposables(tracker, logToConsole);
}
export async function throwIfDisposablesAreLeakedAsync(body) {
    const tracker = new DisposableTracker();
    setDisposableTracker(tracker);
    await body();
    setDisposableTracker(null);
    computeLeakingDisposables(tracker);
}
function computeLeakingDisposables(tracker, logToConsole = true) {
    const result = tracker.computeLeakingDisposables();
    if (result) {
        if (logToConsole) {
            console.error(result.details);
        }
        throw new Error(`There are ${result.leaks.length} undisposed disposables!${result.details}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixlQUFlLEVBQ2YsaUJBQWlCLEVBRWpCLG9CQUFvQixHQUNwQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBSXpDLE1BQU0sVUFBVSxVQUFVLENBQVksSUFBWTtJQUNqRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7QUFDOUQsQ0FBQztBQUVELE1BQU0sVUFBVSxXQUFXLENBQUMsQ0FBUyxFQUFFLFdBQW1CLEVBQUUsUUFBNkI7SUFDeEYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVCLEtBQUssQ0FBQyxHQUFHLFdBQVcsZUFBZSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0FBQ0YsQ0FBQztB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