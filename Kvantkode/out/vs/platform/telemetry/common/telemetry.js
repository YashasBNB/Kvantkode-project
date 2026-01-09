/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ITelemetryService = createDecorator('telemetryService');
export const ICustomEndpointTelemetryService = createDecorator('customEndpointTelemetryService');
// Keys
export const currentSessionDateStorageKey = 'telemetry.currentSessionDate';
export const firstSessionDateStorageKey = 'telemetry.firstSessionDate';
export const lastSessionDateStorageKey = 'telemetry.lastSessionDate';
export const machineIdKey = 'telemetry.machineId';
export const sqmIdKey = 'telemetry.sqmId';
export const devDeviceIdKey = 'telemetry.devDeviceId';
// Configuration Keys
export const TELEMETRY_SECTION_ID = 'telemetry';
export const TELEMETRY_SETTING_ID = 'telemetry.telemetryLevel';
export const TELEMETRY_CRASH_REPORTER_SETTING_ID = 'telemetry.enableCrashReporter';
export const TELEMETRY_OLD_SETTING_ID = 'telemetry.enableTelemetry';
export var TelemetryLevel;
(function (TelemetryLevel) {
    TelemetryLevel[TelemetryLevel["NONE"] = 0] = "NONE";
    TelemetryLevel[TelemetryLevel["CRASH"] = 1] = "CRASH";
    TelemetryLevel[TelemetryLevel["ERROR"] = 2] = "ERROR";
    TelemetryLevel[TelemetryLevel["USAGE"] = 3] = "USAGE";
})(TelemetryLevel || (TelemetryLevel = {}));
export var TelemetryConfiguration;
(function (TelemetryConfiguration) {
    TelemetryConfiguration["OFF"] = "off";
    TelemetryConfiguration["CRASH"] = "crash";
    TelemetryConfiguration["ERROR"] = "error";
    TelemetryConfiguration["ON"] = "all";
})(TelemetryConfiguration || (TelemetryConfiguration = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uL3RlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHN0UsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFBO0FBNkR2RixNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxlQUFlLENBQzdELGdDQUFnQyxDQUNoQyxDQUFBO0FBU0QsT0FBTztBQUNQLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLDhCQUE4QixDQUFBO0FBQzFFLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLDRCQUE0QixDQUFBO0FBQ3RFLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLDJCQUEyQixDQUFBO0FBQ3BFLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQTtBQUNqRCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUE7QUFDekMsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLHVCQUF1QixDQUFBO0FBRXJELHFCQUFxQjtBQUNyQixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxXQUFXLENBQUE7QUFDL0MsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsMEJBQTBCLENBQUE7QUFDOUQsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsK0JBQStCLENBQUE7QUFDbEYsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsMkJBQTJCLENBQUE7QUFFbkUsTUFBTSxDQUFOLElBQWtCLGNBS2pCO0FBTEQsV0FBa0IsY0FBYztJQUMvQixtREFBUSxDQUFBO0lBQ1IscURBQVMsQ0FBQTtJQUNULHFEQUFTLENBQUE7SUFDVCxxREFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUxpQixjQUFjLEtBQWQsY0FBYyxRQUsvQjtBQUVELE1BQU0sQ0FBTixJQUFrQixzQkFLakI7QUFMRCxXQUFrQixzQkFBc0I7SUFDdkMscUNBQVcsQ0FBQTtJQUNYLHlDQUFlLENBQUE7SUFDZix5Q0FBZSxDQUFBO0lBQ2Ysb0NBQVUsQ0FBQTtBQUNYLENBQUMsRUFMaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUt2QyJ9