/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { timeout } from '../../../../base/common/async.js';
export const IRemoteAgentService = createDecorator('remoteAgentService');
export const remoteConnectionLatencyMeasurer = new (class {
    constructor() {
        this.maxSampleCount = 5;
        this.sampleDelay = 2000;
        this.initial = [];
        this.maxInitialCount = 3;
        this.average = [];
        this.maxAverageCount = 100;
        this.highLatencyMultiple = 2;
        this.highLatencyMinThreshold = 500;
        this.highLatencyMaxThreshold = 1500;
        this.lastMeasurement = undefined;
    }
    get latency() {
        return this.lastMeasurement;
    }
    async measure(remoteAgentService) {
        let currentLatency = Infinity;
        // Measure up to samples count
        for (let i = 0; i < this.maxSampleCount; i++) {
            const rtt = await remoteAgentService.getRoundTripTime();
            if (rtt === undefined) {
                return undefined;
            }
            currentLatency = Math.min(currentLatency, rtt / 2 /* we want just one way, not round trip time */);
            await timeout(this.sampleDelay);
        }
        // Keep track of average latency
        this.average.push(currentLatency);
        if (this.average.length > this.maxAverageCount) {
            this.average.shift();
        }
        // Keep track of initial latency
        let initialLatency = undefined;
        if (this.initial.length < this.maxInitialCount) {
            this.initial.push(currentLatency);
        }
        else {
            initialLatency = this.initial.reduce((sum, value) => sum + value, 0) / this.initial.length;
        }
        // Remember as last measurement
        this.lastMeasurement = {
            initial: initialLatency,
            current: currentLatency,
            average: this.average.reduce((sum, value) => sum + value, 0) / this.average.length,
            high: (() => {
                // based on the initial, average and current latency, try to decide
                // if the connection has high latency
                // Some rules:
                // - we require the initial latency to be computed
                // - we only consider latency above highLatencyMinThreshold as potentially high
                // - we require the current latency to be above the average latency by a factor of highLatencyMultiple
                // - but not if the latency is actually above highLatencyMaxThreshold
                if (typeof initialLatency === 'undefined') {
                    return false;
                }
                if (currentLatency > this.highLatencyMaxThreshold) {
                    return true;
                }
                if (currentLatency > this.highLatencyMinThreshold &&
                    currentLatency > initialLatency * this.highLatencyMultiple) {
                    return true;
                }
                return false;
            })(),
        };
        return this.lastMeasurement;
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9jb21tb24vcmVtb3RlQWdlbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQWE1RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFBO0FBcUU3RixNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLENBQUM7SUFBQTtRQUMxQyxtQkFBYyxHQUFHLENBQUMsQ0FBQTtRQUNsQixnQkFBVyxHQUFHLElBQUksQ0FBQTtRQUVsQixZQUFPLEdBQWEsRUFBRSxDQUFBO1FBQ3RCLG9CQUFlLEdBQUcsQ0FBQyxDQUFBO1FBRW5CLFlBQU8sR0FBYSxFQUFFLENBQUE7UUFDdEIsb0JBQWUsR0FBRyxHQUFHLENBQUE7UUFFckIsd0JBQW1CLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLDRCQUF1QixHQUFHLEdBQUcsQ0FBQTtRQUM3Qiw0QkFBdUIsR0FBRyxJQUFJLENBQUE7UUFFdkMsb0JBQWUsR0FBb0QsU0FBUyxDQUFBO0lBeUU3RSxDQUFDO0lBeEVBLElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FDWixrQkFBdUM7UUFFdkMsSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFBO1FBRTdCLDhCQUE4QjtRQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVB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