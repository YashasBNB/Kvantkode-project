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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLGVBQWUsRUFDZixpQkFBaUIsRUFFakIsb0JBQW9CLEdBQ3BCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFJekMsTUFBTSxVQUFVLFVBQVUsQ0FBWSxJQUFZO0lBQ2pELElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtBQUM5RCxDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVcsQ0FBQyxDQUFTLEVBQUUsV0FBbUIsRUFBRSxRQUE2QjtJQUN4RixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDNUIsS0FBSyxDQUFDLEdBQUcsV0FBVyxlQUFlLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ25ELENBQUM7QUFDRixD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