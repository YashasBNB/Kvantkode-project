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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NTZWFyY2hNZW51LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc1NlYXJjaE1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFFM0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTdGLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLHVCQUF1QixFQUN2QixvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUNsQixNQUFNLDBCQUEwQixDQUFBO0FBRTFCLElBQU0sOENBQThDLEdBQXBELE1BQU0sOENBQStDLFNBQVEsMEJBQTBCO0lBRzdGLFlBQ0MsTUFBZSxFQUNmLE9BQStCLEVBQy9CLFlBQXVDLEVBQ3RCLFlBQWlDLEVBQzdCLGtCQUF1QztRQUU1RCxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixFQUFFO1lBQzFFLEdBQUcsT0FBTztZQUNWLFlBQVk7WUFDWixVQUFVLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDeEIsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLDhCQUFzQjtZQUNwRCxXQUFXLEVBQUUsSUFBSTtTQUNqQixDQUFDLENBQUE7UUFUZSxpQkFBWSxHQUFaLFlBQVksQ0FBcUI7UUFXbEQsSUFBSSxDQUFDLGlC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