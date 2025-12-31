/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const nullScopedAccessibilityProgressSignalFactory = () => ({
    msLoopTime: -1,
    msDelayTime: -1,
    dispose: () => { },
});
let progressAccessibilitySignalSchedulerFactory = nullScopedAccessibilityProgressSignalFactory;
export function setProgressAcccessibilitySignalScheduler(progressAccessibilitySignalScheduler) {
    progressAccessibilitySignalSchedulerFactory = progressAccessibilitySignalScheduler;
}
export function getProgressAcccessibilitySignalScheduler(msDelayTime, msLoopTime) {
    return progressAccessibilitySignalSchedulerFactory(msDelayTime, msLoopTime);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3Byb2dyZXNzYmFyL3Byb2dyZXNzQWNjZXNzaWJpbGl0eVNpZ25hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLDRDQUE0QyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDM0QsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUNkLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDZixPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztDQUNqQixDQUFDLENBQUE7QUFDRixJQUFJLDJDQUEyQyxHQUdHLDRDQUE0QyxDQUFBO0FBRTlGLE1BQU0sVUFBVSx3Q0FBd0MsQ0FDdkQsb0NBRytDO0lBRS9DLDJDQUEyQyxHQUFHLG9DQUFvQyxDQUFBO0FBQ25GLENBQUM7QUFFRCxNQUFNLFVBQVUsd0NBQXdDLENBQ3ZELFdBQW1CLEVBQ25CLFVBQW1CO0lBRW5CLE9BQU8sMkNBQTJDLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0FBQzVFLENBQUMifQ==