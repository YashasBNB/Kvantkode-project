/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinuxSnap, platform, PlatformToString } from '../../../base/common/platform.js';
import { env, platform as nodePlatform } from '../../../base/common/process.js';
import { generateUuid } from '../../../base/common/uuid.js';
function getPlatformDetail(hostname) {
    if (platform === 2 /* Platform.Linux */ && /^penguin(\.|$)/i.test(hostname)) {
        return 'chromebook';
    }
    return undefined;
}
export function resolveCommonProperties(release, hostname, arch, commit, version, machineId, sqmId, devDeviceId, isInternalTelemetry, product) {
    const result = Object.create(null);
    // __GDPR__COMMON__ "common.machineId" : { "endPoint": "MacAddressHash", "classification": "EndUserPseudonymizedInformation", "purpose": "FeatureInsight" }
    result['common.machineId'] = machineId;
    // __GDPR__COMMON__ "common.sqmId" : { "endPoint": "SqmMachineId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
    result['common.sqmId'] = sqmId;
    // __GDPR__COMMON__ "common.devDeviceId" : { "endPoint": "SqmMachineId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
    result['common.devDeviceId'] = devDeviceId;
    // __GDPR__COMMON__ "sessionID" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['sessionID'] = generateUuid() + Date.now();
    // __GDPR__COMMON__ "commitHash" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['commitHash'] = commit;
    // __GDPR__COMMON__ "version" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['version'] = version;
    // __GDPR__COMMON__ "common.platformVersion" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.platformVersion'] = (release || '').replace(/^(\d+)(\.\d+)?(\.\d+)?(.*)/, '$1$2$3');
    // __GDPR__COMMON__ "common.platform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.platform'] = PlatformToString(platform);
    // __GDPR__COMMON__ "common.nodePlatform" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.nodePlatform'] = nodePlatform;
    // __GDPR__COMMON__ "common.nodeArch" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.nodeArch'] = arch;
    // __GDPR__COMMON__ "common.product" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.product'] = product || 'desktop';
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
    if (isLinuxSnap) {
        // __GDPR__COMMON__ "common.snap" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        result['common.snap'] = 'true';
    }
    const platformDetail = getPlatformDetail(hostname);
    if (platformDetail) {
        // __GDPR__COMMON__ "common.platformDetail" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        result['common.platformDetail'] = platformDetail;
    }
    return result;
}
export function verifyMicrosoftInternalDomain(domainList) {
    const userDnsDomain = env['USERDNSDOMAIN'];
    if (!userDnsDomain) {
        return false;
    }
    const domain = userDnsDomain.toLowerCase();
    return domainList.some((msftDomain) => domain === msftDomain);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi9jb21tb25Qcm9wZXJ0aWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFZLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxRQUFRLElBQUksWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRzNELFNBQVMsaUJBQWlCLENBQUMsUUFBZ0I7SUFDMUMsSUFBSSxRQUFRLDJCQUFtQixJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3JFLE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsTUFBTSxVQUFVLHVCQUF1QixDQUN0QyxPQUFlLEVBQ2YsUUFBZ0IsRUFDaEIsSUFBWSxFQUNaLE1BQTBCLEVBQzFCLE9BQTJCLEVBQzNCLFNBQTZCLEVBQzdCLEtBQXlCLEVBQ3pCLFdBQStCLEVBQy9CLG1CQUE0QixFQUM1QixPQUFnQjtJQUVoQixNQUFNLE1BQU0sR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUVyRCwySkFBMko7SUFDM0osTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsU0FBUyxDQUFBO0lBQ3RDLHNKQUFzSjtJQUN0SixNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsS0FBSyxDQUFBO0lBQzlCLDRKQUE0SjtJQUM1SixNQUFNLENBQUMsb0JBQW9C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