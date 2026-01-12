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
import { isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler, } from '../../../base/common/errors.js';
import BaseErrorTelemetry from '../common/errorTelemetry.js';
import { ITelemetryService } from '../common/telemetry.js';
let ErrorTelemetry = class ErrorTelemetry extends BaseErrorTelemetry {
    constructor(logService, telemetryService) {
        super(telemetryService);
        this.logService = logService;
    }
    installErrorListeners() {
        // We handle uncaught exceptions here to prevent electron from opening a dialog to the user
        setUnexpectedErrorHandler((error) => this.onUnexpectedError(error));
        process.on('uncaughtException', (error) => {
            if (!isSigPipeError(error)) {
                onUnexpectedError(error);
            }
        });
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
    }
    onUnexpectedError(error) {
        this.logService.error(`[uncaught exception in main]: ${error}`);
        if (error.stack) {
            this.logService.error(error.stack);
        }
    }
};
ErrorTelemetry = __decorate([
    __param(1, ITelemetryService)
], ErrorTelemetry);
export default ErrorTelemetry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9lbGVjdHJvbi1tYWluL2Vycm9yVGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLHlCQUF5QixHQUN6QixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sa0JBQWtCLE1BQU0sNkJBQTZCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFHM0MsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLGtCQUFrQjtJQUM3RCxZQUNrQixVQUF1QixFQUNyQixnQkFBbUM7UUFFdEQsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFITixlQUFVLEdBQVYsVUFBVSxDQUFhO0lBSXpDLENBQUM7SUFFa0IscUJBQXFCO1FBQ3ZDLDJGQUEyRjtRQUMzRix5QkFBeUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFbkUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3pDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE1BQWUsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNqRixDQUFDO0lBRU8saUJBQWlCLENBQUMsS0FBWTtRQUNyQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUMvRCxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBM0JvQixjQUFjO0lBR2hDLFdBQUEsaUJBQWlCLENBQUE7R0FIQyxjQUFjLENBMkJsQztlQTNCb0IsY0FBYyJ9