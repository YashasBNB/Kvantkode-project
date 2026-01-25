/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URITransformer, } from '../../../base/common/uriIpc.js';
/**
 * ```
 * --------------------------------
 * |    UI SIDE    |  AGENT SIDE  |
 * |---------------|--------------|
 * | vscode-remote | file         |
 * | file          | vscode-local |
 * --------------------------------
 * ```
 */
function createRawURITransformer(remoteAuthority) {
    return {
        transformIncoming: (uri) => {
            if (uri.scheme === 'vscode-remote') {
                return { scheme: 'file', path: uri.path, query: uri.query, fragment: uri.fragment };
            }
            if (uri.scheme === 'file') {
                return { scheme: 'vscode-local', path: uri.path, query: uri.query, fragment: uri.fragment };
            }
            return uri;
        },
        transformOutgoing: (uri) => {
            if (uri.scheme === 'file') {
                return {
                    scheme: 'vscode-remote',
                    authority: remoteAuthority,
                    path: uri.path,
                    query: uri.query,
                    fragment: uri.fragment,
                };
            }
            if (uri.scheme === 'vscode-local') {
                return { scheme: 'file', path: uri.path, query: uri.query, fragment: uri.fragment };
            }
            return uri;
        },
        transformOutgoingScheme: (scheme) => {
            if (scheme === 'file') {
                return 'vscode-remote';
            }
            else if (scheme === 'vscode-local') {
                return 'file';
            }
            return scheme;
        },
    };
}
export function createURITransformer(remoteAuthority) {
    return new URITransformer(createRawURITransformer(remoteAuthority));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpVHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS91cmlUcmFuc2Zvcm1lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBR04sY0FBYyxHQUVkLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkM7Ozs7Ozs7OztHQVNHO0FBQ0gsU0FBUyx1QkFBdUIsQ0FBQyxlQUF1QjtJQUN2RCxPQUFPO1FBQ04saUJBQWlCLEVBQUUsQ0FBQyxHQUFhLEVBQVksRUFBRTtZQUM5QyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssZUFBZSxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDcEYsQ0FBQztZQUNELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUM1RixDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO1FBQ0QsaUJBQWlCLEVBQUUsQ0FBQyxHQUFhLEVBQVksRUFBRTtZQUM5QyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzNCLE9BQU87b0JBQ04sTUFBTSxFQUFFLGVBQWU7b0JBQ3ZCLFNBQVMsRUFBRSxlQUFlO29CQUMxQixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7b0JBQ2QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLO29CQUNoQixRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVE7aUJBQ3RCLENBQUE7WUFDRixDQUFDO1lBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLGNBQWMsRUFBRSxDQUFDO2dCQUNuQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ3BGLENBQUM7WUFDRCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUM7UUFDRCx1QkFBdUIsRUFBRSxDQUFDLE1BQWMsRUFBVSxFQUFFO1lBQ25ELElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN2QixPQUFPLGVBQWUsQ0FBQTtZQUN2QixDQUFDO2lCQUFNLElBQUksTUFBTSxLQUFLLGNBQWMsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxlQUF1QjtJQUMzRCxPQUFPLElBQUksY0FBYyxDQUFDLHVCQUF1QixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7QUFDcEUsQ0FBQyJ9