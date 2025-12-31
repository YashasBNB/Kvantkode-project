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
import Severity from '../../../../base/common/severity.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { DialogsModel } from '../../../common/dialogs.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let DialogService = class DialogService extends Disposable {
    constructor(environmentService, logService) {
        super();
        this.environmentService = environmentService;
        this.logService = logService;
        this.model = this._register(new DialogsModel());
        this.onWillShowDialog = this.model.onWillShowDialog;
        this.onDidShowDialog = this.model.onDidShowDialog;
    }
    skipDialogs() {
        if (this.environmentService.isExtensionDevelopment &&
            this.environmentService.extensionTestsLocationURI) {
            return true; // integration tests
        }
        return !!this.environmentService.enableSmokeTestDriver; // smoke tests
    }
    async confirm(confirmation) {
        if (this.skipDialogs()) {
            this.logService.trace('DialogService: refused to show confirmation dialog in tests.');
            return { confirmed: true };
        }
        const handle = this.model.show({ confirmArgs: { confirmation } });
        return (await handle.result);
    }
    async prompt(prompt) {
        if (this.skipDialogs()) {
            throw new Error(`DialogService: refused to show dialog in tests. Contents: ${prompt.message}`);
        }
        const handle = this.model.show({ promptArgs: { prompt } });
        const dialogResult = (await handle.result);
        return {
            result: await dialogResult.result,
            checkboxChecked: dialogResult.checkboxChecked,
        };
    }
    async input(input) {
        if (this.skipDialogs()) {
            throw new Error('DialogService: refused to show input dialog in tests.');
        }
        const handle = this.model.show({ inputArgs: { input } });
        return (await handle.result);
    }
    async info(message, detail) {
        await this.prompt({ type: Severity.Info, message, detail });
    }
    async warn(message, detail) {
        await this.prompt({ type: Severity.Warning, message, detail });
    }
    async error(message, detail) {
        await this.prompt({ type: Severity.Error, message, detail });
    }
    async about() {
        if (this.skipDialogs()) {
            throw new Error('DialogService: refused to show about dialog in tests.');
        }
        const handle = this.model.show({});
        await handle.result;
    }
};
DialogService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, ILogService)
], DialogService);
export { DialogService };
registerSingleton(IDialogService, DialogService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kaWFsb2dzL2NvbW1vbi9kaWFsb2dTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBS04sY0FBYyxHQVFkLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3pELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFN0QsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYyxTQUFRLFVBQVU7SUFTNUMsWUFDK0Isa0JBQWlFLEVBQ2xGLFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFBO1FBSHdDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBOEI7UUFDakUsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQVI3QyxVQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUE7UUFFMUMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQTtRQUU5QyxvQkFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFBO0lBT3JELENBQUM7SUFFTyxXQUFXO1FBQ2xCLElBQ0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtZQUM5QyxJQUFJLENBQUMsa0JBQWtCLENBQUMseUJBQXlCLEVBQ2hELENBQUM7WUFDRixPQUFPLElBQUksQ0FBQSxDQUFDLG9CQUFvQjtRQUNqQyxDQUFDO1FBRUQsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixDQUFBLENBQUMsY0FBYztJQUN0RSxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUEyQjtRQUN4QyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDhEQUE4RCxDQUFDLENBQUE7WUFFckYsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUMzQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFakUsT0FBTyxDQUFDLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBd0IsQ0FBQTtJQUNwRCxDQUFDO0lBS0QsS0FBSyxDQUFDLE1BQU0sQ0FDWCxNQUE2RTtRQUU3RSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkRBQTZELE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQy9GLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUUxRCxNQUFNLFlBQVksR0FBRyxDQUFDLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FFUCxDQUFBO1FBRWxDLE9BQU87WUFDTixNQUFNLEVBQUUsTUFBTSxZQUFZLENBQUMsTUFBTTtZQUNqQyxlQUFlLEVBQUUsWUFBWSxDQUFDLGVBQWU7U0FDN0MsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQWE7UUFDeEIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUE7UUFDekUsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXhELE9BQU8sQ0FBQyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQWlCLENBQUE7SUFDN0MsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBZSxFQUFFLE1BQWU7UUFDMUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBZSxFQUFFLE1BQWU7UUFDMUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBZSxFQUFFLE1BQWU7UUFDM0MsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLO1FBQ1YsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUE7UUFDekUsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQTtJQUNwQixDQUFDO0NBQ0QsQ0FBQTtBQTNGWSxhQUFhO0lBVXZCLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxXQUFXLENBQUE7R0FYRCxhQUFhLENBMkZ6Qjs7QUFFRCxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsYUFBYSxvQ0FBNEIsQ0FBQSJ9