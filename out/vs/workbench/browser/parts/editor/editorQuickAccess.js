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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTiwyQkFBMkIsR0FHM0IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04seUJBQXlCLEVBRXpCLGFBQWEsR0FDYixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBR04sc0JBQXNCLEVBQ3RCLGdCQUFnQixHQUVoQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixZQUFZLEVBQ1osY0FBYyxFQUNkLHdCQUF3QixHQUV4QixNQUFNLHdDQUF3QyxDQUFBO0FBRy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFNekQsSUFBZSw2QkFBNkIsR0FBNUMsTUFBZSw2QkFBOEIsU0FBUSx5QkFBK0M7SUFnQjFHLFlBQ0MsTUFBYyxFQUNRLGtCQUEyRCxFQUNq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