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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tMb2dnaW5nU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tMb2dnaW5nU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEUsT0FBTyxFQUFXLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVoRixNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQTtBQUVsQyxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7YUFHOUMsT0FBRSxHQUFXLFVBQVUsQUFBckIsQ0FBcUI7SUFHOUIsWUFBNEIsYUFBNkI7UUFDeEQsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVCLGFBQWEsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFO1lBQ3hDLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQztZQUNuRCxLQUFLLEVBQUUsY0FBYztTQUNyQixDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBZ0IsRUFBRSxNQUFjO1FBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxLQUFLLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVELElBQUksQ0FBQyxRQUFnQixFQUFFLE1BQWM7UUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLEtBQUssTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBSSxDQUFDLFFBQWdCLEVBQUUsTUFBYztRQUNwQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBZ0IsRUFBRSxNQUFjO1FBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxLQUFLLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDOUMsQ0FBQzs7QUE5Qlcsc0JBQXNCO0lBTXJCLFdBQUEsY0FBYyxDQUFBO0dBTmYsc0JBQXNCLENBK0JsQyJ9