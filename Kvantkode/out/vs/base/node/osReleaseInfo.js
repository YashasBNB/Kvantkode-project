/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { constants as FSConstants, promises as FSPromises } from 'fs';
import { createInterface as readLines } from 'readline';
import * as Platform from '../common/platform.js';
export async function getOSReleaseInfo(errorLogger) {
    if (Platform.isMacintosh || Platform.isWindows) {
        return;
    }
    // Extract release information on linux based systems
    // using the identifiers specified in
    // https://www.freedesktop.org/software/systemd/man/os-release.html
    let handle;
    for (const filePath of ['/etc/os-release', '/usr/lib/os-release', '/etc/lsb-release']) {
        try {
            handle = await FSPromises.open(filePath, FSConstants.R_OK);
            break;
        }
        catch (err) { }
    }
    if (!handle) {
        errorLogger('Unable to retrieve release information from known identifier paths.');
        return;
    }
    try {
        const osReleaseKeys = new Set(['ID', 'DISTRIB_ID', 'ID_LIKE', 'VERSION_ID', 'DISTRIB_RELEASE']);
        const releaseInfo = {
            id: 'unknown',
        };
        for await (const line of readLines({ input: handle.createReadStream(), crlfDelay: Infinity })) {
            if (!line.includes('=')) {
                continue;
            }
            const key = line.split('=')[0].toUpperCase().trim();
            if (osReleaseKeys.has(key)) {
                const value = line.split('=')[1].replace(/"/g, '').toLowerCase().trim();
                if (key === 'ID' || key === 'DISTRIB_ID') {
                    releaseInfo.id = value;
                }
                else if (key === 'ID_LIKE') {
                    releaseInfo.id_like = value;
                }
                else if (key === 'VERSION_ID' || key === 'DISTRIB_RELEASE') {
                    releaseInfo.version_id = value;
                }
            }
        }
        return releaseInfo;
    }
    catch (err) {
        errorLogger(err);
    }
    return;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NSZWxlYXNlSW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL29zUmVsZWFzZUluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsSUFBSSxXQUFXLEVBQUUsUUFBUSxJQUFJLFVBQVUsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxJQUFJLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUN2RCxPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFBO0FBUWpELE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQ3JDLFdBQWlDO0lBRWpDLElBQUksUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEQsT0FBTTtJQUNQLENBQUM7SUFFRCxxREFBcUQ7SUFDckQscUNBQXFDO0lBQ3JDLG1FQUFtRTtJQUNuRSxJQUFJLE1BQXlDLENBQUE7SUFDN0MsS0FBSyxNQUFNLFFBQVEsSUFBSSxDQUFDLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztRQUN2RixJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDMUQsTUFBSztRQUNOLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUEsQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsV0FBVyxDQUFDLHFFQUFxRSxDQUFDLENBQUE7UUFDbEYsT0FBTTtJQUNQLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFDL0YsTUFBTSxXQUFXLEdBQWdCO1lBQ2hDLEVBQUUsRUFBRSxTQUFTO1NBQ2IsQ0FBQTtRQUVELElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQy9GLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLFNBQVE7WUFDVCxDQUFDO1lBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUNuRCxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBO2dCQUN2RSxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLFlBQVksRUFBRSxDQUFDO29CQUMxQyxXQUFXLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQTtnQkFDdkIsQ0FBQztxQkFBTSxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDOUIsV0FBVyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7Z0JBQzVCLENBQUM7cUJBQU0sSUFBSSxHQUFHLEtBQUssWUFBWSxJQUFJLEdBQUcsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO29CQUM5RCxXQUFXLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQTtnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUVELE9BQU07QUFDUCxDQUFDIn0=