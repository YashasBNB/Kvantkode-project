/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { extractLocalHostUriMetaDataForPortMapping, } from '../../tunnel/common/tunnel.js';
/**
 * Manages port mappings for a single webview.
 */
export class WebviewPortMappingManager {
    constructor(_getExtensionLocation, _getMappings, tunnelService) {
        this._getExtensionLocation = _getExtensionLocation;
        this._getMappings = _getMappings;
        this.tunnelService = tunnelService;
        this._tunnels = new Map();
    }
    async getRedirect(resolveAuthority, url) {
        const uri = URI.parse(url);
        const requestLocalHostInfo = extractLocalHostUriMetaDataForPortMapping(uri);
        if (!requestLocalHostInfo) {
            return undefined;
        }
        for (const mapping of this._getMappings()) {
            if (mapping.webviewPort === requestLocalHostInfo.port) {
                const extensionLocation = this._getExtensionLocation();
                if (extensionLocation && extensionLocation.scheme === Schemas.vscodeRemote) {
                    const tunnel = resolveAuthority &&
                        (await this.getOrCreateTunnel(resolveAuthority, mapping.extensionHostPort));
                    if (tunnel) {
                        if (tunnel.tunnelLocalPort === mapping.webviewPort) {
                            return undefined;
                        }
                        return encodeURI(uri
                            .with({
                            authority: `127.0.0.1:${tunnel.tunnelLocalPort}`,
                        })
                            .toString(true));
                    }
                }
                if (mapping.webviewPort !== mapping.extensionHostPort) {
                    return encodeURI(uri
                        .with({
                        authority: `${requestLocalHostInfo.address}:${mapping.extensionHostPort}`,
                    })
                        .toString(true));
                }
            }
        }
        return undefined;
    }
    async dispose() {
        for (const tunnel of this._tunnels.values()) {
            await tunnel.dispose();
        }
        this._tunnels.clear();
    }
    async getOrCreateTunnel(remoteAuthority, remotePort) {
        const existing = this._tunnels.get(remotePort);
        if (existing) {
            return existing;
        }
        const tunnelOrError = await this.tunnelService.openTunnel({ getAddress: async () => remoteAuthority }, undefined, remotePort);
        let tunnel;
        if (typeof tunnelOrError === 'string') {
            tunnel = undefined;
        }
        if (tunnel) {
            this._tunnels.set(remotePort, tunnel);
        }
        return tunnel;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1BvcnRNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJ2aWV3L2NvbW1vbi93ZWJ2aWV3UG9ydE1hcHBpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBQ04seUNBQXlDLEdBR3pDLE1BQU0sK0JBQStCLENBQUE7QUFPdEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8seUJBQXlCO0lBR3JDLFlBQ2tCLHFCQUE0QyxFQUM1QyxZQUFrRCxFQUNsRCxhQUE2QjtRQUY3QiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLGlCQUFZLEdBQVosWUFBWSxDQUFzQztRQUNsRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFMOUIsYUFBUSxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFBO0lBTXhELENBQUM7SUFFRyxLQUFLLENBQUMsV0FBVyxDQUN2QixnQkFBNkMsRUFDN0MsR0FBVztRQUVYLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDMUIsTUFBTSxvQkFBb0IsR0FBRyx5Q0FBeUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMzQixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUMzQyxJQUFJLE9BQU8sQ0FBQyxXQUFXLEtBQUssb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3ZELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7Z0JBQ3RELElBQUksaUJBQWlCLElBQUksaUJBQWlCLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDNUUsTUFBTSxNQUFNLEdBQ1gsZ0JBQWdCO3dCQUNoQixDQUFDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7b0JBQzVFLElBQUksTUFBTSxFQUFFLENBQUM7d0JBQ1osSUFBSSxNQUFNLENBQUMsZUFBZSxLQUFLLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQzs0QkFDcEQsT0FBTyxTQUFTLENBQUE7d0JBQ2pCLENBQUM7d0JBQ0QsT0FBTyxTQUFTLENBQ2YsR0FBRzs2QkFDRCxJQUFJLENBQUM7NEJBQ0wsU0FBUyxFQUFFLGFBQWEsTUFBTSxDQUFDLGVBQWUsRUFBRTt5QkFDaEQsQ0FBQzs2QkFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQ2hCLENBQUE7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksT0FBTyxDQUFDLFdBQVcsS0FBSyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDdkQsT0FBTyxTQUFTLENBQ2YsR0FBRzt5QkFDRCxJQUFJLENBQUM7d0JBQ0wsU0FBUyxFQUFFLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtxQkFDekUsQ0FBQzt5QkFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQ2hCLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPO1FBQ1osS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDN0MsTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDdkIsQ0FBQztRQUNELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FDOUIsZUFBeUIsRUFDekIsVUFBa0I7UUFFbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDOUMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFBO1FBQ2hCLENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUN4RCxFQUFFLFVBQVUsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLGVBQWUsRUFBRSxFQUMzQyxTQUFTLEVBQ1QsVUFBVSxDQUNWLENBQUE7UUFDRCxJQUFJLE1BQWdDLENBQUE7UUFDcEMsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN2QyxNQUFNLEdBQUcsU0FBUyxDQUFBO1FBQ25CLENBQUM7UUFDRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7Q0FDRCJ9