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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRmlsZVN5c3RlbVByb3ZpZGVyQ2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9jb21tb24vcmVtb3RlRmlsZVN5c3RlbVByb3ZpZGVyQ2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUc1RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUtoSCxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxrQkFBa0IsQ0FBQTtBQUVqRSxNQUFNLE9BQU8sOEJBQStCLFNBQVEsNEJBQTRCO0lBQy9FLE1BQU0sQ0FBQyxRQUFRLENBQ2Qsa0JBQXVDLEVBQ3ZDLFdBQXlCLEVBQ3pCLFVBQXVCO1FBRXZCLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3JELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFekMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3RDLElBQUksQ0FBQztnQkFDSixNQUFNLFdBQVcsR0FBRyxNQUFNLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLENBQUE7Z0JBQ2hFLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2pCLDBEQUEwRDtvQkFDMUQsc0RBQXNEO29CQUN0RCx1Q0FBdUM7b0JBQ3ZDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FDM0IsT0FBTyxDQUFDLFlBQVksRUFDcEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUM1RSxDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLENBQUMsS0FBSyxDQUNmLCtFQUErRSxDQUMvRSxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsVUFBVSxDQUFDLEtBQUssQ0FDZixzRkFBc0YsRUFDdEYsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUN0QixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFFSixXQUFXLENBQUMsR0FBRyxDQUNkLFdBQVcsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2xELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3ZDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFFRCxZQUNDLHNCQUErQyxFQUMvQyxVQUFrQztRQUVsQyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFO1lBQzdELGlCQUFpQixFQUFFLHNCQUFzQixDQUFDLEVBQUUsa0NBQTBCO1NBQ3RFLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9