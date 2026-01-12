/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getErrorMessage } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { DiskFileSystemProviderClient } from '../../../../platform/files/common/diskFileSystemProviderClient.js';
export const REMOTE_FILE_SYSTEM_CHANNEL_NAME = 'remoteFilesystem';
export class RemoteFileSystemProviderClient extends DiskFileSystemProviderClient {
    static register(remoteAgentService, fileService, logService) {
        const connection = remoteAgentService.getConnection();
        if (!connection) {
            return Disposable.None;
        }
        const disposables = new DisposableStore();
        const environmentPromise = (async () => {
            try {
                const environment = await remoteAgentService.getRawEnvironment();
                if (environment) {
                    // Register remote fsp even before it is asked to activate
                    // because, some features (configuration) wait for its
                    // registration before making fs calls.
                    fileService.registerProvider(Schemas.vscodeRemote, disposables.add(new RemoteFileSystemProviderClient(environment, connection)));
                }
                else {
                    logService.error('Cannot register remote filesystem provider. Remote environment doesnot exist.');
                }
            }
            catch (error) {
                logService.error('Cannot register remote filesystem provider. Error while fetching remote environment.', getErrorMessage(error));
            }
        })();
        disposables.add(fileService.onWillActivateFileSystemProvider((e) => {
            if (e.scheme === Schemas.vscodeRemote) {
                e.join(environmentPromise);
            }
        }));
        return disposables;
    }
    constructor(remoteAgentEnvironment, connection) {
        super(connection.getChannel(REMOTE_FILE_SYSTEM_CHANNEL_NAME), {
            pathCaseSensitive: remoteAgentEnvironment.os === 3 /* OperatingSystem.Linux */,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRmlsZVN5c3RlbVByb3ZpZGVyQ2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2NvbW1vbi9yZW1vdGVGaWxlU3lzdGVtUHJvdmlkZXJDbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRzVELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBS2hILE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGtCQUFrQixDQUFBO0FBRWpFLE1BQU0sT0FBTyw4QkFBK0IsU0FBUSw0QkFBNEI7SUFDL0UsTUFBTSxDQUFDLFFBQVEsQ0FDZCxrQkFBdUMsRUFDdkMsV0FBeUIsRUFDekIsVUFBdUI7UUFFdkIsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDckQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtRQUN2QixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6QyxNQUFNLGtCQUFrQixHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDdEMsSUFBSSxDQUFDO2dCQUNKLE1BQU0sV0FBVyxHQUFHLE1BQU0sa0JBQWtCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDaEUsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsMERBQTBEO29CQUMxRCxzREFBc0Q7b0JBQ3RELHVDQUF1QztvQkFDdkMsV0FBVyxDQUFDLGdCQUFnQixDQUMzQixPQUFPLENBQUMsWUFBWSxFQUNwQixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksOEJBQThCLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQzVFLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFVBQVUsQ0FBQyxLQUFLLENBQ2YsK0VBQStFLENBQy9FLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixVQUFVLENBQUMsS0FBSyxDQUNmLHNGQUFzRixFQUN0RixlQUFlLENBQUMsS0FBSyxDQUFDLENBQ3RCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUVKLFdBQVcsQ0FBQyxHQUFHLENBQ2QsV0FBVyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbEQsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdkMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVELFlBQ0Msc0JBQStDLEVBQy9DLFVBQWtDO1FBRWxDLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLCtCQUErQixDQUFDLEVBQUU7WUFDN0QsaUJBQWlCLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxrQ0FBMEI7U0FDdEUsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEIn0=