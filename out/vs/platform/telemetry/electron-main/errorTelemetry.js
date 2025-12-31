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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvZWxlY3Ryb24tbWFpbi9lcnJvclRlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sY0FBYyxFQUNkLGlCQUFpQixFQUNqQix5QkFBeUIsR0FDekIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLGtCQUFrQixNQUFNLDZCQUE2QixDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRzNDLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxrQkFBa0I7SUFDN0QsWUFDa0IsVUFBdUIsRUFDckIsZ0JBQW1DO1FBRXRELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBSE4sZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUl6QyxDQUFDO0lBRWtCLHFCQUFxQjtRQUN2QywyRkFBMkY7UUFDM0YseUJBQXlCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBRW5FLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN6QyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDakYsQ0FBQztJQUVPLGlCQUFpQixDQUFDLEtBQVk7UUFDckMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDL0QsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25DLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTNCb0IsY0FBYztJQUdoQyxXQUFBLGlCQUFpQixDQUFBO0dBSEMsY0FBYyxDQTJCbEM7ZUEzQm9CLGNBQWMifQ==