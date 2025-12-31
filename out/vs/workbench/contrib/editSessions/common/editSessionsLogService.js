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
import { joinPath } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { AbstractLogger, ILoggerService } from '../../../../platform/log/common/log.js';
import { windowLogGroup } from '../../../services/log/common/logConstants.js';
import { editSessionsLogId } from './editSessions.js';
let EditSessionsLogService = class EditSessionsLogService extends AbstractLogger {
    constructor(loggerService, environmentService) {
        super();
        this.logger = this._register(loggerService.createLogger(joinPath(environmentService.logsHome, `${editSessionsLogId}.log`), {
            id: editSessionsLogId,
            name: localize('cloudChangesLog', 'Cloud Changes'),
            group: windowLogGroup,
        }));
    }
    trace(message, ...args) {
        this.logger.trace(message, ...args);
    }
    debug(message, ...args) {
        this.logger.debug(message, ...args);
    }
    info(message, ...args) {
        this.logger.info(message, ...args);
    }
    warn(message, ...args) {
        this.logger.warn(message, ...args);
    }
    error(message, ...args) {
        this.logger.error(message, ...args);
    }
    flush() {
        this.logger.flush();
    }
};
EditSessionsLogService = __decorate([
    __param(0, ILoggerService),
    __param(1, IEnvironmentService)
], EditSessionsLogService);
export { EditSessionsLogService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zTG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy9jb21tb24vZWRpdFNlc3Npb25zTG9nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQVcsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBMkIsaUJBQWlCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUV2RSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLGNBQWM7SUFJekQsWUFDaUIsYUFBNkIsRUFDeEIsa0JBQXVDO1FBRTVELEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzQixhQUFhLENBQUMsWUFBWSxDQUN6QixRQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEdBQUcsaUJBQWlCLE1BQU0sQ0FBQyxFQUNqRTtZQUNDLEVBQUUsRUFBRSxpQkFBaUI7WUFDckIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUM7WUFDbEQsS0FBSyxFQUFFLGNBQWM7U0FDckIsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDbkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUF1QixFQUFFLEdBQUcsSUFBVztRQUM1QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQztDQUNELENBQUE7QUE1Q1ksc0JBQXNCO0lBS2hDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQkFBbUIsQ0FBQTtHQU5ULHNCQUFzQixDQTRDbEMifQ==