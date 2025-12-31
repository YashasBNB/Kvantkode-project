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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2Jyb3dzZXIvaXNzdWVRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHlCQUF5QixFQUl6QixhQUFhLEdBQ2IsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sWUFBWSxFQUNaLE1BQU0sR0FHTixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRixJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLHlCQUFpRDs7YUFDL0UsV0FBTSxHQUFHLFFBQVEsQUFBWCxDQUFXO0lBRXhCLFlBQ2dDLFdBQXlCLEVBQ25CLGlCQUFxQyxFQUN4QyxjQUErQixFQUM3QixnQkFBbUMsRUFDckMsY0FBK0I7UUFFakUsS0FBSyxDQUFDLGtCQUFnQixDQUFDLE1BQU0s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