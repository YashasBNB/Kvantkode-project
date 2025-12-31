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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1BvcnRNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2Vidmlldy9jb21tb24vd2Vidmlld1BvcnRNYXBwaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQUNOLHlDQUF5QyxHQUd6QyxNQUFNLCtCQUErQixDQUFBO0FBT3RDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHlCQUF5QjtJQUdyQyxZQUNrQixxQkFBNEMsRUFDNUMsWUFBa0QsRUFDbEQsYUFBNkI7UUFGN0IsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM1QyxpQkFBWSxHQUFaLFlBQVksQ0FBc0M7UUFDbEQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBTDlCLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQTtJQU14RCxDQUFDO0lBRUcsS0FBSyxDQUFDLFdBQVcsQ0FDdkIsZ0JBQTZDLEVBQzdDLEdBQVc7UUFFWCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFCLE1BQU0sb0JBQW9CLEdBQUcseUNBQXlDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0UsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDM0IsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7WUFDM0MsSUFBSSxPQUFPLENBQUMsV0FBVyxLQUFLLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO2dCQUN0RCxJQUFJLGlCQUFpQixJQUFJLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQzVFLE1BQU0sTUFBTSxHQUNYLGdCQUFnQjt3QkFDaEIsQ0FBQyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO29CQUM1RSxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUNaLElBQUksTUFBTSxDQUFDLGVBQWUsS0FBSyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7NEJBQ3BELE9BQU8sU0FBUyxDQUFBO3dCQUNqQixDQUFDO3dCQUNELE9BQU8sU0FBUyxDQUNmLEdBQUc7NkJBQ0QsSUFBSSxDQUFDOzRCQUNMLFNBQVMsRUFBRSxhQUFhLE1BQU0sQ0FBQyxlQUFlLEVBQUU7eUJBQ2hELENBQUM7NkJBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUNoQixDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLE9BQU8sQ0FBQyxXQUFXLEtBQUssT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3ZELE9BQU8sU0FBUyxDQUNmLEdBQUc7eUJBQ0QsSUFBSSxDQUFDO3dCQUNMLFNBQVMsRUFBRSxHQUFHLG9CQUFvQixDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUU7cUJBQ3pFLENBQUM7eUJBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUNoQixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTztRQUNaLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3ZCLENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQzlCLGVBQXlCLEVBQ3pCLFVBQWtCO1FBRWxCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FDeEQsRUFBRSxVQUFVLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxlQUFlLEVBQUUsRUFDM0MsU0FBUyxFQUNULFVBQVUsQ0FDVixDQUFBO1FBQ0QsSUFBSSxNQUFnQyxDQUFBO1FBQ3BDLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdkMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUNuQixDQUFDO1FBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0QifQ==