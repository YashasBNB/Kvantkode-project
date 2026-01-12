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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nVGVsZW1ldHJ5U3BlYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvZmlsaW5nL2NvbW1vbi9wcm9maWxpbmdUZWxlbWV0cnlTcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQWdFN0QsTUFBTSxVQUFVLFlBQVksQ0FDM0IsSUFBZ0IsRUFDaEIsZ0JBQW1DLEVBQ25DLFVBQXVCLEVBQ3ZCLG1CQUE0QjtJQUU1QixNQUFNLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUE7SUFFN0MsdUJBQXVCO0lBQ3ZCLGdCQUFnQixDQUFDLFVBQVUsQ0FDMUIscUJBQXFCLEVBQ3JCO1FBQ0MsWUFBWTtRQUNaLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtRQUN6QixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7UUFDM0IsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO1FBQzdCLFlBQVksRUFBRSxNQUFNLENBQUMsUUFBUTtRQUM3QixPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3ZELGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyRixNQUFNO0tBQ04sQ0FDRCxDQUFBO0lBRUQsd0NBQXdDO0lBQ3hDLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDNUMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQ3pCLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMxQyxDQUFDO1NBQU0sQ0FBQztRQUNQLFVBQVUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDNUIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLGdCQUFpQixTQUFRLEtBQUs7SUFHbkMsWUFBWSxJQUFnQjtRQUMzQixnREFBZ0Q7UUFDaEQsNERBQTREO1FBQzVELElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDN0MsTUFBTSxHQUFHLEdBQUcsS0FBMkMsQ0FBQSxDQUFDLGdDQUFnQztZQUN4RixNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFBO1lBQzNDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZCLEtBQUssQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLE1BQU0sT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDdEUsR0FBRyxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7UUFDdEMsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLENBQUMsdUJBQXVCLElBQUksQ0FBQyxNQUFNLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFBO1FBQzdCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7UUFFcEMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDeEYsSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQTtJQUNqRCxDQUFDO0NBQ0QifQ==