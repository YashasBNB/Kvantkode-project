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
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { score } from '../../../../editor/common/languageSelector.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ToggleTitleBarConfigAction } from '../../../browser/parts/titlebar/titlebarActions.js';
import { WorkspaceFolderCountContext } from '../../../common/contextkeys.js';
export const ShareProviderCountContext = new RawContextKey('shareProviderCount', 0, localize('shareProviderCount', 'The number of available share providers'));
let ShareService = class ShareService {
    constructor(contextKeyService, labelService, quickInputService, codeEditorService, telemetryService) {
        this.contextKeyService = contextKeyService;
        this.labelService = labelService;
        this.quickInputService = quickInputService;
        this.codeEditorService = codeEditorService;
        this.telemetryService = telemetryService;
        this._providers = new Set();
        this.providerCount = ShareProviderCountContext.bindTo(this.contextKeyService);
    }
    registerShareProvider(provider) {
        this._providers.add(provider);
        this.providerCount.set(this._providers.size);
        return {
            dispose: () => {
                this._providers.delete(provider);
                this.providerCount.set(this._providers.size);
            },
        };
    }
    getShareActions() {
        // todo@joyceerhl return share actions
        return [];
    }
    async provideShare(item, token) {
        const language = this.codeEditorService.getActiveCodeEditor()?.getModel()?.getLanguageId() ?? '';
        const providers = [...this._providers.values()]
            .filter((p) => score(p.selector, item.resourceUri, language, true, undefined, undefined) > 0)
            .sort((a, b) => a.priority - b.priority);
        if (providers.length === 0) {
            return undefined;
        }
        if (providers.length === 1) {
            this.telemetryService.publicLog2('shareService.share', {
                providerId: providers[0].id,
            });
            return providers[0].provideShare(item, token);
        }
        const items = providers.map((p) => ({
            label: p.label,
            provider: p,
        }));
        const selected = await this.quickInputService.pick(items, {
            canPickMany: false,
            placeHolder: localize('type to filter', 'Choose how to share {0}', this.labelService.getUriLabel(item.resourceUri)),
        }, token);
        if (selected !== undefined) {
            this.telemetryService.publicLog2('shareService.share', {
                providerId: selected.provider.id,
            });
            return selected.provider.provideShare(item, token);
        }
        return;
    }
};
ShareService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILabelService),
    __param(2, IQuickInputService),
    __param(3, ICodeEditorService),
    __param(4, ITelemetryService)
], ShareService);
export { ShareService };
registerAction2(class ToggleShareControl extends ToggleTitleBarConfigAction {
    constructor() {
        super('workbench.experimental.share.enabled', localize('toggle.share', 'Share'), localize('toggle.shareDescription', 'Toggle visibility of the Share action in title bar'), 3, false, ContextKeyExpr.and(ContextKeyExpr.has('config.window.commandCenter'), ContextKeyExpr.and(ShareProviderCountContext.notEqualsTo(0), WorkspaceFolderCountContext.notEqualsTo(0))));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2hhcmUvYnJvd3Nlci9zaGFyZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQWdCLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlGLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDL0YsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHNUUsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFhLENBQ3pELG9CQUFvQixFQUNwQixDQUFDLEVBQ0QsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHlDQUF5QyxDQUFDLENBQ3pFLENBQUE7QUFlTSxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFZO0lBTXhCLFlBQ3FCLGlCQUE2QyxFQUNsRCxZQUE0QyxFQUN2QyxpQkFBNkMsRUFDN0MsaUJBQXNELEVBQ3ZELGdCQUFvRDtRQUozQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2pDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQy9CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDNUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN0QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBUHZELGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQVN0RCxJQUFJLENBQUMsYUFBYSxHQUFHLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0lBRUQscUJBQXFCLENBQUMsUUFBd0I7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QyxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QyxDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxlQUFlO1FBQ2Qsc0NBQXNDO1FBQ3RDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQ2pCLElBQW9CLEVBQ3BCLEtBQXdCO1FBRXhCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUNoRyxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUM3QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzVGLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXpDLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQWtDLG9CQUFvQixFQUFFO2dCQUN2RixVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDM0IsQ0FBQyxDQUFBO1lBQ0YsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQXNELFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdEYsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLO1lBQ2QsUUFBUSxFQUFFLENBQUM7U0FDWCxDQUFDLENBQUMsQ0FBQTtRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FDakQsS0FBSyxFQUNMO1lBQ0MsV0FBVyxFQUFFLEtBQUs7WUFDbEIsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsZ0JBQWdCLEVBQ2hCLHlCQUF5QixFQUN6QixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQy9DO1NBQ0QsRUFDRCxLQUFLLENBQ0wsQ0FBQTtRQUVELElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQWtDLG9CQUFvQixFQUFFO2dCQUN2RixVQUFVLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2FBQ2hDLENBQUMsQ0FBQTtZQUNGLE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFFRCxPQUFNO0lBQ1AsQ0FBQztDQUNELENBQUE7QUE5RVksWUFBWTtJQU90QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsaUJBQWlCLENBQUE7R0FYUCxZQUFZLENBOEV4Qjs7QUFFRCxlQUFlLENBQ2QsTUFBTSxrQkFBbUIsU0FBUSwwQkFBMEI7SUFDMUQ7UUFDQyxLQUFLLENBQ0osc0NBQXNDLEVBQ3RDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLEVBQ2pDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxvREFBb0QsQ0FBQyxFQUN6RixDQUFDLEVBQ0QsS0FBSyxFQUNMLGNBQWMsQ0FBQyxHQUFHLENBQ2pCLGNBQWMsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFDakQsY0FBYyxDQUFDLEdBQUcsQ0FDakIseUJBQXlCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUN4QywyQkFBMkIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQzFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQSJ9