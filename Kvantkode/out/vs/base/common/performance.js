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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3BlcmZvcm1hbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLFNBQVMsb0JBQW9CLENBQUMsVUFBbUI7SUFDaEQsTUFBTSxLQUFLLEdBQXVCLEVBQUUsQ0FBQTtJQUNwQyxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3BDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELFNBQVMsSUFBSSxDQUFDLElBQVksRUFBRSxXQUFvQztRQUMvRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsU0FBUyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFDRCxTQUFTLFFBQVE7UUFDaEIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNYLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN2QixDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBQ0QsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQTtBQUMxQixDQUFDO0FBSUQsU0FBUyxPQUFPO0lBQ2Ysc0VBQXNFO0lBQ3RFLHNGQUFzRjtJQUN0Rixh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