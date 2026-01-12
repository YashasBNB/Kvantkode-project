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
var ActiveGroupEditorsByMostRecentlyUsedQuickAccess_1, AllEditorsByAppearanceQuickAccess_1, AllEditorsByMostRecentlyUsedQuickAccess_1;
import './media/editorquickaccess.css';
import { localize } from '../../../../nls.js';
import { quickPickItemScorerAccessor, } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider, TriggerAction, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { EditorResourceAccessor, SideBySideEditor, } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { prepareQuery, scoreItemFuzzy, compareItemsByFuzzyScore, } from '../../../../base/common/fuzzyScorer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let BaseEditorQuickAccessProvider = class BaseEditorQuickAccessProvider extends PickerQuickAccessProvider {
    constructor(prefix, editorGroupService, editorService, modelService, languageService) {
        super(prefix, {
            canAcceptInBackground: true,
            noResultsPick: {
                label: localize('noViewResults', 'No matching editors'),
                groupId: -1,
            },
        });
        this.editorGroupService = editorGroupService;
        this.editorService = editorService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.pickState = new (class {
            constructor() {
                this.scorerCache = Object.create(null);
                this.isQuickNavigating = undefined;
            }
            reset(isQuickNavigating) {
                // Caches
                if (!isQuickNavigating) {
                    this.scorerCache = Object.create(null);
                }
                // Other
                this.isQuickNavigating = isQuickNavigating;
            }
        })();
    }
    provide(picker, token) {
        // Reset the pick state for this run
        this.pickState.reset(!!picker.quickNavigate);
        // Start picker
        return super.provide(picker, token);
    }
    _getPicks(filter) {
        const query = prepareQuery(filter);
        // Filtering
        const filteredEditorEntries = this.doGetEditorPickItems().filter((entry) => {
            if (!query.normalized) {
                return true;
            }
            // Score on label and description
            const itemScore = scoreItemFuzzy(entry, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache);
            if (!itemScore.score) {
                return false;
            }
            // Apply highlights
            entry.highlights = { label: itemScore.labelMatch, description: itemScore.descriptionMatch };
            return true;
        });
        // Sorting
        if (query.normalized) {
            const groups = this.editorGroupService
                .getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)
                .map((group) => group.id);
            filteredEditorEntries.sort((entryA, entryB) => {
                if (entryA.groupId !== entryB.groupId) {
                    return groups.indexOf(entryA.groupId) - groups.indexOf(entryB.groupId); // older groups first
                }
                return compareItemsByFuzzyScore(entryA, entryB, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache);
            });
        }
        // Grouping (for more than one group)
        const filteredEditorEntriesWithSeparators = [];
        if (this.editorGroupService.count > 1) {
            let lastGroupId = undefined;
            for (const entry of filteredEditorEntries) {
                if (typeof lastGroupId !== 'number' || lastGroupId !== entry.groupId) {
                    const group = this.editorGroupService.getGroup(entry.groupId);
                    if (group) {
                        filteredEditorEntriesWithSeparators.push({ type: 'separator', label: group.label });
                    }
                    lastGroupId = entry.groupId;
                }
                filteredEditorEntriesWithSeparators.push(entry);
            }
        }
        else {
            filteredEditorEntriesWithSeparators.push(...filteredEditorEntries);
        }
        return filteredEditorEntriesWithSeparators;
    }
    doGetEditorPickItems() {
        const editors = this.doGetEditors();
        const mapGroupIdToGroupAriaLabel = new Map();
        for (const { groupId } of editors) {
            if (!mapGroupIdToGroupAriaLabel.has(groupId)) {
                const group = this.editorGroupService.getGroup(groupId);
                if (group) {
                    mapGroupIdToGroupAriaLabel.set(groupId, group.ariaLabel);
                }
            }
        }
        return this.doGetEditors().map(({ editor, groupId }) => {
            const resource = EditorResourceAccessor.getOriginalUri(editor, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            });
            const isDirty = editor.isDirty() && !editor.isSaving();
            const description = editor.getDescription();
            const nameAndDescription = description
                ? `${editor.getName()} ${description}`
                : editor.getName();
            return {
                groupId,
                resource,
                label: editor.getName(),
                ariaLabel: (() => {
                    if (mapGroupIdToGroupAriaLabel.size > 1) {
                        return isDirty
                            ? localize('entryAriaLabelWithGroupDirty', '{0}, unsaved changes, {1}', nameAndDescription, mapGroupIdToGroupAriaLabel.get(groupId))
                            : localize('entryAriaLabelWithGroup', '{0}, {1}', nameAndDescription, mapGroupIdToGroupAriaLabel.get(groupId));
                    }
                    return isDirty
                        ? localize('entryAriaLabelDirty', '{0}, unsaved changes', nameAndDescription)
                        : nameAndDescription;
                })(),
                description,
                iconClasses: getIconClasses(this.modelService, this.languageService, resource, undefined, editor.getIcon()).concat(editor.getLabelExtraClasses()),
                italic: !this.editorGroupService.getGroup(groupId)?.isPinned(editor),
                buttons: (() => {
                    return [
                        {
                            iconClass: isDirty
                                ? 'dirty-editor ' + ThemeIcon.asClassName(Codicon.closeDirty)
                                : ThemeIcon.asClassName(Codicon.close),
                            tooltip: localize('closeEditor', 'Close Editor'),
                            alwaysVisible: isDirty,
                        },
                    ];
                })(),
                trigger: async () => {
                    const group = this.editorGroupService.getGroup(groupId);
                    if (group) {
                        await group.closeEditor(editor, { preserveFocus: true });
                        if (!group.contains(editor)) {
                            return TriggerAction.REMOVE_ITEM;
                        }
                    }
                    return TriggerAction.NO_ACTION;
                },
                accept: (keyMods, event) => this.editorGroupService
                    .getGroup(groupId)
                    ?.openEditor(editor, { preserveFocus: event.inBackground }),
            };
        });
    }
};
BaseEditorQuickAccessProvider = __decorate([
    __param(1, IEditorGroupsService),
    __param(2, IEditorService),
    __param(3, IModelService),
    __param(4, ILanguageService)
], BaseEditorQuickAccessProvider);
export { BaseEditorQuickAccessProvider };
//#region Active Editor Group Editors by Most Recently Used
let ActiveGroupEditorsByMostRecentlyUsedQuickAccess = class ActiveGroupEditorsByMostRecentlyUsedQuickAccess extends BaseEditorQuickAccessProvider {
    static { ActiveGroupEditorsByMostRecentlyUsedQuickAccess_1 = this; }
    static { this.PREFIX = 'edt active '; }
    constructor(editorGroupService, editorService, modelService, languageService) {
        super(ActiveGroupEditorsByMostRecentlyUsedQuickAccess_1.PREFIX, editorGroupService, editorService, modelService, languageService);
    }
    doGetEditors() {
        const group = this.editorGroupService.activeGroup;
        return group
            .getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)
            .map((editor) => ({ editor, groupId: group.id }));
    }
};
ActiveGroupEditorsByMostRecentlyUsedQuickAccess = ActiveGroupEditorsByMostRecentlyUsedQuickAccess_1 = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IModelService),
    __param(3, ILanguageService)
], ActiveGroupEditorsByMostRecentlyUsedQuickAccess);
export { ActiveGroupEditorsByMostRecentlyUsedQuickAccess };
//#endregion
//#region All Editors by Appearance
let AllEditorsByAppearanceQuickAccess = class AllEditorsByAppearanceQuickAccess extends BaseEditorQuickAccessProvider {
    static { AllEditorsByAppearanceQuickAccess_1 = this; }
    static { this.PREFIX = 'edt '; }
    constructor(editorGroupService, editorService, modelService, languageService) {
        super(AllEditorsByAppearanceQuickAccess_1.PREFIX, editorGroupService, editorService, modelService, languageService);
    }
    doGetEditors() {
        const entries = [];
        for (const group of this.editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)) {
            for (const editor of group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)) {
                entries.push({ editor, groupId: group.id });
            }
        }
        return entries;
    }
};
AllEditorsByAppearanceQuickAccess = AllEditorsByAppearanceQuickAccess_1 = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IModelService),
    __param(3, ILanguageService)
], AllEditorsByAppearanceQuickAccess);
export { AllEditorsByAppearanceQuickAccess };
//#endregion
//#region All Editors by Most Recently Used
let AllEditorsByMostRecentlyUsedQuickAccess = class AllEditorsByMostRecentlyUsedQuickAccess extends BaseEditorQuickAccessProvider {
    static { AllEditorsByMostRecentlyUsedQuickAccess_1 = this; }
    static { this.PREFIX = 'edt mru '; }
    constructor(editorGroupService, editorService, modelService, languageService) {
        super(AllEditorsByMostRecentlyUsedQuickAccess_1.PREFIX, editorGroupService, editorService, modelService, languageService);
    }
    doGetEditors() {
        const entries = [];
        for (const editor of this.editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
            entries.push(editor);
        }
        return entries;
    }
};
AllEditorsByMostRecentlyUsedQuickAccess = AllEditorsByMostRecentlyUsedQuickAccess_1 = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IModelService),
    __param(3, ILanguageService)
], AllEditorsByMostRecentlyUsedQuickAccess);
export { AllEditorsByMostRecentlyUsedQuickAccess };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLDJCQUEyQixHQUczQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTix5QkFBeUIsRUFFekIsYUFBYSxHQUNiLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFHTixzQkFBc0IsRUFDdEIsZ0JBQWdCLEdBRWhCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLFlBQVksRUFDWixjQUFjLEVBQ2Qsd0JBQXdCLEdBRXhCLE1BQU0sd0NBQXdDLENBQUE7QUFHL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU16RCxJQUFlLDZCQUE2QixHQUE1QyxNQUFlLDZCQUE4QixTQUFRLHlCQUErQztJQWdCMUcsWUFDQyxNQUFjLEVBQ1Esa0JBQTJE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