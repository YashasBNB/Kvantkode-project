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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi90ZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRzdFLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBb0Isa0JBQWtCLENBQUMsQ0FBQTtBQTZEdkYsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsZUFBZSxDQUM3RCxnQ0FBZ0MsQ0FDaEMsQ0FBQTtBQVNELE9BQU87QUFDUCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyw4QkFBOEIsQ0FBQTtBQUMxRSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyw0QkFBNEIsQ0FBQTtBQUN0RSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRywyQkFBMkIsQ0FBQTtBQUNwRSxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcscUJBQXFCLENBQUE7QUFDakQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFBO0FBQ3pDLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyx1QkFBdUIsQ0FBQTtBQUVyRCxxQkFBcUI7QUFDckIsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxDQUFBO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLDBCQUEwQixDQUFBO0FBQzlELE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLCtCQUErQixDQUFBO0FBQ2xGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLDJCQUEyQixDQUFBO0FBRW5FLE1BQU0sQ0FBTixJQUFrQixjQUtqQjtBQUxELFdBQWtCLGNBQWM7SUFDL0IsbURBQVEsQ0FBQTtJQUNSLHFEQUFTLENBQUE7SUFDVCxxREFBUyxDQUFBO0lBQ1QscURBQVMsQ0FBQTtBQUNWLENBQUMsRUFMaUIsY0FBYyxLQUFkLGNBQWMsUUFLL0I7QUFFRCxNQUFNLENBQU4sSUFBa0Isc0JBS2pCO0FBTEQsV0FBa0Isc0JBQXNCO0lBQ3ZDLHFDQUFXLENBQUE7SUFDWCx5Q0FBZSxDQUFBO0lBQ2YseUNBQWUsQ0FBQTtJQUNmLG9DQUFVLENBQUE7QUFDWCxDQUFDLEVBTGlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFLdkMifQ==