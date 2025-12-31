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
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { isResponseVM } from '../../common/chatViewModel.js';
const $ = dom.$;
let ChatCommandButtonContentPart = class ChatCommandButtonContentPart extends Disposable {
    constructor(commandButton, context, commandService) {
        super();
        this.commandService = commandService;
        this.domNode = $('.chat-command-button');
        const enabled = !isResponseVM(context.element) || !context.element.isStale;
        const tooltip = enabled
            ? commandButton.command.tooltip
            : localize('commandButtonDisabled', 'Button not available in restored chat');
        const button = this._register(new Button(this.domNode, { ...defaultButtonStyles, supportIcons: true, title: tooltip }));
        button.label = commandButton.command.title;
        button.enabled = enabled;
        // TODO still need telemetry for command buttons
        this._register(button.onDidClick(() => this.commandService.executeCommand(commandButton.command.id, ...(commandButton.command.arguments ?? []))));
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'command';
    }
};
ChatCommandButtonContentPart = __decorate([
    __param(2, ICommandService)
], ChatCommandButtonContentPart);
export { ChatCommandButtonContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbW1hbmRDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRDb21tYW5kQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFJNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTVELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFUixJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7SUFHM0QsWUFDQyxhQUFpQyxFQUNqQyxPQUFzQyxFQUNKLGNBQStCO1FBRWpFLEtBQUssRUFBRSxDQUFBO1FBRjJCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUlqRSxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFBO1FBQzFFLE1BQU0sT0FBTyxHQUFHLE9BQU87WUFDdEIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTztZQUMvQixDQUFDLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHVDQUF1QyxDQUFDLENBQUE7UUFDN0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDNUIsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FDeEYsQ0FBQTtRQUNELE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDMUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFFeEIsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FDdEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQ2pDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUN4QixHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLENBQzFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUE2QztRQUMzRCxnREFBZ0Q7UUFDaEQsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQTtJQUNoQyxDQUFDO0NBQ0QsQ0FBQTtBQXBDWSw0QkFBNEI7SUFNdEMsV0FBQSxlQUFlLENBQUE7R0FOTCw0QkFBNEIsQ0FvQ3hDIn0=