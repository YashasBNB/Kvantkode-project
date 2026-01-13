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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2NvbW1vbi9yZW1vdGVBZ2VudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBYTVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUE7QUFxRTdGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLElBQUksQ0FBQztJQUFBO1FBQzFDLG1CQUFjLEdBQUcsQ0FBQyxDQUFBO1FBQ2xCLGdCQUFXLEdBQUcsSUFBSSxDQUFBO1FBRWxCLFlBQU8sR0FBYSxFQUFFLENBQUE7UUFDdEIsb0JBQWUsR0FBRyxDQUFDLENBQUE7UUFFbkIsWUFBTyxHQUFhLEVBQUUsQ0FBQTtRQUN0QixvQkFBZSxHQUFHLEdBQUcsQ0FBQTtRQUVyQix3QkFBbUIsR0FBRyxDQUFDLENBQUE7UUFDdkIsNEJBQXVCLEdBQUcsR0FBRyxDQUFBO1FBQzdCLDRCQUF1QixHQUFHLElBQUksQ0FBQTtRQUV2QyxvQkFBZSxHQUFvRCxTQUFTLENBQUE7SUF5RTdFLENBQUM7SUF4RUEsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUNaLGtCQUF1QztRQUV2QyxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUE7UUFFN0IsOEJBQThCO1FBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJ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