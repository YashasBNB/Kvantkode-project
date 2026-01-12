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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0SGVhcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9hc3NlcnRIZWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLElBQUksV0FBbUMsQ0FBQTtBQUV2QyxNQUFNLGlCQUFpQixHQUtqQixFQUFFLENBQUE7QUFFUixLQUFLLENBQUM7SUFDTCxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtBQUMvQixDQUFDLENBQUMsQ0FBQTtBQUVGLGFBQWEsQ0FBQyxLQUFLLElBQUksRUFBRTtJQUN4QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hCLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDcEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFBO1FBRWhDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNqRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLENBQUM7UUFFRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxJQUFJLENBQUM7Z0JBQ0osUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLE1BQU0sSUFBSSxLQUFLLENBQ2Qsd0JBQXdCLElBQUksZUFBZSxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsT0FBTywwQkFBMEIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNoSSxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBRUQsaUJBQWlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUM3QixDQUFDLENBQUMsQ0FBQTtBQU1GLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQTtBQUU5Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUJHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxVQUFVLENBQUMsSUFBNEI7SUFDNUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQsMkVBQTJFO0lBQzNFLGtDQUFrQztJQUNsQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUM3QyxXQUFXLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxJQUFJLE9BQU8sd0JBQXdCLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDckQsT0FBTSxDQUFDLDRCQUE0QjtJQUNwQyxDQUFDO0lBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLHdCQUF3QixDQUNwRCxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUN6QixDQUFBO0lBQ0QsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0FBQ3BGLENBQUMifQ==