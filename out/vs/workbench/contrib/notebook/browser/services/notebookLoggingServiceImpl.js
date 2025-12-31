/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../../nls.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ILoggerService } from '../../../../../platform/log/common/log.js';
import { windowLogGroup } from '../../../../services/log/common/logConstants.js';
const logChannelId = 'notebook.rendering';
let NotebookLoggingService = class NotebookLoggingService extends Disposable {
    static { this.ID = 'notebook'; }
    constructor(loggerService) {
        super();
        this._logger = this._register(loggerService.createLogger(logChannelId, {
            name: nls.localize('renderChannelName', 'Notebook'),
            group: windowLogGroup,
        }));
    }
    debug(category, output) {
        this._logger.debug(`[${category}] ${output}`);
    }
    info(category, output) {
        this._logger.info(`[${category}] ${output}`);
    }
    warn(category, output) {
        this._logger.warn(`[${category}] ${output}`);
    }
    error(category, output) {
        this._logger.error(`[${category}] ${output}`);
    }
};
NotebookLoggingService = __decorate([
    __param(0, ILoggerService)
], NotebookLoggingService);
export { NotebookLoggingService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tMb2dnaW5nU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rTG9nZ2luZ1NlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXBFLE9BQU8sRUFBVyxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFaEYsTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQUE7QUFFbEMsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO2FBRzlDLE9BQUUsR0FBVyxVQUFVLEFBQXJCLENBQXFCO0lBRzlCLFlBQTRCLGFBQTZCO1FBQ3hELEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1QixhQUFhLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRTtZQUN4QyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLENBQUM7WUFDbkQsS0FBSyxFQUFFLGNBQWM7U0FDckIsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQWdCLEVBQUUsTUFBYztRQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxJQUFJLENBQUMsUUFBZ0IsRUFBRSxNQUFjO1FBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxLQUFLLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELElBQUksQ0FBQyxRQUFnQixFQUFFLE1BQWM7UUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLEtBQUssTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQWdCLEVBQUUsTUFBYztRQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7O0FBOUJXLHNCQUFzQjtJQU1yQixXQUFBLGNBQWMsQ0FBQTtHQU5mLHNCQUFzQixDQStCbEMifQ==