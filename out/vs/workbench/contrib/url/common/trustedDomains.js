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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvY29tbW9uL3RydXN0ZWREb21haW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFakQ7Ozs7Ozs7R0FPRztBQUVILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFRLEVBQUUsY0FBd0I7SUFDcEUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbEMsY0FBYyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFakQsSUFBSSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUN6QyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ2hELElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQUksa0JBQWtCLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUNEOztHQUVHO0FBRUgsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFpQjtJQUM3QyxNQUFNLDBCQUEwQixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDakQsSUFBSSxDQUFDO1FBQ0osTUFBTSxNQUFNLEdBQUcsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQ25FLElBQUksMEJBQTBCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzNELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0IsQ0FBQztJQUNGLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUixPQUFPLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0FBQ0YsQ0FBQztBQUNELE1BQU0sVUFBVSxHQUFHLHFCQUFxQixDQUFBO0FBQ3hDLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixDQUFBO0FBRWpDLE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxTQUFpQjtJQUNyRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUMxRCxDQUFDIn0=