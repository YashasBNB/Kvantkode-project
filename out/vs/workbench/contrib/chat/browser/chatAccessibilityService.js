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
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { AccessibilityProgressSignalScheduler } from '../../../../platform/accessibilitySignal/browser/progressAccessibilitySignalScheduler.js';
import { renderStringAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const CHAT_RESPONSE_PENDING_ALLOWANCE_MS = 4000;
let ChatAccessibilityService = class ChatAccessibilityService extends Disposable {
    constructor(_accessibilitySignalService, _instantiationService, _configurationService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._pendingSignalMap = this._register(new DisposableMap());
        this._requestId = 0;
    }
    acceptRequest() {
        this._requestId++;
        this._accessibilitySignalService.playSignal(AccessibilitySignal.chatRequestSent, {
            allowManyInParallel: true,
        });
        this._pendingSignalMap.set(this._requestId, this._instantiationService.createInstance(AccessibilityProgressSignalScheduler, CHAT_RESPONSE_PENDING_ALLOWANCE_MS, undefined));
        return this._requestId;
    }
    acceptResponse(response, requestId, isVoiceInput) {
        this._pendingSignalMap.deleteAndDispose(requestId);
        const isPanelChat = typeof response !== 'string';
        const responseContent = typeof response === 'string' ? response : response?.response.toString();
        this._accessibilitySignalService.playSignal(AccessibilitySignal.chatResponseReceived, {
            allowManyInParallel: true,
        });
        if (!response || !responseContent) {
            return;
        }
        const errorDetails = isPanelChat && response.errorDetails ? ` ${response.errorDetails.message}` : '';
        const plainTextResponse = renderStringAsPlaintext(new MarkdownString(responseContent));
        if (!isVoiceInput ||
            this._configurationService.getValue("accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */) !== 'on') {
            status(plainTextResponse + errorDetails);
        }
    }
};
ChatAccessibilityService = __decorate([
    __param(0, IAccessibilitySignalService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], ChatAccessibilityService);
export { ChatAccessibilityService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRBY2Nlc3NpYmlsaXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLGdGQUFnRixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLDBGQUEwRixDQUFBO0FBRy9JLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUdsRyxNQUFNLGtDQUFrQyxHQUFHLElBQUksQ0FBQTtBQUN4QyxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFRdkQsWUFFQywyQkFBeUUsRUFDbEQscUJBQTZELEVBQzdELHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUpVLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFDakMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM1QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBVDdFLHNCQUFpQixHQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUU1QixlQUFVLEdBQVcsQ0FBQyxDQUFBO0lBUzlCLENBQUM7SUFDRCxhQUFhO1FBQ1osSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2pCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsZUFBZSxFQUFFO1lBQ2hGLG1CQUFtQixFQUFFLElBQUk7U0FDekIsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FDekIsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUN4QyxvQ0FBb0MsRUFDcEMsa0NBQWtDLEVBQ2xDLFNBQVMsQ0FDVCxDQUNELENBQUE7UUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQUNELGNBQWMsQ0FDYixRQUFxRCxFQUNyRCxTQUFpQixFQUNqQixZQUFzQjtRQUV0QixJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEQsTUFBTSxXQUFXLEdBQUcsT0FBTyxRQUFRLEtBQUssUUFBUSxDQUFBO1FBQ2hELE1BQU0sZUFBZSxHQUFHLE9BQU8sUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9GLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLEVBQUU7WUFDckYsbUJBQW1CLEVBQUUsSUFBSTtTQUN6QixDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbkMsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLFlBQVksR0FDakIsV0FBVyxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ2hGLE1BQU0saUJBQWlCLEdBQUcsdUJBQXVCLENBQUMsSUFBSSxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUN0RixJQUNDLENBQUMsWUFBWTtZQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLHVGQUE0QyxLQUFLLElBQUksRUFDdkYsQ0FBQztZQUNGLE1BQU0sQ0FBQyxpQkFBaUIsR0FBRyxZQUFZLENBQUMsQ0FBQTtRQUN6QyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF2RFksd0JBQXdCO0lBU2xDLFdBQUEsMkJBQTJCLENBQUE7SUFFM0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBWlgsd0JBQXdCLENBdURwQyJ9