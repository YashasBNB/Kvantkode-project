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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sb2cvZWxlY3Ryb24tc2FuZGJveC9sb2dTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQVcsTUFBTSx3Q0FBd0MsQ0FBQTtBQUcvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFMUUsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7SUFDL0MsWUFDQyxhQUFrQyxFQUNsQyxrQkFBc0Q7UUFFdEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUV6QyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNqQyxhQUFhLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRTtZQUN0RCxFQUFFLEVBQUUsV0FBVztZQUNmLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSTtZQUN6QixLQUFLLEVBQUUsY0FBYztTQUNyQixDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksYUFBc0IsQ0FBQTtRQUMxQixJQUNDLGtCQUFrQixDQUFDLHNCQUFzQjtZQUN6QyxDQUFDLENBQUMsa0JBQWtCLENBQUMseUJBQXlCLEVBQzdDLENBQUM7WUFDRixrRUFBa0U7WUFDbEUsYUFBYSxHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1FBQ3hELENBQUM7YUFBTSxDQUFDO1lBQ1AsOEJBQThCO1lBQzlCLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFFbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM1QixDQUFDO0NBQ0QifQ==