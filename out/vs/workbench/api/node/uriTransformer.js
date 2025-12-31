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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpVHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvdXJpVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLGNBQWMsR0FFZCxNQUFNLGdDQUFnQyxDQUFBO0FBRXZDOzs7Ozs7Ozs7R0FTRztBQUNILFNBQVMsdUJBQXVCLENBQUMsZUFBdUI7SUFDdkQsT0FBTztRQUNOLGlCQUFpQixFQUFFLENBQUMsR0FBYSxFQUFZLEVBQUU7WUFDOUMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLGVBQWUsRUFBRSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ3BGLENBQUM7WUFDRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDNUYsQ0FBQztZQUNELE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQztRQUNELGlCQUFpQixFQUFFLENBQUMsR0FBYSxFQUFZLEVBQUU7WUFDOUMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUMzQixPQUFPO29CQUNOLE1BQU0sRUFBRSxlQUFlO29CQUN2QixTQUFTLEVBQUUsZUFBZTtvQkFDMUIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO29CQUNkLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSztvQkFDaEIsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRO2lCQUN0QixDQUFBO1lBQ0YsQ0FBQztZQUNELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNwRixDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO1FBQ0QsdUJBQXVCLEVBQUUsQ0FBQyxNQUFjLEVBQVUsRUFBRTtZQUNuRCxJQUFJLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxlQUFlLENBQUE7WUFDdkIsQ0FBQztpQkFBTSxJQUFJLE1BQU0sS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsZUFBdUI7SUFDM0QsT0FBTyxJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO0FBQ3BFLENBQUMifQ==