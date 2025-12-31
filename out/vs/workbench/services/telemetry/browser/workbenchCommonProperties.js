/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as Platform from '../../../../base/common/platform.js';
import * as uuid from '../../../../base/common/uuid.js';
import { cleanRemoteAuthority } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { mixin } from '../../../../base/common/objects.js';
import { firstSessionDateStorageKey, lastSessionDateStorageKey, machineIdKey, } from '../../../../platform/telemetry/common/telemetry.js';
import { Gesture } from '../../../../base/browser/touch.js';
/**
 * General function to help reduce the individuality of user agents
 * @param userAgent userAgent from browser window
 * @returns A simplified user agent with less detail
 */
function cleanUserAgent(userAgent) {
    return userAgent.replace(/(\d+\.\d+)(\.\d+)+/g, '$1');
}
export function resolveWorkbenchCommonProperties(storageService, commit, version, isInternalTelemetry, remoteAuthority, productIdentifier, removeMachineId, resolveAdditionalProperties) {
    const result = Object.create(null);
    const firstSessionDate = storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */);
    const lastSessionDate = storageService.get(lastSessionDateStorageKey, -1 /* StorageScope.APPLICATION */);
    let machineId;
    if (!removeMachineId) {
        machineId = storageService.get(machineIdKey, -1 /* StorageScope.APPLICATION */);
        if (!machineId) {
            machineId = uuid.generateUuid();
            storageService.store(machineIdKey, machineId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
    }
    else {
        machineId = `Redacted-${productIdentifier ?? 'web'}`;
    }
    /**
     * Note: In the web, session date information is fetched from browser storage, so these dates are tied to a specific
     * browser and not the machine overall.
     */
    // __GDPR__COMMON__ "common.firstSessionDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.firstSessionDate'] = firstSessionDate;
    // __GDPR__COMMON__ "common.lastSessionDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.lastSessionDate'] = lastSessionDate || '';
    // __GDPR__COMMON__ "common.isNewSession" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.isNewSession'] = !lastSessionDate ? '1' : '0';
    // __GDPR__COMMON__ "common.remoteAuthority" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.remoteAuthority'] = cleanRemoteAuthority(remoteAuthority);
    // __GDPR__COMMON__ "common.machineId" : { "endPoint": "MacAddressHash", "classification": "EndUserPseudonymizedInformation", "purpose": "FeatureInsight" }
    result['common.machineId'] = machineId;
    // __GDPR__COMMON__ "sessionID" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['sessionID'] = uuid.generateUuid() + Date.now();
    // __GDPR__COMMON__ "commitHash" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['commitHash'] = commit;
    // __GDPR__COMMON__ "version" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['version'] = version;
    // __GDPR__COMMON__ "common.platform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.platform'] = Platform.PlatformToString(Platform.platform);
    // __GDPR__COMMON__ "common.product" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.product'] = productIdentifier ?? 'web';
    // __GDPR__COMMON__ "common.userAgent" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.userAgent'] = Platform.userAgent ? cleanUserAgent(Platform.userAgent) : undefined;
    // __GDPR__COMMON__ "common.isTouchDevice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.isTouchDevice'] = String(Gesture.isTouchDevice());
    if (isInternalTelemetry) {
        // __GDPR__COMMON__ "common.msftInternal" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        result['common.msftInternal'] = isInternalTelemetry;
    }
    // dynamic properties which value differs on each call
    let seq = 0;
    const startTime = Date.now();
    Object.defineProperties(result, {
        // __GDPR__COMMON__ "timestamp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        timestamp: {
            get: () => new Date(),
            enumerable: true,
        },
        // __GDPR__COMMON__ "common.timesincesessionstart" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        'common.timesincesessionstart': {
            get: () => Date.now() - startTime,
            enumerable: true,
        },
        // __GDPR__COMMON__ "common.sequence" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        'common.sequence': {
            get: () => seq++,
            enumerable: true,
        },
    });
    if (resolveAdditionalProperties) {
        mixin(result, resolveAdditionalProperties());
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZWxlbWV0cnkvYnJvd3Nlci93b3JrYmVuY2hDb21tb25Qcm9wZXJ0aWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUVOLDBCQUEwQixFQUMxQix5QkFBeUIsRUFDekIsWUFBWSxHQUNaLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTNEOzs7O0dBSUc7QUFDSCxTQUFTLGNBQWMsQ0FBQyxTQUFpQjtJQUN4QyxPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDdEQsQ0FBQztBQUVELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsY0FBK0IsRUFDL0IsTUFBMEIsRUFDMUIsT0FBMkIsRUFDM0IsbUJBQTRCLEVBQzVCLGVBQXdCLEVBQ3hCLGlCQUEwQixFQUMxQixlQUF5QixFQUN6QiwyQkFBMEQ7SUFFMUQsTUFBTSxNQUFNLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDckQsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixvQ0FBNEIsQ0FBQTtJQUNsRyxNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLHlC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