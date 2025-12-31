/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { generateUuid } from '../../../base/common/uuid.js';
import { AbstractLoggerService, } from '../common/log.js';
import { SpdLogLogger } from './spdlogLog.js';
export class LoggerService extends AbstractLoggerService {
    doCreateLogger(resource, logLevel, options) {
        return new SpdLogLogger(generateUuid(), resource.fsPath, !options?.donotRotate, !!options?.donotUseFormatters, logLevel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9ub2RlL2xvZ2dlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFDTixxQkFBcUIsR0FLckIsTUFBTSxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFN0MsTUFBTSxPQUFPLGFBQWMsU0FBUSxxQkFBcUI7SUFDN0MsY0FBYyxDQUFDLFFBQWEsRUFBRSxRQUFrQixFQUFFLE9BQXdCO1FBQ25GLE9BQU8sSUFBSSxZQUFZLENBQ3RCLFlBQVksRUFBRSxFQUNkLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUNyQixDQUFDLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUM3QixRQUFRLENBQ1IsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9