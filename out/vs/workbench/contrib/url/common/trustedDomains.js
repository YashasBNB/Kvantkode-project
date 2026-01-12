/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { testUrlMatchesGlob } from './urlGlob.js';
/**
 * Check whether a domain like https://www.microsoft.com matches
 * the list of trusted domains.
 *
 * - Schemes must match
 * - There's no subdomain matching. For example https://microsoft.com doesn't match https://www.microsoft.com
 * - Star matches all subdomains. For example https://*.microsoft.com matches https://www.microsoft.com and https://foo.bar.microsoft.com
 */
export function isURLDomainTrusted(url, trustedDomains) {
    url = URI.parse(normalizeURL(url));
    trustedDomains = trustedDomains.map(normalizeURL);
    if (isLocalhostAuthority(url.authority)) {
        return true;
    }
    for (let i = 0; i < trustedDomains.length; i++) {
        if (trustedDomains[i] === '*') {
            return true;
        }
        if (testUrlMatchesGlob(url, trustedDomains[i])) {
            return true;
        }
    }
    return false;
}
/**
 * Case-normalize some case-insensitive URLs, such as github.
 */
export function normalizeURL(url) {
    const caseInsensitiveAuthorities = ['github.com'];
    try {
        const parsed = typeof url === 'string' ? URI.parse(url, true) : url;
        if (caseInsensitiveAuthorities.includes(parsed.authority)) {
            return parsed.with({ path: parsed.path.toLowerCase() }).toString(true);
        }
        else {
            return parsed.toString(true);
        }
    }
    catch {
        return url.toString();
    }
}
const rLocalhost = /^localhost(:\d+)?$/i;
const r127 = /^127.0.0.1(:\d+)?$/;
export function isLocalhostAuthority(authority) {
    return rLocalhost.test(authority) || r127.test(authority);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC9jb21tb24vdHJ1c3RlZERvbWFpbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUVqRDs7Ozs7OztHQU9HO0FBRUgsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEdBQVEsRUFBRSxjQUF3QjtJQUNwRSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNsQyxjQUFjLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUVqRCxJQUFJLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ3pDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDaEQsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDL0IsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBQ0Q7O0dBRUc7QUFFSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEdBQWlCO0lBQzdDLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUNqRCxJQUFJLENBQUM7UUFDSixNQUFNLE1BQU0sR0FBRyxPQUFPLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7UUFDbkUsSUFBSSwwQkFBMEIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDM0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN2RSxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNSLE9BQU8sR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3RCLENBQUM7QUFDRixDQUFDO0FBQ0QsTUFBTSxVQUFVLEdBQUcscUJBQXFCLENBQUE7QUFDeEMsTUFBTSxJQUFJLEdBQUcsb0JBQW9CLENBQUE7QUFFakMsTUFBTSxVQUFVLG9CQUFvQixDQUFDLFNBQWlCO0lBQ3JELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzFELENBQUMifQ==