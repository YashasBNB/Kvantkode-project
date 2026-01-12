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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbG9nL25vZGUvbG9nZ2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDM0QsT0FBTyxFQUNOLHFCQUFxQixHQUtyQixNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUU3QyxNQUFNLE9BQU8sYUFBYyxTQUFRLHFCQUFxQjtJQUM3QyxjQUFjLENBQUMsUUFBYSxFQUFFLFFBQWtCLEVBQUUsT0FBd0I7UUFDbkYsT0FBTyxJQUFJLFlBQVksQ0FDdEIsWUFBWSxFQUFFLEVBQ2QsUUFBUSxDQUFDLE1BQU0sRUFDZixDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQ3JCLENBQUMsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQzdCLFFBQVEsQ0FDUixDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=