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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9wZXJmb3JtYW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLEtBQVcsWUFBWSxDQWdSNUI7QUFoUkQsV0FBaUIsWUFBWTtJQVE1QixNQUFNLGdCQUFnQixHQUEyQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFBO0lBQzVGLE1BQU0sY0FBYyxHQUEyQixFQUFFLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQTtJQUN0RSxNQUFNLGVBQWUsR0FBMkIsRUFBRSxHQUFHLGdCQUFnQixFQUFFLENBQUE7SUFDdkUsTUFBTSxxQkFBcUIsR0FBMkIsRUFBRSxHQUFHLGdCQUFnQixFQUFFLENBQUE7SUFDN0UsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUE7SUFFekIsdUZBQXVGO0lBQ3ZGLHNFQUFzRTtJQUN0RSxJQUFXLFVBSVY7SUFKRCxXQUFXLFVBQVU7UUFDcEIsK0NBQVUsQ0FBQTtRQUNWLHVEQUFjLENBQUE7UUFDZCxtREFBWSxDQUFBO0lBQ2IsQ0FBQyxFQUpVLFVBQVUsS0FBVixVQUFVLFFBSXBCO0lBQ0QsTUFBTSxLQUFLLEdBQUc7UUFDYixPQUFPLDJCQUFtQjtRQUMxQixLQUFLLDJCQUFtQjtRQUN4QixNQUFNLDJCQUFtQjtLQUN6QixDQUFBO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixTQUFTO1FBQ3hCLGtFQUFrRTtRQUNsRSxnQkFBZ0IsRUFBRSxDQUFBO1FBQ2xCLFdBQVcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUN0QyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2pDLEtBQUssQ0FBQyxPQUFPLGdDQUF3QixDQUFBO1FBQ3JDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBUGUsc0JBQVMsWUFPeEIsQ0FBQTtJQUVEOztPQUVHO0lBQ0gsU0FBUyxjQUFjO1FBQ3RCLElBQUksS0FBSyxDQUFDLE9BQU8sa0NBQTBCLEVBQUUsQ0FBQztZQUM3QyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQy9CLEtBQUssQ0FBQyxPQUFPLDhCQUFzQixDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixhQUFhO1FBQzVCLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDL0IsS0FBSyxDQUFDLEtBQUssZ0NBQXdCLENBQUE7UUFDbkMsbUVBQW1FO1FBQ25FLDRCQUE0QixFQUFFLENBQUE7SUFDL0IsQ0FBQztJQUxlLDBCQUFhLGdCQUs1QixDQUFBO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixPQUFPO1FBQ3RCLElBQUksS0FBSyxDQUFDLEtBQUssOEJBQXNCLEVBQUUsQ0FBQztZQUN2QyxrREFBa0Q7WUFDbEQsYUFBYSxFQUFFLENBQUE7UUFDaEIsQ0FBQztRQUNELGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBTmUsb0JBQU8sVUFNdEIsQ0FBQTtJQUVELFNBQVMsWUFBWTtRQUNwQixJQUFJLEtBQUssQ0FBQyxLQUFLLGtDQUEwQixFQUFFLENBQUM7WUFDM0MsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUM3QixLQUFLLENBQUMsS0FBSyw4QkFBc0IsQ0FBQTtRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsT0FBTztRQUN0QixrRUFBa0U7UUFDbEUsZ0JBQWdCLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBSGUsb0JBQU8sVUFHdEIsQ0FBQTtJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsaUJBQWlCO1FBQ2hDLGtFQUFrRTtRQUNsRSxnQkFBZ0IsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFIZSw4QkFBaUIsb0JBR2hDLENBQUE7SUFFRDs7T0FFRztJQUNILFNBQWdCLGFBQWE7UUFDNUIsMEZBQTBGO1FBQzFGLElBQ0MsS0FBSyxDQUFDLE9BQU8sZ0NBQXdCO1lBQ3JDLEtBQUssQ0FBQyxLQUFLLGdDQUF3QjtZQUNuQyxLQUFLLENBQUMsTUFBTSw4QkFBc0IsRUFDakMsQ0FBQztZQUNGLHFEQUFxRDtZQUNyRCxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ2hDLEtBQUssQ0FBQyxNQUFNLGdDQUF3QixDQUFBO1lBQ3BDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUM3QixtRUFBbUU7WUFDbkUsNEJBQTRCLEVBQUUsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQWRlLDBCQUFhLGdCQWM1QixDQUFBO0lBRUQ7O09BRUc7SUFDSCxTQUFTLGFBQWE7UUFDckIsSUFBSSxLQUFLLENBQUMsTUFBTSxrQ0FBMEIsRUFBRSxDQUFDO1lBQzVDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDOUIsS0FBSyxDQUFDLE1BQU0sOEJBQXNCLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLDRCQUE0QjtRQUNwQyw4REFBOEQ7UUFDOUQsMERBQTBEO1FBQzFELGlCQUFpQjtRQUNqQixVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BdUJHO0lBQ0gsU0FBUyxnQkFBZ0I7UUFDeEIsSUFDQyxLQUFLLENBQUMsT0FBTyxnQ0FBd0I7WUFDckMsS0FBSyxDQUFDLEtBQUssZ0NBQXdCO1lBQ25DLEtBQUssQ0FBQyxNQUFNLGdDQUF3QixFQUNuQyxDQUFDO1lBQ0YsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBRXBDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUM5RCxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDeEQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQzNELFdBQVcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixDQUFDLENBQUE7WUFFN0UsVUFBVSxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3ZDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFDbkMsVUFBVSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUNyQyxVQUFVLENBQUMsY0FBYyxFQUFFLHFCQUFxQixDQUFDLENBQUE7WUFFakQsZ0JBQWdCO1lBQ2hCLDhGQUE4RjtZQUM5RixtRkFBbUY7WUFDbkYsK0VBQStFO1lBQy9FLCtFQUErRTtZQUMvRSxPQUFPO1lBQ1AsS0FBSztZQUVMLGlCQUFpQixFQUFFLENBQUE7WUFFbkIsS0FBSyxFQUFFLENBQUE7UUFDUixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsVUFBVSxDQUFDLFNBQWlCLEVBQUUscUJBQTZDO1FBQ25GLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUE7UUFDcEUscUJBQXFCLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQTtRQUN2QyxxQkFBcUIsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDekUscUJBQXFCLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsS0FBSztRQUNiLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDdkMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxXQUFXLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3JDLFdBQVcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDbkMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN0QyxXQUFXLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3BDLFdBQVcsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM1QyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFMUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwQyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2xDLFdBQVcsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUV6QyxLQUFLLENBQUMsT0FBTyw0QkFBb0IsQ0FBQTtRQUNqQyxLQUFLLENBQUMsS0FBSyw0QkFBb0IsQ0FBQTtRQUMvQixLQUFLLENBQUMsTUFBTSw0QkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0lBZ0JEOzs7T0FHRztJQUNILFNBQWdCLHVCQUF1QjtRQUN0QyxJQUFJLGlCQUFpQixLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxzQkFBc0I7UUFDdEIsTUFBTSxNQUFNLEdBQUc7WUFDZCxPQUFPLEVBQUUsNEJBQTRCLENBQUMsZ0JBQWdCLENBQUM7WUFDdkQsS0FBSyxFQUFFLDRCQUE0QixDQUFDLGNBQWMsQ0FBQztZQUNuRCxNQUFNLEVBQUUsNEJBQTRCLENBQUMsZUFBZSxDQUFDO1lBQ3JELEtBQUssRUFBRSw0QkFBNEIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMxRCxXQUFXLEVBQUUsaUJBQWlCO1NBQzlCLENBQUE7UUFFRCxvQ0FBb0M7UUFDcEMsMEJBQTBCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUM1QywwQkFBMEIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMxQywwQkFBMEIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMzQywwQkFBMEIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ2pELGlCQUFpQixHQUFHLENBQUMsQ0FBQTtRQUVyQixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUF0QmUsb0NBQXVCLDBCQXNCdEMsQ0FBQTtJQUVELFNBQVMsNEJBQTRCLENBQ3BDLFVBQWtDO1FBRWxDLE9BQU87WUFDTixPQUFPLEVBQUUsVUFBVSxDQUFDLEtBQUssR0FBRyxpQkFBaUI7WUFDN0MsR0FBRyxFQUFFLFVBQVUsQ0FBQyxHQUFHO1lBQ25CLEdBQUcsRUFBRSxVQUFVLENBQUMsR0FBRztTQUNuQixDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsMEJBQTBCLENBQUMsVUFBa0M7UUFDckUsVUFBVSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDcEIsVUFBVSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFBO1FBQ2pDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO0lBQ25CLENBQUM7QUFDRixDQUFDLEVBaFJnQixZQUFZLEtBQVosWUFBWSxRQWdSNUIifQ==