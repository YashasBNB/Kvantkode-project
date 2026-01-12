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
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize } from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { EXTENSION_SETTING_TAG, FEATURE_SETTING_TAG, GENERAL_TAG_SETTING_TAG, LANGUAGE_SETTING_TAG, MODIFIED_SETTING_TAG, POLICY_SETTING_TAG, } from '../common/preferences.js';
let SettingsSearchFilterDropdownMenuActionViewItem = class SettingsSearchFilterDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, actionRunner, searchWidget, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            actionRunner,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true,
        });
        this.searchWidget = searchWidget;
        this.suggestController = SuggestController.get(this.searchWidget.inputWidget);
    }
    render(container) {
        super.render(container);
    }
    doSearchWidgetAction(queryToAppend, triggerSuggest) {
        this.searchWidget.setValue(this.searchWidget.getValue().trimEnd() + ' ' + queryToAppend);
        this.searchWidget.focus();
        if (triggerSuggest && this.suggestController) {
            this.suggestController.triggerSuggest();
        }
    }
    /**
     * The created action appends a query to the search widget search string. It optionally triggers suggestions.
     */
    createAction(id, label, tooltip, queryToAppend, triggerSuggest) {
        return {
            id,
            label,
            tooltip,
            class: undefined,
            enabled: true,
            run: () => {
                this.doSearchWidgetAction(queryToAppend, triggerSuggest);
            },
        };
    }
    /**
     * The created action appends a query to the search widget search string, if the query does not exist.
     * Otherwise, it removes the query from the search widget search string.
     * The action does not trigger suggestions after adding or removing the query.
     */
    createToggleAction(id, label, tooltip, queryToAppend) {
        const splitCurrentQuery = this.searchWidget.getValue().split(' ');
        const queryContainsQueryToAppend = splitCurrentQuery.includes(queryToAppend);
        return {
            id,
            label,
            tooltip,
            class: undefined,
            enabled: true,
            checked: queryContainsQueryToAppend,
            run: () => {
                if (!queryContainsQueryToAppend) {
                    const trimmedCurrentQuery = this.searchWidget.getValue().trimEnd();
                    const newQuery = trimmedCurrentQuery
                        ? trimmedCurrentQuery + ' ' + queryToAppend
                        : queryToAppend;
                    this.searchWidget.setValue(newQuery);
                }
                else {
                    const queryWithRemovedTags = this.searchWidget
                        .getValue()
                        .split(' ')
                        .filter((word) => word !== queryToAppend)
                        .join(' ');
                    this.searchWidget.setValue(queryWithRemovedTags);
                }
                this.searchWidget.focus();
            },
        };
    }
    getActions() {
        return [
            this.createToggleAction('modifiedSettingsSearch', localize('modifiedSettingsSearch', 'Modified'), localize('modifiedSettingsSearchTooltip', 'Add or remove modified settings filter'), `@${MODIFIED_SETTING_TAG}`),
            this.createAction('extSettingsSearch', localize('extSettingsSearch', 'Extension ID...'), localize('extSettingsSearchTooltip', 'Add extension ID filter'), `@${EXTENSION_SETTING_TAG}`, true),
            this.createAction('featuresSettingsSearch', localize('featureSettingsSearch', 'Feature...'), localize('featureSettingsSearchTooltip', 'Add feature filter'), `@${FEATURE_SETTING_TAG}`, true),
            this.createAction('tagSettingsSearch', localize('tagSettingsSearch', 'Tag...'), localize('tagSettingsSearchTooltip', 'Add tag filter'), `@${GENERAL_TAG_SETTING_TAG}`, true),
            this.createAction('langSettingsSearch', localize('langSettingsSearch', 'Language...'), localize('langSettingsSearchTooltip', 'Add language ID filter'), `@${LANGUAGE_SETTING_TAG}`, true),
            this.createToggleAction('onlineSettingsSearch', localize('onlineSettingsSearch', 'Online services'), localize('onlineSettingsSearchTooltip', 'Show settings for online services'), '@tag:usesOnlineServices'),
            this.createToggleAction('policySettingsSearch', localize('policySettingsSearch', 'Policy services'), localize('policySettingsSearchTooltip', 'Show settings for policy services'), `@${POLICY_SETTING_TAG}`),
        ];
    }
};
SettingsSearchFilterDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService)
], SettingsSearchFilterDropdownMenuActionViewItem);
export { SettingsSearchFilterDropdownMenuActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NTZWFyY2hNZW51LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3NldHRpbmdzU2VhcmNoTWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUUzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFN0YsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIsdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsa0JBQWtCLEdBQ2xCLE1BQU0sMEJBQTBCLENBQUE7QUFFMUIsSUFBTSw4Q0FBOEMsR0FBcEQsTUFBTSw4Q0FBK0MsU0FBUSwwQkFBMEI7SUFHN0YsWUFDQyxNQUFlLEVBQ2YsT0FBK0IsRUFDL0IsWUFBdUMsRUFDdEIsWUFBaUMsRUFDN0Isa0JBQXVDO1FBRTVELEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUUsR0FBRyxPQUFPO1lBQ1YsWUFBWTtZQUNaLFVBQVUsRUFBRSxNQUFNLENBQUMsS0FBSztZQUN4Qix1QkFBdUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1lBQ3BELFdBQVcsRUFBRSxJQUFJO1NBQ2pCLENBQUMsQ0FBQTtRQVRlLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQVdsRCxJQUFJLENB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