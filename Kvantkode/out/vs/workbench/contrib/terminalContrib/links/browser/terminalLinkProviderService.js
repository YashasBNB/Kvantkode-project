/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
export class TerminalLinkProviderService {
    constructor() {
        this._linkProviders = new Set();
        this._onDidAddLinkProvider = new Emitter();
        this._onDidRemoveLinkProvider = new Emitter();
    }
    get linkProviders() {
        return this._linkProviders;
    }
    get onDidAddLinkProvider() {
        return this._onDidAddLinkProvider.event;
    }
    get onDidRemoveLinkProvider() {
        return this._onDidRemoveLinkProvider.event;
    }
    registerLinkProvider(linkProvider) {
        const disposables = [];
        this._linkProviders.add(linkProvider);
        this._onDidAddLinkProvider.fire(linkProvider);
        return {
            dispose: () => {
                for (const disposable of disposables) {
                    disposable.dispose();
                }
                this._linkProviders.delete(linkProvider);
                this._onDidRemoveLinkProvider.fire(linkProvider);
            },
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUHJvdmlkZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmtQcm92aWRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBR3BFLE1BQU0sT0FBTywyQkFBMkI7SUFBeEM7UUFHUyxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFBO1FBS2hELDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFBO1FBSXBFLDZCQUF3QixHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFBO0lBbUJ6RixDQUFDO0lBM0JBLElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUdELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtJQUN4QyxDQUFDO0lBRUQsSUFBSSx1QkFBdUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFBO0lBQzNDLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxZQUEyQztRQUMvRCxNQUFNLFdBQVcsR0FBa0IsRUFBRSxDQUFBO1FBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDN0MsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDdEMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNyQixDQUFDO2dCQUNELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUN4QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ2pELENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=