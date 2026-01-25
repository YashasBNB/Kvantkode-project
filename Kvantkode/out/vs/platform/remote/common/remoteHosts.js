/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
export function getRemoteAuthority(uri) {
    return uri.scheme === Schemas.vscodeRemote ? uri.authority : undefined;
}
export function getRemoteName(authority) {
    if (!authority) {
        return undefined;
    }
    const pos = authority.indexOf('+');
    if (pos < 0) {
        // e.g. localhost:8000
        return authority;
    }
    return authority.substr(0, pos);
}
export function parseAuthorityWithPort(authority) {
    const { host, port } = parseAuthority(authority);
    if (typeof port === 'undefined') {
        throw new Error(`Invalid remote authority: ${authority}. It must either be a remote of form <remoteName>+<arg> or a remote host of form <host>:<port>.`);
    }
    return { host, port };
}
export function parseAuthorityWithOptionalPort(authority, defaultPort) {
    let { host, port } = parseAuthority(authority);
    if (typeof port === 'undefined') {
        port = defaultPort;
    }
    return { host, port };
}
function parseAuthority(authority) {
    // check for ipv6 with port
    const m1 = authority.match(/^(\[[0-9a-z:]+\]):(\d+)$/);
    if (m1) {
        return { host: m1[1], port: parseInt(m1[2], 10) };
    }
    // check for ipv6 without port
    const m2 = authority.match(/^(\[[0-9a-z:]+\])$/);
    if (m2) {
        return { host: m2[1], port: undefined };
    }
    // anything with a trailing port
    const m3 = authority.match(/(.*):(\d+)$/);
    if (m3) {
        return { host: m3[1], port: parseInt(m3[2], 10) };
    }
    // doesn't contain a port
    return { host: authority, port: undefined };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSG9zdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9jb21tb24vcmVtb3RlSG9zdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3pELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFRO0lBQzFDLE9BQU8sR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7QUFDdkUsQ0FBQztBQUtELE1BQU0sVUFBVSxhQUFhLENBQUMsU0FBNkI7SUFDMUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2xDLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2Isc0JBQXNCO1FBQ3RCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQ2hDLENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsU0FBaUI7SUFDdkQsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDaEQsSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNqQyxNQUFNLElBQUksS0FBSyxDQUNkLDZCQUE2QixTQUFTLGlHQUFpRyxDQUN2SSxDQUFBO0lBQ0YsQ0FBQztJQUNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUE7QUFDdEIsQ0FBQztBQUVELE1BQU0sVUFBVSw4QkFBOEIsQ0FDN0MsU0FBaUIsRUFDakIsV0FBbUI7SUFFbkIsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDOUMsSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNqQyxJQUFJLEdBQUcsV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFBO0FBQ3RCLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxTQUFpQjtJQUN4QywyQkFBMkI7SUFDM0IsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0lBQ3RELElBQUksRUFBRSxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFBO0lBQ2xELENBQUM7SUFFRCw4QkFBOEI7SUFDOUIsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQ2hELElBQUksRUFBRSxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUE7SUFDeEMsQ0FBQztJQUVELGdDQUFnQztJQUNoQyxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3pDLElBQUksRUFBRSxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFBO0lBQ2xELENBQUM7SUFFRCx5QkFBeUI7SUFDekIsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFBO0FBQzVDLENBQUMifQ==