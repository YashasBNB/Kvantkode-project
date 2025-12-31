/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { errorHandler } from '../../../base/common/errors.js';
export function reportSample(data, telemetryService, logService, sendAsErrorTelemtry) {
    const { sample, perfBaseline, source } = data;
    // send telemetry event
    telemetryService.publicLog2(`unresponsive.sample`, {
        perfBaseline,
        selfTime: sample.selfTime,
        totalTime: sample.totalTime,
        percentage: sample.percentage,
        functionName: sample.location,
        callers: sample.caller.map((c) => c.location).join('<'),
        callersAnnotated: sample.caller.map((c) => `${c.percentage}|${c.location}`).join('<'),
        source,
    });
    // log a fake error with a clearer stack
    const fakeError = new PerformanceError(data);
    if (sendAsErrorTelemtry) {
        errorHandler.onUnexpectedError(fakeError);
    }
    else {
        logService.error(fakeError);
    }
}
class PerformanceError extends Error {
    constructor(data) {
        // Since the stacks are available via the sample
        // we can avoid collecting them when constructing the error.
        if (Error.hasOwnProperty('stackTraceLimit')) {
            const Err = Error; // For the monaco editor checks.
            const stackTraceLimit = Err.stackTraceLimit;
            Err.stackTraceLimit = 0;
            super(`PerfSampleError: by ${data.source} in ${data.sample.location}`);
            Err.stackTraceLimit = stackTraceLimit;
        }
        else {
            super(`PerfSampleError: by ${data.source} in ${data.sample.location}`);
        }
        this.name = 'PerfSampleError';
        this.selfTime = data.sample.selfTime;
        const trace = [data.sample.absLocation, ...data.sample.caller.map((c) => c.absLocation)];
        this.stack = `\n\t at ${trace.join('\n\t at ')}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nVGVsZW1ldHJ5U3BlYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2ZpbGluZy9jb21tb24vcHJvZmlsaW5nVGVsZW1ldHJ5U3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFnRTdELE1BQU0sVUFBVSxZQUFZLENBQzNCLElBQWdCLEVBQ2hCLGdCQUFtQyxFQUNuQyxVQUF1QixFQUN2QixtQkFBNEI7SUFFNUIsTUFBTSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFBO0lBRTdDLHVCQUF1QjtJQUN2QixnQkFBZ0IsQ0FBQyxVQUFVLENBQzFCLHFCQUFxQixFQUNyQjtRQUNDLFlBQVk7UUFDWixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7UUFDekIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO1FBQzNCLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTtRQUM3QixZQUFZLEVBQUUsTUFBTSxDQUFDLFFBQVE7UUFDN0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUN2RCxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDckYsTUFBTTtLQUNOLENBQ0QsQ0FBQTtJQUVELHdDQUF3QztJQUN4QyxNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzVDLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUN6QixZQUFZLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDMUMsQ0FBQztTQUFNLENBQUM7UUFDUCxVQUFVLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzVCLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxnQkFBaUIsU0FBUSxLQUFLO0lBR25DLFlBQVksSUFBZ0I7UUFDM0IsZ0RBQWdEO1FBQ2hELDREQUE0RDtRQUM1RCxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQzdDLE1BQU0sR0FBRyxHQUFHLEtBQTJDLENBQUEsQ0FBQyxnQ0FBZ0M7WUFDeEYsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQTtZQUMzQyxHQUFHLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtZQUN2QixLQUFLLENBQUMsdUJBQXVCLElBQUksQ0FBQyxNQUFNLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3RFLEdBQUcsQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxDQUFDLHVCQUF1QixJQUFJLENBQUMsTUFBTSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUN2RSxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQTtRQUM3QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFBO1FBRXBDLE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUE7SUFDakQsQ0FBQztDQUNEIn0=