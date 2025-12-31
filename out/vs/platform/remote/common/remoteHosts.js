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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlSG9zdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvY29tbW9uL3JlbW90ZUhvc3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd6RCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsR0FBUTtJQUMxQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0FBQ3ZFLENBQUM7QUFLRCxNQUFNLFVBQVUsYUFBYSxDQUFDLFNBQTZCO0lBQzFELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNiLHNCQUFzQjtRQUN0QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUNoQyxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFNBQWlCO0lBQ3ZELE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2hELElBQUksT0FBTyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDakMsTUFBTSxJQUFJLEtBQUssQ0FDZCw2QkFBNkIsU0FBUyxpR0FBaUcsQ0FDdkksQ0FBQTtJQUNGLENBQUM7SUFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFBO0FBQ3RCLENBQUM7QUFFRCxNQUFNLFVBQVUsOEJBQThCLENBQzdDLFNBQWlCLEVBQ2pCLFdBQW1CO0lBRW5CLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzlDLElBQUksT0FBTyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDakMsSUFBSSxHQUFHLFdBQVcsQ0FBQTtJQUNuQixDQUFDO0lBQ0QsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQTtBQUN0QixDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsU0FBaUI7SUFDeEMsMkJBQTJCO0lBQzNCLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtJQUN0RCxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ1IsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsOEJBQThCO0lBQzlCLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUNoRCxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ1IsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFBO0lBQ3hDLENBQUM7SUFFRCxnQ0FBZ0M7SUFDaEMsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUN6QyxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ1IsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQTtJQUNsRCxDQUFDO0lBRUQseUJBQXlCO0lBQ3pCLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQTtBQUM1QyxDQUFDIn0=