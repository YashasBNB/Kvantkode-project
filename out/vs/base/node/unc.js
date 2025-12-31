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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3VuYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLFVBQVUsbUJBQW1CO0lBQ2xDLE1BQU0sU0FBUyxHQUFHLHVCQUF1QixFQUFFLENBQUE7SUFDM0MsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNmLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRUQsT0FBTyxFQUFFLENBQUE7QUFDVixDQUFDO0FBRUQsU0FBUyx1QkFBdUI7SUFDL0IsK0VBQStFO0lBQy9FLHlFQUF5RTtJQUV6RSxPQUFRLE9BQWUsQ0FBQyxnQkFBZ0IsQ0FBQTtBQUN6QyxDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLFdBQThCO0lBQ25FLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUNsQyxPQUFNO0lBQ1AsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLHVCQUF1QixFQUFFLENBQUE7SUFDM0MsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNmLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDckMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQSxDQUFDLGlDQUFpQztRQUMzRSxDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssTUFBTSxJQUFJLElBQUksaUJBQWlCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDbkQscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBYTtJQUN2QyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO0lBRXpDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxFQUFFLENBQUM7WUFDekIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMxQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7QUFDbkMsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsWUFBdUM7SUFDakUsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxPQUFPLFNBQVMsQ0FBQSxDQUFDLHlCQUF5QjtJQUMzQyxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUc7UUFDaEIsY0FBYyxFQUFFLDRGQUE0RjtRQUM1RyxjQUFjO1FBQ2QsTUFBTSxFQUFFLG9CQUFvQjtLQUM1QixDQUFBO0lBRUQsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFBO0lBRXBCLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7UUFDaEMsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNwRCxJQUFJLGNBQWMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixTQUFRLENBQUMsNkNBQTZDO1FBQ3ZELENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakUsSUFBSSxjQUFjLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMzQixTQUFRLENBQUMsMEJBQTBCO1FBQ3BDLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDNUUsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixJQUFJLEdBQUcsYUFBYSxDQUFBO1lBQ3BCLE1BQUs7UUFDTixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELE1BQU0sVUFBVSw0QkFBNEI7SUFDM0MsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE9BQU07SUFDUCxDQUFDO0lBRUQsQ0FBQztJQUFDLE9BQWUsQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUE7QUFDNUMsQ0FBQztBQUVELE1BQU0sVUFBVSwrQkFBK0I7SUFDOUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQVEsT0FBZSxDQUFDLGlCQUFpQixLQUFLLEtBQUssQ0FBQTtBQUNwRCxDQUFDIn0=