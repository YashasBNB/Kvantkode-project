/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { protocol } from 'electron';
import { Disposable } from '../../../base/common/lifecycle.js';
import { COI, FileAccess, Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
export class WebviewProtocolProvider extends Disposable {
    static { this.validWebviewFilePaths = new Map([
        ['/index.html', 'index.html'],
        ['/fake.html', 'fake.html'],
        ['/service-worker.js', 'service-worker.js'],
    ]); }
    constructor() {
        super();
        // Register the protocol for loading webview html
        const webviewHandler = this.handleWebviewRequest.bind(this);
        protocol.registerFileProtocol(Schemas.vscodeWebview, webviewHandler);
    }
    handleWebviewRequest(request, callback) {
        try {
            const uri = URI.parse(request.url);
            const entry = WebviewProtocolProvider.validWebviewFilePaths.get(uri.path);
            if (typeof entry === 'string') {
                const relativeResourcePath = `vs/workbench/contrib/webview/browser/pre/${entry}`;
                const url = FileAccess.asFileUri(relativeResourcePath);
                return callback({
                    path: url.fsPath,
                    headers: {
                        ...COI.getHeadersFromQuery(request.url),
                        'Cross-Origin-Resource-Policy': 'cross-origin',
                    },
                });
            }
            else {
                return callback({
                    error: -10 /* ACCESS_DENIED - https://cs.chromium.org/chromium/src/net/base/net_error_list.h?l=32 */,
                });
            }
        }
        catch {
            // noop
        }
        return callback({
            error: -2 /* FAILED - https://cs.chromium.org/chromium/src/net/base/net_error_list.h?l=32 */,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1Byb3RvY29sUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJ2aWV3L2VsZWN0cm9uLW1haW4vd2Vidmlld1Byb3RvY29sUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFtQixHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTthQUN2QywwQkFBcUIsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUM5QyxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUM7UUFDN0IsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDO1FBQzNCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLENBQUM7S0FDM0MsQ0FBQyxDQUFBO0lBRUY7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUVQLGlEQUFpRDtRQUNqRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNELFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFTyxvQkFBb0IsQ0FDM0IsT0FBaUMsRUFDakMsUUFBZ0U7UUFFaEUsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbEMsTUFBTSxLQUFLLEdBQUcsdUJBQXVCLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN6RSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMvQixNQUFNLG9CQUFvQixHQUFvQiw0Q0FBNEMsS0FBSyxFQUFFLENBQUE7Z0JBQ2pHLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtnQkFDdEQsT0FBTyxRQUFRLENBQUM7b0JBQ2YsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNO29CQUNoQixPQUFPLEVBQUU7d0JBQ1IsR0FBRyxHQUFHLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQzt3QkFDdkMsOEJBQThCLEVBQUUsY0FBYztxQkFDOUM7aUJBQ0QsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sUUFBUSxDQUFDO29CQUNmLEtBQUssRUFDSixDQUFDLEVBQUUsQ0FBQyx5RkFBeUY7aUJBQzlGLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTztRQUNSLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQztZQUNmLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxrRkFBa0Y7U0FDNUYsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyJ9