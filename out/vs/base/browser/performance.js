/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var inputLatency;
(function (inputLatency) {
    const totalKeydownTime = { total: 0, min: Number.MAX_VALUE, max: 0 };
    const totalInputTime = { ...totalKeydownTime };
    const totalRenderTime = { ...totalKeydownTime };
    const totalInputLatencyTime = { ...totalKeydownTime };
    let measurementsCount = 0;
    // The state of each event, this helps ensure the integrity of the measurement and that
    // something unexpected didn't happen that could skew the measurement.
    let EventPhase;
    (function (EventPhase) {
        EventPhase[EventPhase["Before"] = 0] = "Before";
        EventPhase[EventPhase["InProgress"] = 1] = "InProgress";
        EventPhase[EventPhase["Finished"] = 2] = "Finished";
    })(EventPhase || (EventPhase = {}));
    const state = {
        keydown: 0 /* EventPhase.Before */,
        input: 0 /* EventPhase.Before */,
        render: 0 /* EventPhase.Before */,
    };
    /**
     * Record the start of the keydown event.
     */
    function onKeyDown() {
        /** Direct Check C. See explanation in {@link recordIfFinished} */
        recordIfFinished();
        performance.mark('inputlatency/start');
        performance.mark('keydown/start');
        state.keydown = 1 /* EventPhase.InProgress */;
        queueMicrotask(markKeyDownEnd);
    }
    inputLatency.onKeyDown = onKeyDown;
    /**
     * Mark the end of the keydown event.
     */
    function markKeyDownEnd() {
        if (state.keydown === 1 /* EventPhase.InProgress */) {
            performance.mark('keydown/end');
            state.keydown = 2 /* EventPhase.Finished */;
        }
    }
    /**
     * Record the start of the beforeinput event.
     */
    function onBeforeInput() {
        performance.mark('input/start');
        state.input = 1 /* EventPhase.InProgress */;
        /** Schedule Task A. See explanation in {@link recordIfFinished} */
        scheduleRecordIfFinishedTask();
    }
    inputLatency.onBeforeInput = onBeforeInput;
    /**
     * Record the start of the input event.
     */
    function onInput() {
        if (state.input === 0 /* EventPhase.Before */) {
            // it looks like we didn't receive a `beforeinput`
            onBeforeInput();
        }
        queueMicrotask(markInputEnd);
    }
    inputLatency.onInput = onInput;
    function markInputEnd() {
        if (state.input === 1 /* EventPhase.InProgress */) {
            performance.mark('input/end');
            state.input = 2 /* EventPhase.Finished */;
        }
    }
    /**
     * Record the start of the keyup event.
     */
    function onKeyUp() {
        /** Direct Check D. See explanation in {@link recordIfFinished} */
        recordIfFinished();
    }
    inputLatency.onKeyUp = onKeyUp;
    /**
     * Record the start of the selectionchange event.
     */
    function onSelectionChange() {
        /** Direct Check E. See explanation in {@link recordIfFinished} */
        recordIfFinished();
    }
    inputLatency.onSelectionChange = onSelectionChange;
    /**
     * Record the start of the animation frame performing the rendering.
     */
    function onRenderStart() {
        // Render may be triggered during input, but we only measure the following animation frame
        if (state.keydown === 2 /* EventPhase.Finished */ &&
            state.input === 2 /* EventPhase.Finished */ &&
            state.render === 0 /* EventPhase.Before */) {
            // Only measure the first render after keyboard input
            performance.mark('render/start');
            state.render = 1 /* EventPhase.InProgress */;
            queueMicrotask(markRenderEnd);
            /** Schedule Task B. See explanation in {@link recordIfFinished} */
            scheduleRecordIfFinishedTask();
        }
    }
    inputLatency.onRenderStart = onRenderStart;
    /**
     * Mark the end of the animation frame performing the rendering.
     */
    function markRenderEnd() {
        if (state.render === 1 /* EventPhase.InProgress */) {
            performance.mark('render/end');
            state.render = 2 /* EventPhase.Finished */;
        }
    }
    function scheduleRecordIfFinishedTask() {
        // Here we can safely assume that the `setTimeout` will not be
        // artificially delayed by 4ms because we schedule it from
        // event handlers
        setTimeout(recordIfFinished);
    }
    /**
     * Record the input latency sample if input handling and rendering are finished.
     *
     * The challenge here is that we want to record the latency in such a way that it includes
     * also the layout and painting work the browser does during the animation frame task.
     *
     * Simply scheduling a new task (via `setTimeout`) from the animation frame task would
     * schedule the new task at the end of the task queue (after other code that uses `setTimeout`),
     * so we need to use multiple strategies to make sure our task runs before others:
     *
     * We schedule tasks (A and B):
     *    - we schedule a task A (via a `setTimeout` call) when the input starts in `markInputStart`.
     *      If the animation frame task is scheduled quickly by the browser, then task A has a very good
     *      chance of being the very first task after the animation frame and thus will record the input latency.
     *    - however, if the animation frame task is scheduled a bit later, then task A might execute
     *      before the animation frame task. We therefore schedule another task B from `markRenderStart`.
     *
     * We do direct checks in browser event handlers (C, D, E):
     *    - if the browser has multiple keydown events queued up, they will be scheduled before the `setTimeout` tasks,
     *      so we do a direct check in the keydown event handler (C).
     *    - depending on timing, sometimes the animation frame is scheduled even before the `keyup` event, so we
     *      do a direct check there too (E).
     *    - the browser oftentimes emits a `selectionchange` event after an `input`, so we do a direct check there (D).
     */
    function recordIfFinished() {
        if (state.keydown === 2 /* EventPhase.Finished */ &&
            state.input === 2 /* EventPhase.Finished */ &&
            state.render === 2 /* EventPhase.Finished */) {
            performance.mark('inputlatency/end');
            performance.measure('keydown', 'keydown/start', 'keydown/end');
            performance.measure('input', 'input/start', 'input/end');
            performance.measure('render', 'render/start', 'render/end');
            performance.measure('inputlatency', 'inputlatency/start', 'inputlatency/end');
            addMeasure('keydown', totalKeydownTime);
            addMeasure('input', totalInputTime);
            addMeasure('render', totalRenderTime);
            addMeasure('inputlatency', totalInputLatencyTime);
            // console.info(
            // 	`input latency=${performance.getEntriesByName('inputlatency')[0].duration.toFixed(1)} [` +
            // 	`keydown=${performance.getEntriesByName('keydown')[0].duration.toFixed(1)}, ` +
            // 	`input=${performance.getEntriesByName('input')[0].duration.toFixed(1)}, ` +
            // 	`render=${performance.getEntriesByName('render')[0].duration.toFixed(1)}` +
            // 	`]`
            // );
            measurementsCount++;
            reset();
        }
    }
    function addMeasure(entryName, cumulativeMeasurement) {
        const duration = performance.getEntriesByName(entryName)[0].duration;
        cumulativeMeasurement.total += duration;
        cumulativeMeasurement.min = Math.min(cumulativeMeasurement.min, duration);
        cumulativeMeasurement.max = Math.max(cumulativeMeasurement.max, duration);
    }
    /**
     * Clear the current sample.
     */
    function reset() {
        performance.clearMarks('keydown/start');
        performance.clearMarks('keydown/end');
        performance.clearMarks('input/start');
        performance.clearMarks('input/end');
        performance.clearMarks('render/start');
        performance.clearMarks('render/end');
        performance.clearMarks('inputlatency/start');
        performance.clearMarks('inputlatency/end');
        performance.clearMeasures('keydown');
        performance.clearMeasures('input');
        performance.clearMeasures('render');
        performance.clearMeasures('inputlatency');
        state.keydown = 0 /* EventPhase.Before */;
        state.input = 0 /* EventPhase.Before */;
        state.render = 0 /* EventPhase.Before */;
    }
    /**
     * Gets all input latency samples and clears the internal buffers to start recording a new set
     * of samples.
     */
    function getAndClearMeasurements() {
        if (measurementsCount === 0) {
            return undefined;
        }
        // Assemble the result
        const result = {
            keydown: cumulativeToFinalMeasurement(totalKeydownTime),
            input: cumulativeToFinalMeasurement(totalInputTime),
            render: cumulativeToFinalMeasurement(totalRenderTime),
            total: cumulativeToFinalMeasurement(totalInputLatencyTime),
            sampleCount: measurementsCount,
        };
        // Clear the cumulative measurements
        clearCumulativeMeasurement(totalKeydownTime);
        clearCumulativeMeasurement(totalInputTime);
        clearCumulativeMeasurement(totalRenderTime);
        clearCumulativeMeasurement(totalInputLatencyTime);
        measurementsCount = 0;
        return result;
    }
    inputLatency.getAndClearMeasurements = getAndClearMeasurements;
    function cumulativeToFinalMeasurement(cumulative) {
        return {
            average: cumulative.total / measurementsCount,
            max: cumulative.max,
            min: cumulative.min,
        };
    }
    function clearCumulativeMeasurement(cumulative) {
        cumulative.total = 0;
        cumulative.min = Number.MAX_VALUE;
        cumulative.max = 0;
    }
})(inputLatency || (inputLatency = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvcGVyZm9ybWFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxLQUFXLFlBQVksQ0FnUjVCO0FBaFJELFdBQWlCLFlBQVk7SUFRNUIsTUFBTSxnQkFBZ0IsR0FBMkIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQTtJQUM1RixNQUFNLGNBQWMsR0FBMkIsRUFBRSxHQUFHLGdCQUFnQixFQUFFLENBQUE7SUFDdEUsTUFBTSxlQUFlLEdBQTJCLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO0lBQ3ZFLE1BQU0scUJBQXFCLEdBQTJCLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFBO0lBQzdFLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO0lBRXpCLHVGQUF1RjtJQUN2RixzRUFBc0U7SUFDdEUsSUFBVyxVQUlWO0lBSkQsV0FBVyxVQUFVO1FBQ3BCLCtDQUFVLENBQUE7UUFDVix1REFBYyxDQUFBO1FBQ2QsbURBQVksQ0FBQTtJQUNiLENBQUMsRUFKVSxVQUFVLEtBQVYsVUFBVSxRQUlwQjtJQUNELE1BQU0sS0FBSyxHQUFHO1FBQ2IsT0FBTywyQkFBbUI7UUFDMUIsS0FBSywyQkFBbUI7UUFDeEIsTUFBTSwyQkFBbUI7S0FDekIsQ0FBQTtJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsU0FBUztRQUN4QixrRUFBa0U7UUFDbEUsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNsQixXQUFXLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDdEMsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNqQyxLQUFLLENBQUMs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