/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function getUNCHostAllowlist() {
    const allowlist = processUNCHostAllowlist();
    if (allowlist) {
        return Array.from(allowlist);
    }
    return [];
}
function processUNCHostAllowlist() {
    // The property `process.uncHostAllowlist` is not available in official node.js
    // releases, only in our own builds, so we have to probe for availability
    return process.uncHostAllowlist;
}
export function addUNCHostToAllowlist(allowedHost) {
    if (process.platform !== 'win32') {
        return;
    }
    const allowlist = processUNCHostAllowlist();
    if (allowlist) {
        if (typeof allowedHost === 'string') {
            allowlist.add(allowedHost.toLowerCase()); // UNC hosts are case-insensitive
        }
        else {
            for (const host of toSafeStringArray(allowedHost)) {
                addUNCHostToAllowlist(host);
            }
        }
    }
}
function toSafeStringArray(arg0) {
    const allowedUNCHosts = new Set();
    if (Array.isArray(arg0)) {
        for (const host of arg0) {
            if (typeof host === 'string') {
                allowedUNCHosts.add(host);
            }
        }
    }
    return Array.from(allowedUNCHosts);
}
export function getUNCHost(maybeUNCPath) {
    if (typeof maybeUNCPath !== 'string') {
        return undefined; // require a valid string
    }
    const uncRoots = [
        '\\\\.\\UNC\\', // DOS Device paths (https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats)
        '\\\\?\\UNC\\',
        '\\\\', // standard UNC path
    ];
    let host = undefined;
    for (const uncRoot of uncRoots) {
        const indexOfUNCRoot = maybeUNCPath.indexOf(uncRoot);
        if (indexOfUNCRoot !== 0) {
            continue; // not matching any of our expected UNC roots
        }
        const indexOfUNCPath = maybeUNCPath.indexOf('\\', uncRoot.length);
        if (indexOfUNCPath === -1) {
            continue; // no path component found
        }
        const hostCandidate = maybeUNCPath.substring(uncRoot.length, indexOfUNCPath);
        if (hostCandidate) {
            host = hostCandidate;
            break;
        }
    }
    return host;
}
export function disableUNCAccessRestrictions() {
    if (process.platform !== 'win32') {
        return;
    }
    ;
    process.restrictUNCAccess = false;
}
export function isUNCAccessRestrictionsDisabled() {
    if (process.platform !== 'win32') {
        return true;
    }
    return process.restrictUNCAccess === false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvdW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sVUFBVSxtQkFBbUI7SUFDbEMsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLEVBQUUsQ0FBQTtJQUMzQyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFRCxPQUFPLEVBQUUsQ0FBQTtBQUNWLENBQUM7QUFFRCxTQUFTLHVCQUF1QjtJQUMvQiwrRUFBK0U7SUFDL0UseUVBQXlFO0lBRXpFLE9BQVEsT0FBZSxDQUFDLGdCQUFnQixDQUFBO0FBQ3pDLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsV0FBOEI7SUFDbkUsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE9BQU07SUFDUCxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLEVBQUUsQ0FBQTtJQUMzQyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBLENBQUMsaUNBQWlDO1FBQzNFLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxNQUFNLElBQUksSUFBSSxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM1QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFhO0lBQ3ZDLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFFekMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDekIsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN6QixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM5QixlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUNuQyxDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxZQUF1QztJQUNqRSxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLE9BQU8sU0FBUyxDQUFBLENBQUMseUJBQXlCO0lBQzNDLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRztRQUNoQixjQUFjLEVBQUUsNEZBQTRGO1FBQzVHLGNBQWM7UUFDZCxNQUFNLEVBQUUsb0JBQW9CO0tBQzVCLENBQUE7SUFFRCxJQUFJLElBQUksR0FBRyxTQUFTLENBQUE7SUFFcEIsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNoQyxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELElBQUksY0FBYyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLFNBQVEsQ0FBQyw2Q0FBNkM7UUFDdkQsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqRSxJQUFJLGNBQWMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNCLFNBQVEsQ0FBQywwQkFBMEI7UUFDcEMsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUM1RSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLElBQUksR0FBRyxhQUFhLENBQUE7WUFDcEIsTUFBSztRQUNOLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QjtJQUMzQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDbEMsT0FBTTtJQUNQLENBQUM7SUFFRCxDQUFDO0lBQUMsT0FBZSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtBQUM1QyxDQUFDO0FBRUQsTUFBTSxVQUFVLCtCQUErQjtJQUM5QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDbEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsT0FBUSxPQUFlLENBQUMsaUJBQWlCLEtBQUssS0FBSyxDQUFBO0FBQ3BELENBQUMifQ==