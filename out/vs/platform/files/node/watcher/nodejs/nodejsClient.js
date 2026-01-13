/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractNonRecursiveWatcherClient, } from '../../../common/watcher.js';
import { NodeJSWatcher } from './nodejsWatcher.js';
export class NodeJSWatcherClient extends AbstractNonRecursiveWatcherClient {
    constructor(onFileChanges, onLogMessage, verboseLogging) {
        super(onFileChanges, onLogMessage, verboseLogging);
        this.init();
    }
    createWatcher(disposables) {
        return disposables.add(new NodeJSWatcher(undefined /* no recursive watching support here */));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzQ2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvbm9kZWpzL25vZGVqc0NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBRU4saUNBQWlDLEdBRWpDLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRWxELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxpQ0FBaUM7SUFDekUsWUFDQyxhQUErQyxFQUMvQyxZQUF3QyxFQUN4QyxjQUF1QjtRQUV2QixLQUFLLENBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUVsRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDWixDQUFDO0lBRWtCLGFBQWEsQ0FBQyxXQUE0QjtRQUM1RCxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQ3JCLElBQUksYUFBYSxDQUFDLFNBQVMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUN0QyxDQUFBO0lBQ2pDLENBQUM7Q0FDRCJ9