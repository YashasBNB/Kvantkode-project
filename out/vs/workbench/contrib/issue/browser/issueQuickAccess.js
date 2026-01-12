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
var IssueQuickAccess_1;
import { PickerQuickAccessProvider, TriggerAction, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IMenuService, MenuId, } from '../../../../platform/actions/common/actions.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IssueSource } from '../common/issue.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
let IssueQuickAccess = class IssueQuickAccess extends PickerQuickAccessProvider {
    static { IssueQuickAccess_1 = this; }
    static { this.PREFIX = 'issue '; }
    constructor(menuService, contextKeyService, commandService, extensionService, productService) {
        super(IssueQuickAccess_1.PREFIX, { canAcceptInBackground: true });
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.commandService = commandService;
        this.extensionService = extensionService;
        this.productService = productService;
    }
    _getPicks(filter) {
        const issuePicksConst = new Array();
        const issuePicksParts = new Array();
        const extensionIdSet = new Set();
        // Add default items
        const productLabel = this.productService.nameLong;
        const marketPlaceLabel = localize('reportExtensionMarketplace', 'Extension Marketplace');
        const productFilter = matchesFuzzy(filter, productLabel, true);
        const marketPlaceFilter = matchesFuzzy(filter, marketPlaceLabel, true);
        // Add product pick if product filter matches
        if (productFilter) {
            issuePicksConst.push({
                label: productLabel,
                ariaLabel: productLabel,
                highlights: { label: productFilter },
                accept: () => this.commandService.executeCommand('workbench.action.openIssueReporter', {
                    issueSource: IssueSource.VSCode,
                }),
            });
        }
        // Add marketplace pick if marketplace filter matches
        if (marketPlaceFilter) {
            issuePicksConst.push({
                label: marketPlaceLabel,
                ariaLabel: marketPlaceLabel,
                highlights: { label: marketPlaceFilter },
                accept: () => this.commandService.executeCommand('workbench.action.openIssueReporter', {
                    issueSource: IssueSource.Marketplace,
                }),
            });
        }
        issuePicksConst.push({ type: 'separator', label: localize('extensions', 'Extensions') });
        // gets menu actions from contributed
        const actions = this.menuService
            .getMenuActions(MenuId.IssueReporter, this.contextKeyService, { renderShortTitle: true })
            .flatMap((entry) => entry[1]);
        // create picks from contributed menu
        actions.forEach((action) => {
            if ('source' in action.item && action.item.source) {
                extensionIdSet.add(action.item.source.id);
            }
            const pick = this._createPick(filter, action);
            if (pick) {
                issuePicksParts.push(pick);
            }
        });
        // create picks from extensions
        this.extensionService.extensions.forEach((extension) => {
            if (!extension.isBuiltin) {
                const pick = this._createPick(filter, undefined, extension);
                const id = extension.identifier.value;
                if (pick && !extensionIdSet.has(id)) {
                    issuePicksParts.push(pick);
                }
                extensionIdSet.add(id);
            }
        });
        issuePicksParts.sort((a, b) => {
            const aLabel = a.label ?? '';
            const bLabel = b.label ?? '';
            return aLabel.localeCompare(bLabel);
        });
        return [...issuePicksConst, ...issuePicksParts];
    }
    _createPick(filter, action, extension) {
        const buttons = [
            {
                iconClass: ThemeIcon.asClassName(Codicon.info),
                tooltip: localize('contributedIssuePage', 'Open Extension Page'),
            },
        ];
        let label;
        let trigger;
        let accept;
        if (action && 'source' in action.item && action.item.source) {
            label = action.item.source?.title;
            trigger = () => {
                if ('source' in action.item && action.item.source) {
                    this.commandService.executeCommand('extension.open', action.item.source.id);
                }
                return TriggerAction.CLOSE_PICKER;
            };
            accept = () => {
                action.run();
            };
        }
        else if (extension) {
            label = extension.displayName ?? extension.name;
            trigger = () => {
                this.commandService.executeCommand('extension.open', extension.identifier.value);
                return TriggerAction.CLOSE_PICKER;
            };
            accept = () => {
                this.commandService.executeCommand('workbench.action.openIssueReporter', extension.identifier.value);
            };
        }
        else {
            return undefined;
        }
        const highlights = matchesFuzzy(filter, label, true);
        if (highlights) {
            return {
                label,
                highlights: { label: highlights },
                buttons,
                trigger,
                accept,
            };
        }
        return undefined;
    }
};
IssueQuickAccess = IssueQuickAccess_1 = __decorate([
    __param(0, IMenuService),
    __param(1, IContextKeyService),
    __param(2, ICommandService),
    __param(3, IExtensionService),
    __param(4, IProductService)
], IssueQuickAccess);
export { IssueQuickAccess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvYnJvd3Nlci9pc3N1ZVF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04seUJBQXlCLEVBSXpCLGFBQWEsR0FDYixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixZQUFZLEVBQ1osTUFBTSxHQUdOLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFckYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRWhGLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEseUJBQWlEOzthQUMvRSxXQUFNLEdBQUcsUUFBUSxBQUFYLENBQVc7SUFFeEIsWUFDZ0MsV0FBeUIsRUFDbkIsaUJBQXFDLEVBQ3hDLGNBQStCLEVBQzdCLGdCQUFtQyxFQUNyQyxjQUErQjtRQUVqRSxLQUFLLENBQUMsa0JBQWdCLENBQUMs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