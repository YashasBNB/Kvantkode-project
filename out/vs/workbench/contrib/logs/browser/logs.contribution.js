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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { OpenWindowSessionLogFileAction } from '../common/logsActions.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { LogsDataCleaner } from '../common/logsDataCleaner.js';
let WebLogOutputChannels = class WebLogOutputChannels extends Disposable {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.registerWebContributions();
    }
    registerWebContributions() {
        this.instantiationService.createInstance(LogsDataCleaner);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: OpenWindowSessionLogFileAction.ID,
                    title: OpenWindowSessionLogFileAction.TITLE,
                    category: Categories.Developer,
                    f1: true,
                });
            }
            run(servicesAccessor) {
                return servicesAccessor
                    .get(IInstantiationService)
                    .createInstance(OpenWindowSessionLogFileAction, OpenWindowSessionLogFileAction.ID, OpenWindowSessionLogFileAction.TITLE.value)
                    .run();
            }
        }));
    }
};
WebLogOutputChannels = __decorate([
    __param(0, IInstantiationService)
], WebLogOutputChannels);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WebLogOutputChannels, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvZ3MvYnJvd3Nlci9sb2dzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDekUsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsR0FDakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUU5RCxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFDNUMsWUFBb0Qsb0JBQTJDO1FBQzlGLEtBQUssRUFBRSxDQUFBO1FBRDRDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFOUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUVPLHdCQUF3QjtRQUMvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXpELElBQUksQ0FBQyxTQUFTLENBQ2IsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO1lBQ3BCO2dCQUNDLEtBQUssQ0FBQztvQkFDTCxFQUFFLEVBQUUsOEJBQThCLENBQUMsRUFBRTtvQkFDckMsS0FBSyxFQUFFLDhCQUE4QixDQUFDLEtBQUs7b0JBQzNDLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztvQkFDOUIsRUFBRSxFQUFFLElBQUk7aUJBQ1IsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUNELEdBQUcsQ0FBQyxnQkFBa0M7Z0JBQ3JDLE9BQU8sZ0JBQWdCO3FCQUNyQixHQUFHLENBQUMscUJBQXFCLENBQUM7cUJBQzFCLGNBQWMsQ0FDZCw4QkFBOEIsRUFDOUIsOEJBQThCLENBQUMsRUFBRSxFQUNqQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUMxQztxQkFDQSxHQUFHLEVBQUUsQ0FBQTtZQUNSLENBQUM7U0FDRCxDQUNELENBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBbENLLG9CQUFvQjtJQUNaLFdBQUEscUJBQXFCLENBQUE7R0FEN0Isb0JBQW9CLENBa0N6QjtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQ1YsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFDLDZCQUE2QixDQUFDLG9CQUFvQixrQ0FBMEIsQ0FBQSJ9