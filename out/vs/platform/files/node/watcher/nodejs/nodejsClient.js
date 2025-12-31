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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzQ2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvbm9kZS93YXRjaGVyL25vZGVqcy9ub2RlanNDbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUVOLGlDQUFpQyxHQUVqQyxNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUVsRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsaUNBQWlDO0lBQ3pFLFlBQ0MsYUFBK0MsRUFDL0MsWUFBd0MsRUFDeEMsY0FBdUI7UUFFdkIsS0FBSyxDQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFbEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ1osQ0FBQztJQUVrQixhQUFhLENBQUMsV0FBNEI7UUFDNUQsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUNyQixJQUFJLGFBQWEsQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUMsQ0FDdEMsQ0FBQTtJQUNqQyxDQUFDO0NBQ0QifQ==