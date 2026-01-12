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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RlbGVtZXRyeS9jb21tb24vd29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBRU4sMEJBQTBCLEVBQzFCLHlCQUF5QixHQUN6QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRzlGLE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsY0FBK0IsRUFDL0IsT0FBZSxFQUNmLFFBQWdCLEVBQ2hCLE1BQTBCLEVBQzFCLE9BQTJCLEVBQzNCLFNBQWlCLEVBQ2pCLEtBQWEsRUFDYixXQUFtQixFQUNuQixtQkFBNEIsRUFDNUIsT0FBcUIsRUFDckIsZUFBd0I7SUFFeEIsTUFBTSxNQUFNLEdBQUcsdUJBQXVCLENBQ3JDLE9BQU8sRUFDUCxRQUFRLEVBQ1IsT0FBTyxDQUFDLElBQUksRUFDWixNQUFNLEVBQ04sT0FBTyxFQUNQLFNBQVMsRUFDVCxLQUFLLEVBQ0wsV0FBVyxFQUNYLG1CQUFtQixDQUNuQixDQUFBO0lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixvQ0FBNEIsQ0FBQTtJQUNsRyxNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLHlCQUF5QixvQ0FBNEIsQ0FBQTtJQUVoRyxzSEFBc0g7SUFDdEgsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQy9ELHlIQUF5SDtJQUN6SCxNQUFNLENBQUMseUJBQXlCLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDaEUsbUhBQW1IO0lBQ25ILE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLGdCQUFnQixDQUFBO0lBQ3BELGtIQUFrSDtJQUNsSCxNQUFNLENBQUMsd0JBQXdCLENBQUMsR0FBRyxlQUFlLElBQUksRUFBRSxDQUFBO0lBQ3hELCtHQUErRztJQUMvRyxNQUFNLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7SUFDNUQsd0hBQXdIO0lBQ3hILE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ3hFLHNHQUFzRztJQUN0RyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFbEQsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDIn0=