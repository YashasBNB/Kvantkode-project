/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ConsoleLogger } from '../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { windowLogGroup, windowLogId } from '../common/logConstants.js';
import { LogService } from '../../../../platform/log/common/logService.js';
export class NativeLogService extends LogService {
    constructor(loggerService, environmentService) {
        const disposables = new DisposableStore();
        const fileLogger = disposables.add(loggerService.createLogger(environmentService.logFile, {
            id: windowLogId,
            name: windowLogGroup.name,
            group: windowLogGroup,
        }));
        let consoleLogger;
        if (environmentService.isExtensionDevelopment &&
            !!environmentService.extensionTestsLocationURI) {
            // Extension development test CLI: forward everything to main side
            consoleLogger = loggerService.createConsoleMainLogger();
        }
        else {
            // Normal mode: Log to console
            consoleLogger = new ConsoleLogger(fileLogger.getLevel());
        }
        super(fileLogger, [consoleLogger]);
        this._register(disposables);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xvZy9lbGVjdHJvbi1zYW5kYm94L2xvZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBVyxNQUFNLHdDQUF3QyxDQUFBO0FBRy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUUxRSxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsVUFBVTtJQUMvQyxZQUNDLGFBQWtDLEVBQ2xDLGtCQUFzRDtRQUV0RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXpDLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ2pDLGFBQWEsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFO1lBQ3RELEVBQUUsRUFBRSxXQUFXO1lBQ2YsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJO1lBQ3pCLEtBQUssRUFBRSxjQUFjO1NBQ3JCLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxhQUFzQixDQUFBO1FBQzFCLElBQ0Msa0JBQWtCLENBQUMsc0JBQXNCO1lBQ3pDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyx5QkFBeUIsRUFDN0MsQ0FBQztZQUNGLGtFQUFrRTtZQUNsRSxhQUFhLEdBQUcsYUFBYSxDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFDeEQsQ0FBQzthQUFNLENBQUM7WUFDUCw4QkFBOEI7WUFDOUIsYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELENBQUM7UUFFRCxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUVsQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzVCLENBQUM7Q0FDRCJ9