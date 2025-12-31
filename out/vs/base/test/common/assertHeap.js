/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
let currentTest;
const snapshotsToAssert = [];
setup(function () {
    currentTest = this.currentTest;
});
suiteTeardown(async () => {
    await Promise.all(snapshotsToAssert.map(async (snap) => {
        const counts = await snap.counts;
        const asserts = Object.entries(snap.opts.classes);
        if (asserts.length !== counts.length) {
            throw new Error(`expected class counts to equal assertions length for ${snap.test}`);
        }
        for (const [i, [name, doAssert]] of asserts.entries()) {
            try {
                doAssert(counts[i]);
            }
            catch (e) {
                throw new Error(`Unexpected number of ${name} instances (${counts[i]}) after "${snap.test}":\n\n${e.message}\n\nSnapshot saved at: ${snap.file}`);
            }
        }
    }));
    snapshotsToAssert.length = 0;
});
const snapshotMinTime = 20_000;
/**
 * Takes a heap snapshot, and asserts the state of classes in memory. This
 * works in Node and the Electron sandbox, but is a no-op in the browser.
 * Snapshots are process asynchronously and will report failures at the end of
 * the suite.
 *
 * This method should be used sparingly (e.g. once at the end of a suite to
 * ensure nothing leaked before), as gathering a heap snapshot is fairly
 * slow, at least until V8 11.5.130 (https://v8.dev/blog/speeding-up-v8-heap-snapshots).
 *
 * Takes options containing a mapping of class names, and assertion functions
 * to run on the number of retained instances of that class. For example:
 *
 * ```ts
 * assertSnapshot({
 *	classes: {
 *		ShouldNeverLeak: count => assert.strictEqual(count, 0),
 *		SomeSingleton: count => assert(count <= 1),
 *	}
 *});
 * ```
 */
export async function assertHeap(opts) {
    if (!currentTest) {
        throw new Error('assertSnapshot can only be used when a test is running');
    }
    // snapshotting can take a moment, ensure the test timeout is decently long
    // so it doesn't immediately fail.
    if (currentTest.timeout() < snapshotMinTime) {
        currentTest.timeout(snapshotMinTime);
    }
    if (typeof __analyzeSnapshotInTests === 'undefined') {
        return; // running in browser, no-op
    }
    const { done, file } = await __analyzeSnapshotInTests(currentTest.fullTitle(), Object.keys(opts.classes));
    snapshotsToAssert.push({ counts: done, file, test: currentTest.fullTitle(), opts });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0SGVhcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vYXNzZXJ0SGVhcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxJQUFJLFdBQW1DLENBQUE7QUFFdkMsTUFBTSxpQkFBaUIsR0FLakIsRUFBRSxDQUFBO0FBRVIsS0FBSyxDQUFDO0lBQ0wsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7QUFDL0IsQ0FBQyxDQUFDLENBQUE7QUFFRixhQUFhLENBQUMsS0FBSyxJQUFJLEVBQUU7SUFDeEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNoQixpQkFBaUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUVoQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNyRixDQUFDO1FBRUQsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDdkQsSUFBSSxDQUFDO2dCQUNKLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwQixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixNQUFNLElBQUksS0FBSyxDQUNkLHdCQUF3QixJQUFJLGVBQWUsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLE9BQU8sMEJBQTBCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDaEksQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUVELGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7QUFDN0IsQ0FBQyxDQUFDLENBQUE7QUFNRixNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUE7QUFFOUI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFCRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsVUFBVSxDQUFDLElBQTRCO0lBQzVELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVELDJFQUEyRTtJQUMzRSxrQ0FBa0M7SUFDbEMsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUM7UUFDN0MsV0FBVyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBSSxPQUFPLHdCQUF3QixLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQ3JELE9BQU0sQ0FBQyw0QkFBNEI7SUFDcEMsQ0FBQztJQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSx3QkFBd0IsQ0FDcEQsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FDekIsQ0FBQTtJQUNELGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUNwRixDQUFDIn0=