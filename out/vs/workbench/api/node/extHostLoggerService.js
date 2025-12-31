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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExvZ2dlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdExvZ2dlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLG9CQUFvQixJQUFJLHdCQUF3QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0QsTUFBTSxPQUFPLG9CQUFxQixTQUFRLHdCQUF3QjtJQUM5QyxjQUFjLENBQ2hDLFFBQWEsRUFDYixRQUFrQixFQUNsQixPQUF3QjtRQUV4QixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RDLG9IQUFvSDtZQUNwSCxPQUFPLElBQUksWUFBWSxDQUN0QixPQUFPLEVBQUUsSUFBSSxJQUFJLFlBQVksRUFBRSxFQUMvQixRQUFRLENBQUMsTUFBTSxFQUNmLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFDckIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFDN0IsUUFBUSxDQUNSLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVRLGNBQWMsQ0FBQyxRQUF5QjtRQUNoRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFUSxnQkFBZ0IsQ0FBQyxRQUFhO1FBQ3RDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7Q0FDRCJ9