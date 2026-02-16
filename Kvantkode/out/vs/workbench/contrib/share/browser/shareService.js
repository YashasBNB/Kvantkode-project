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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zaGFyZS9icm93c2VyL3NoYXJlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBZ0IsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUc1RSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLGFBQWEsQ0FDekQsb0JBQW9CLEVBQ3BCLENBQUMsRUFDRCxRQUFRLENBQUMsb0JBQW9CLEVBQUUseUNBQXlDLENBQUMsQ0FDekUsQ0FBQTtBQWVNLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQVk7SUFNeEIsWUFDcUIsaUJBQTZDLEVBQ2xELFlBQTRDLEVBQ3ZDLGlCQUE2QyxFQUM3QyxpQkFB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