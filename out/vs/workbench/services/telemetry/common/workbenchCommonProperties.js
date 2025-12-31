/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { resolveCommonProperties } from '../../../../platform/telemetry/common/commonProperties.js';
import { firstSessionDateStorageKey, lastSessionDateStorageKey, } from '../../../../platform/telemetry/common/telemetry.js';
import { cleanRemoteAuthority } from '../../../../platform/telemetry/common/telemetryUtils.js';
export function resolveWorkbenchCommonProperties(storageService, release, hostname, commit, version, machineId, sqmId, devDeviceId, isInternalTelemetry, process, remoteAuthority) {
    const result = resolveCommonProperties(release, hostname, process.arch, commit, version, machineId, sqmId, devDeviceId, isInternalTelemetry);
    const firstSessionDate = storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */);
    const lastSessionDate = storageService.get(lastSessionDateStorageKey, -1 /* StorageScope.APPLICATION */);
    // __GDPR__COMMON__ "common.version.shell" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.version.shell'] = process.versions?.['electron'];
    // __GDPR__COMMON__ "common.version.renderer" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.version.renderer'] = process.versions?.['chrome'];
    // __GDPR__COMMON__ "common.firstSessionDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.firstSessionDate'] = firstSessionDate;
    // __GDPR__COMMON__ "common.lastSessionDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.lastSessionDate'] = lastSessionDate || '';
    // __GDPR__COMMON__ "common.isNewSession" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.isNewSession'] = !lastSessionDate ? '1' : '0';
    // __GDPR__COMMON__ "common.remoteAuthority" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.remoteAuthority'] = cleanRemoteAuthority(remoteAuthority);
    // __GDPR__COMMON__ "common.cli" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.cli'] = !!process.env['VSCODE_CLI'];
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZWxlbWV0cnkvY29tbW9uL3dvcmtiZW5jaENvbW1vblByb3BlcnRpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUVOLDBCQUEwQixFQUMxQix5QkFBeUIsR0FDekIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUc5RixNQUFNLFVBQVUsZ0NBQWdDLENBQy9DLGNBQStCLEVBQy9CLE9BQWUsRUFDZixRQUFnQixFQUNoQixNQUEwQixFQUMxQixPQUEyQixFQUMzQixTQUFpQixFQUNqQixLQUFhLEVBQ2IsV0FBbUIsRUFDbkIsbUJBQTRCLEVBQzVCLE9BQXFCLEVBQ3JCLGVBQXdCO0lBRXhCLE1BQU0sTUFBTSxHQUFHLHVCQUF1QixDQUNyQyxPQUFPLEVBQ1AsUUFBUSxFQUNSLE9BQU8sQ0FBQyxJQUFJLEVBQ1osTUFBTSxFQUNOLE9BQU8sRUFDUCxTQUFTLEVBQ1QsS0FBSyxFQUNMLFdBQVcsRUFDWCxtQkFBbUIsQ0FDbkIsQ0FBQTtJQUNELE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsb0NBQTRCLENBQUE7SUFDbEcsTUFBTSxlQUFlLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsb0NBQTRCLENBQUE7SUFFaEcsc0hBQXNIO0lBQ3RILE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMvRCx5SEFBeUg7SUFDekgsTUFBTSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ2hFLG1IQUFtSDtJQUNuSCxNQUFNLENBQUMseUJBQXlCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQTtJQUNwRCxrSEFBa0g7SUFDbEgsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsZUFBZSxJQUFJLEVBQUUsQ0FBQTtJQUN4RCwrR0FBK0c7SUFDL0csTUFBTSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO0lBQzVELHdIQUF3SDtJQUN4SCxNQUFNLENBQUMsd0JBQXdCLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUN4RSxzR0FBc0c7SUFDdEcsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRWxELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyJ9