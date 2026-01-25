/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtHostLoggerService as BaseExtHostLoggerService } from '../common/extHostLoggerService.js';
import { Schemas } from '../../../base/common/network.js';
import { SpdLogLogger } from '../../../platform/log/node/spdlogLog.js';
import { generateUuid } from '../../../base/common/uuid.js';
export class ExtHostLoggerService extends BaseExtHostLoggerService {
    doCreateLogger(resource, logLevel, options) {
        if (resource.scheme === Schemas.file) {
            /* Create the logger in the Extension Host process to prevent loggers (log, output channels...) traffic  over IPC */
            return new SpdLogLogger(options?.name || generateUuid(), resource.fsPath, !options?.donotRotate, !!options?.donotUseFormatters, logLevel);
        }
        return super.doCreateLogger(resource, logLevel, options);
    }
    registerLogger(resource) {
        super.registerLogger(resource);
        this._proxy.$registerLogger(resource);
    }
    deregisterLogger(resource) {
        super.deregisterLogger(resource);
        this._proxy.$deregisterLogger(resource);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExvZ2dlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0TG9nZ2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxPQUFPLEVBQUUsb0JBQW9CLElBQUksd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUzRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsd0JBQXdCO0lBQzlDLGNBQWMsQ0FDaEMsUUFBYSxFQUNiLFFBQWtCLEVBQ2xCLE9BQXdCO1FBRXhCLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEMsb0hBQW9IO1lBQ3BILE9BQU8sSUFBSSxZQUFZLENBQ3RCLE9BQU8sRUFBRSxJQUFJLElBQUksWUFBWSxFQUFFLEVBQy9CLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUNyQixDQUFDLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUM3QixRQUFRLENBQ1IsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRVEsY0FBYyxDQUFDLFFBQXlCO1FBQ2hELEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVRLGdCQUFnQixDQUFDLFFBQWE7UUFDdEMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEMsQ0FBQztDQUNEIn0=