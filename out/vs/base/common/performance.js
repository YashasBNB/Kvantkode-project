/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function _definePolyfillMarks(timeOrigin) {
    const _data = [];
    if (typeof timeOrigin === 'number') {
        _data.push('code/timeOrigin', timeOrigin);
    }
    function mark(name, markOptions) {
        _data.push(name, markOptions?.startTime ?? Date.now());
    }
    function getMarks() {
        const result = [];
        for (let i = 0; i < _data.length; i += 2) {
            result.push({
                name: _data[i],
                startTime: _data[i + 1],
            });
        }
        return result;
    }
    return { mark, getMarks };
}
function _define() {
    // Identify browser environment when following property is not present
    // https://nodejs.org/dist/latest-v16.x/docs/api/perf_hooks.html#performancenodetiming
    // @ts-ignore
    if (typeof performance === 'object' &&
        typeof performance.mark === 'function' &&
        !performance.nodeTiming) {
        // in a browser context, reuse performance-util
        if (typeof performance.timeOrigin !== 'number' && !performance.timing) {
            // safari & webworker: because there is no timeOrigin and no workaround
            // we use the `Date.now`-based polyfill.
            return _definePolyfillMarks();
        }
        else {
            // use "native" performance for mark and getMarks
            return {
                mark(name, markOptions) {
                    performance.mark(name, markOptions);
                },
                getMarks() {
                    let timeOrigin = performance.timeOrigin;
                    if (typeof timeOrigin !== 'number') {
                        // safari: there is no timerOrigin but in renderers there is the timing-property
                        // see https://bugs.webkit.org/show_bug.cgi?id=174862
                        timeOrigin =
                            performance.timing.navigationStart ||
                                performance.timing.redirectStart ||
                                performance.timing.fetchStart;
                    }
                    const result = [{ name: 'code/timeOrigin', startTime: Math.round(timeOrigin) }];
                    for (const entry of performance.getEntriesByType('mark')) {
                        result.push({
                            name: entry.name,
                            startTime: Math.round(timeOrigin + entry.startTime),
                        });
                    }
                    return result;
                },
            };
        }
    }
    else if (typeof process === 'object') {
        // node.js: use the normal polyfill but add the timeOrigin
        // from the node perf_hooks API as very first mark
        const timeOrigin = performance?.timeOrigin;
        return _definePolyfillMarks(timeOrigin);
    }
    else {
        // unknown environment
        console.trace('perf-util loaded in UNKNOWN environment');
        return _definePolyfillMarks();
    }
}
function _factory(sharedObj) {
    if (!sharedObj.MonacoPerformanceMarks) {
        sharedObj.MonacoPerformanceMarks = _define();
    }
    return sharedObj.MonacoPerformanceMarks;
}
const perf = _factory(globalThis);
export const mark = perf.mark;
/**
 * Returns all marks, sorted by `startTime`.
 */
export const getMarks = perf.getMarks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wZXJmb3JtYW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxTQUFTLG9CQUFvQixDQUFDLFVBQW1CO0lBQ2hELE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUE7SUFDcEMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNwQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxTQUFTLElBQUksQ0FBQyxJQUFZLEVBQUUsV0FBb0M7UUFDL0QsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBQ0QsU0FBUyxRQUFRO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDWCxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDZCxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdkIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUNELE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7QUFDMUIsQ0FBQztBQUlELFNBQVMsT0FBTztJQUNmLHNFQUFzRTtJQUN0RSxzRkFBc0Y7SUFDdEYsYUFBYTtJQUNiLElBQ0MsT0FBTyxXQUFX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