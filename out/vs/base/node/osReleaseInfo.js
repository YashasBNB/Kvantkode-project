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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NSZWxlYXNlSW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9vc1JlbGVhc2VJbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLElBQUksV0FBVyxFQUFFLFFBQVEsSUFBSSxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsSUFBSSxTQUFTLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDdkQsT0FBTyxLQUFLLFFBQVEsTUFBTSx1QkFBdUIsQ0FBQTtBQVFqRCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUNyQyxXQUFpQztJQUVqQyxJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hELE9BQU07SUFDUCxDQUFDO0lBRUQscURBQXFEO0lBQ3JELHFDQUFxQztJQUNyQyxtRUFBbUU7SUFDbkUsSUFBSSxNQUF5QyxDQUFBO0lBQzdDLEtBQUssTUFBTSxRQUFRLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7UUFDdkYsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFELE1BQUs7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFBLENBQUM7SUFDakIsQ0FBQztJQUVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLFdBQVcsQ0FBQyxxRUFBcUUsQ0FBQyxDQUFBO1FBQ2xGLE9BQU07SUFDUCxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0osTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sV0FBVyxHQUFnQjtZQUNoQyxFQUFFLEVBQUUsU0FBUztTQUNiLENBQUE7UUFFRCxJQUFJLEtBQUssRUFBRSxNQUFNLElBQUksSUFBSSxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMvRixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN6QixTQUFRO1lBQ1QsQ0FBQztZQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDbkQsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDdkUsSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLEdBQUcsS0FBSyxZQUFZLEVBQUUsQ0FBQztvQkFDMUMsV0FBVyxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUE7Z0JBQ3ZCLENBQUM7cUJBQU0sSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQzlCLFdBQVcsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO2dCQUM1QixDQUFDO3FCQUFNLElBQUksR0FBRyxLQUFLLFlBQVksSUFBSSxHQUFHLEtBQUssaUJBQWlCLEVBQUUsQ0FBQztvQkFDOUQsV0FBVyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUE7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxPQUFNO0FBQ1AsQ0FBQyJ9