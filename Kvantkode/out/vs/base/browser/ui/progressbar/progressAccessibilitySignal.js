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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvcHJvZ3Jlc3NiYXIvcHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sNENBQTRDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMzRCxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ2QsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUNmLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO0NBQ2pCLENBQUMsQ0FBQTtBQUNGLElBQUksMkNBQTJDLEdBR0csNENBQTRDLENBQUE7QUFFOUYsTUFBTSxVQUFVLHdDQUF3QyxDQUN2RCxvQ0FHK0M7SUFFL0MsMkNBQTJDLEdBQUcsb0NBQW9DLENBQUE7QUFDbkYsQ0FBQztBQUVELE1BQU0sVUFBVSx3Q0FBd0MsQ0FDdkQsV0FBbUIsRUFDbkIsVUFBbUI7SUFFbkIsT0FBTywyQ0FBMkMsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDNUUsQ0FBQyJ9