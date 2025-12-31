/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
/**
 * Root from which resources in webviews are loaded.
 *
 * This is hardcoded because we never expect to actually hit it. Instead these requests
 * should always go to a service worker.
 */
export const webviewResourceBaseHost = 'vscode-cdn.net';
export const webviewRootResourceAuthority = `vscode-resource.${webviewResourceBaseHost}`;
export const webviewGenericCspSource = `'self' https://*.${webviewResourceBaseHost}`;
/**
 * Construct a uri that can load resources inside a webview
 *
 * We encode the resource component of the uri so that on the main thread
 * we know where to load the resource from (remote or truly local):
 *
 * ```txt
 * ${scheme}+${resource-authority}.vscode-resource.vscode-cdn.net/${path}
 * ```
 *
 * @param resource Uri of the resource to load.
 * @param remoteInfo Optional information about the remote that specifies where `resource` should be resolved from.
 */
export function asWebviewUri(resource, remoteInfo) {
    if (resource.scheme === Schemas.http || resource.scheme === Schemas.https) {
        return resource;
    }
    if (remoteInfo &&
        remoteInfo.authority &&
        remoteInfo.isRemote &&
        resource.scheme === Schemas.file) {
        resource = URI.from({
            scheme: Schemas.vscodeRemote,
            authority: remoteInfo.authority,
            path: resource.path,
        });
    }
    return URI.from({
        scheme: Schemas.https,
        authority: `${resource.scheme}+${encodeAuthority(resource.authority)}.${webviewRootResourceAuthority}`,
        path: resource.path,
        fragment: resource.fragment,
        query: resource.query,
    });
}
function encodeAuthority(authority) {
    return authority.replace(/./g, (char) => {
        const code = char.charCodeAt(0);
        if ((code >= 97 /* CharCode.a */ && code <= 122 /* CharCode.z */) ||
            (code >= 65 /* CharCode.A */ && code <= 90 /* CharCode.Z */) ||
            (code >= 48 /* CharCode.Digit0 */ && code <= 57 /* CharCode.Digit9 */)) {
            return char;
        }
        return '-' + code.toString(16).padStart(4, '0');
    });
}
export function decodeAuthority(authority) {
    return authority.replace(/-([0-9a-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvY29tbW9uL3dlYnZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU9wRDs7Ozs7R0FLRztBQUNILE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGdCQUFnQixDQUFBO0FBRXZELE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLG1CQUFtQix1QkFBdUIsRUFBRSxDQUFBO0FBRXhGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLG9CQUFvQix1QkFBdUIsRUFBRSxDQUFBO0FBRXBGOzs7Ozs7Ozs7Ozs7R0FZRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUMsUUFBYSxFQUFFLFVBQThCO0lBQ3pFLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNFLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxJQUNDLFVBQVU7UUFDVixVQUFVLENBQUMsU0FBUztRQUNwQixVQUFVLENBQUMsUUFBUTtRQUNuQixRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQy9CLENBQUM7UUFDRixRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNuQixNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDNUIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQy9CLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtTQUNuQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLE9BQU8sQ0FBQyxLQUFLO1FBQ3JCLFNBQVMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxNQUFNLElBQUksZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSw0QkFBNEIsRUFBRTtRQUN0RyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7UUFDbkIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRO1FBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztLQUNyQixDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsU0FBaUI7SUFDekMsT0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0IsSUFDQyxDQUFDLElBQUksdUJBQWMsSUFBSSxJQUFJLHdCQUFjLENBQUM7WUFDMUMsQ0FBQyxJQUFJLHVCQUFjLElBQUksSUFBSSx1QkFBYyxDQUFDO1lBQzFDLENBQUMsSUFBSSw0QkFBbUIsSUFBSSxJQUFJLDRCQUFtQixDQUFDLEVBQ25ELENBQUM7WUFDRixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDaEQsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxTQUFpQjtJQUNoRCxPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2xHLENBQUMifQ==