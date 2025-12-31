/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import * as Constants from '../common/constants.js';
import * as SearchEditorConstants from '../../searchEditor/browser/constants.js';
import { SearchEditorInput } from '../../searchEditor/browser/searchEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ToggleCaseSensitiveKeybinding, TogglePreserveCaseKeybinding, ToggleRegexKeybinding, ToggleWholeWordKeybinding, } from '../../../../editor/contrib/find/browser/findModel.js';
import { category, getSearchView, openSearchView } from './searchActionsBase.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { getActiveElement } from '../../../../base/browser/dom.js';
import { isSearchTreeFolderMatch, } from './searchTreeModel/searchTreeCommon.js';
//#region Actions: Changing Search Input Options
registerAction2(class ToggleQueryDetailsAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.search.toggleQueryDetails" /* Constants.SearchCommandIds.ToggleQueryDetailsActionId */,
            title: nls.localize2('ToggleQueryDetailsAction.label', 'Toggle Query Details'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.or(Constants.SearchContext.SearchViewFocusedKey, SearchEditorConstants.InSearchEditor),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 40 /* KeyCode.KeyJ */,
            },
        });
    }
    run(accessor, ...args) {
        const contextService = accessor.get(IContextKeyService).getContext(getActiveElement());
        if (contextService.getValue(SearchEditorConstants.InSearchEditor.serialize())) {
            ;
            accessor.get(IEditorService).activeEditorPane.toggleQueryDetails(args[0]?.show);
        }
        else if (contextService.getValue(Constants.SearchContext.SearchViewFocusedKey.serialize())) {
            const searchView = getSearchView(accessor.get(IViewsService));
            assertIsDefined(searchView).toggleQueryDetails(undefined, args[0]?.show);
        }
    }
});
registerAction2(class CloseReplaceAction extends Action2 {
    constructor() {
        super({
            id: "closeReplaceInFilesWidget" /* Constants.SearchCommandIds.CloseReplaceWidgetActionId */,
            title: nls.localize2('CloseReplaceWidget.label', 'Close Replace Widget'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceInputBoxFocusedKey),
                primary: 9 /* KeyCode.Escape */,
            },
        });
    }
    run(accessor) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            searchView.searchAndReplaceWidget.toggleReplace(false);
            searchView.searchAndReplaceWidget.focus();
        }
        return Promise.resolve(null);
    }
});
registerAction2(class ToggleCaseSensitiveCommandAction extends Action2 {
    constructor() {
        super({
            id: "toggleSearchCaseSensitive" /* Constants.SearchCommandIds.ToggleCaseSensitiveCommandId */,
            title: nls.localize2('ToggleCaseSensitiveCommandId.label', 'Toggle Case Sensitive'),
            category,
            keybinding: Object.assign({
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: isMacintosh
                    ? ContextKeyExpr.and(Constants.SearchContext.SearchViewFocusedKey, Constants.SearchContext.FileMatchOrFolderMatchFocusKey.toNegated())
                    : Constants.SearchContext.SearchViewFocusedKey,
            }, ToggleCaseSensitiveKeybinding),
        });
    }
    async run(accessor) {
        toggleCaseSensitiveCommand(accessor);
    }
});
registerAction2(class ToggleWholeWordCommandAction extends Action2 {
    constructor() {
        super({
            id: "toggleSearchWholeWord" /* Constants.SearchCommandIds.ToggleWholeWordCommandId */,
            title: nls.localize2('ToggleWholeWordCommandId.label', 'Toggle Whole Word'),
            keybinding: Object.assign({
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: Constants.SearchContext.SearchViewFocusedKey,
            }, ToggleWholeWordKeybinding),
            category,
        });
    }
    async run(accessor) {
        return toggleWholeWordCommand(accessor);
    }
});
registerAction2(class ToggleRegexCommandAction extends Action2 {
    constructor() {
        super({
            id: "toggleSearchRegex" /* Constants.SearchCommandIds.ToggleRegexCommandId */,
            title: nls.localize2('ToggleRegexCommandId.label', 'Toggle Regex'),
            keybinding: Object.assign({
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: Constants.SearchContext.SearchViewFocusedKey,
            }, ToggleRegexKeybinding),
            category,
        });
    }
    async run(accessor) {
        return toggleRegexCommand(accessor);
    }
});
registerAction2(class TogglePreserveCaseAction extends Action2 {
    constructor() {
        super({
            id: "toggleSearchPreserveCase" /* Constants.SearchCommandIds.TogglePreserveCaseId */,
            title: nls.localize2('TogglePreserveCaseId.label', 'Toggle Preserve Case'),
            keybinding: Object.assign({
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: Constants.SearchContext.SearchViewFocusedKey,
            }, TogglePreserveCaseKeybinding),
            category,
        });
    }
    async run(accessor) {
        return togglePreserveCaseCommand(accessor);
    }
});
//#endregion
//#region Actions: Opening Matches
registerAction2(class OpenMatchAction extends Action2 {
    constructor() {
        super({
            id: "search.action.openResult" /* Constants.SearchCommandIds.OpenMatch */,
            title: nls.localize2('OpenMatch.label', 'Open Match'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.FileMatchOrMatchFocusKey),
                primary: 3 /* KeyCode.Enter */,
                mac: {
                    primary: 3 /* KeyCode.Enter */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
                },
            },
        });
    }
    run(accessor) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            const tree = searchView.getControl();
            const viewer = searchView.getControl();
            const focus = tree.getFocus()[0];
            if (isSearchTreeFolderMatch(focus)) {
                viewer.toggleCollapsed(focus);
            }
            else {
                searchView.open(tree.getFocus()[0], false, false, true);
            }
        }
    }
});
registerAction2(class OpenMatchToSideAction extends Action2 {
    constructor() {
        super({
            id: "search.action.openResultToSide" /* Constants.SearchCommandIds.OpenMatchToSide */,
            title: nls.localize2('OpenMatchToSide.label', 'Open Match To Side'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.FileMatchOrMatchFocusKey),
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
                },
            },
        });
    }
    run(accessor) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            const tree = searchView.getControl();
            searchView.open(tree.getFocus()[0], false, true, true);
        }
    }
});
registerAction2(class AddCursorsAtSearchResultsAction extends Action2 {
    constructor() {
        super({
            id: "addCursorsAtSearchResults" /* Constants.SearchCommandIds.AddCursorsAtSearchResults */,
            title: nls.localize2('AddCursorsAtSearchResults.label', 'Add Cursors at Search Results'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.FileMatchOrMatchFocusKey),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
            },
            category,
        });
    }
    async run(accessor) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            const tree = searchView.getControl();
            searchView.openEditorWithMultiCursor(tree.getFocus()[0]);
        }
    }
});
//#endregion
//#region Actions: Toggling Focus
registerAction2(class FocusNextInputAction extends Action2 {
    constructor() {
        super({
            id: "search.focus.nextInputBox" /* Constants.SearchCommandIds.FocusNextInputActionId */,
            title: nls.localize2('FocusNextInputAction.label', 'Focus Next Input'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.or(ContextKeyExpr.and(SearchEditorConstants.InSearchEditor, Constants.SearchContext.InputBoxFocusedKey), ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.InputBoxFocusedKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const input = editorService.activeEditor;
        if (input instanceof SearchEditorInput) {
            // cast as we cannot import SearchEditor as a value b/c cyclic dependency.
            ;
            editorService.activeEditorPane.focusNextInput();
        }
        const searchView = getSearchView(accessor.get(IViewsService));
        searchView?.focusNextInputBox();
    }
});
registerAction2(class FocusPreviousInputAction extends Action2 {
    constructor() {
        super({
            id: "search.focus.previousInputBox" /* Constants.SearchCommandIds.FocusPreviousInputActionId */,
            title: nls.localize2('FocusPreviousInputAction.label', 'Focus Previous Input'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.or(ContextKeyExpr.and(SearchEditorConstants.InSearchEditor, Constants.SearchContext.InputBoxFocusedKey), ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.InputBoxFocusedKey, Constants.SearchContext.SearchInputBoxFocusedKey.toNegated())),
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const input = editorService.activeEditor;
        if (input instanceof SearchEditorInput) {
            // cast as we cannot import SearchEditor as a value b/c cyclic dependency.
            ;
            editorService.activeEditorPane.focusPrevInput();
        }
        const searchView = getSearchView(accessor.get(IViewsService));
        searchView?.focusPreviousInputBox();
    }
});
registerAction2(class FocusSearchFromResultsAction extends Action2 {
    constructor() {
        super({
            id: "search.action.focusSearchFromResults" /* Constants.SearchCommandIds.FocusSearchFromResults */,
            title: nls.localize2('FocusSearchFromResults.label', 'Focus Search From Results'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, ContextKeyExpr.or(Constants.SearchContext.FirstMatchFocusKey, CONTEXT_ACCESSIBILITY_MODE_ENABLED)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
            },
        });
    }
    run(accessor) {
        const searchView = getSearchView(accessor.get(IViewsService));
        searchView?.focusPreviousInputBox();
    }
});
registerAction2(class ToggleSearchOnTypeAction extends Action2 {
    static { this.searchOnTypeKey = 'search.searchOnType'; }
    constructor() {
        super({
            id: "workbench.action.toggleSearchOnType" /* Constants.SearchCommandIds.ToggleSearchOnTypeActionId */,
            title: nls.localize2('toggleTabs', 'Toggle Search on Type'),
            category,
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const searchOnType = configurationService.getValue(ToggleSearchOnTypeAction.searchOnTypeKey);
        return configurationService.updateValue(ToggleSearchOnTypeAction.searchOnTypeKey, !searchOnType);
    }
});
registerAction2(class FocusSearchListCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.focusSearchList" /* Constants.SearchCommandIds.FocusSearchListCommandID */,
            title: nls.localize2('focusSearchListCommandLabel', 'Focus List'),
            category,
            f1: true,
        });
    }
    async run(accessor) {
        focusSearchListCommand(accessor);
    }
});
registerAction2(class FocusNextSearchResultAction extends Action2 {
    constructor() {
        super({
            id: "search.action.focusNextSearchResult" /* Constants.SearchCommandIds.FocusNextSearchResultActionId */,
            title: nls.localize2('FocusNextSearchResult.label', 'Focus Next Search Result'),
            keybinding: [
                {
                    primary: 62 /* KeyCode.F4 */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
            category,
            f1: true,
            precondition: ContextKeyExpr.or(Constants.SearchContext.HasSearchResults, SearchEditorConstants.InSearchEditor),
        });
    }
    async run(accessor) {
        return await focusNextSearchResult(accessor);
    }
});
registerAction2(class FocusPreviousSearchResultAction extends Action2 {
    constructor() {
        super({
            id: "search.action.focusPreviousSearchResult" /* Constants.SearchCommandIds.FocusPreviousSearchResultActionId */,
            title: nls.localize2('FocusPreviousSearchResult.label', 'Focus Previous Search Result'),
            keybinding: [
                {
                    primary: 1024 /* KeyMod.Shift */ | 62 /* KeyCode.F4 */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
            category,
            f1: true,
            precondition: ContextKeyExpr.or(Constants.SearchContext.HasSearchResults, SearchEditorConstants.InSearchEditor),
        });
    }
    async run(accessor) {
        return await focusPreviousSearchResult(accessor);
    }
});
registerAction2(class ReplaceInFilesAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.replaceInFiles" /* Constants.SearchCommandIds.ReplaceInFilesActionId */,
            title: nls.localize2('replaceInFiles', 'Replace in Files'),
            keybinding: [
                {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 38 /* KeyCode.KeyH */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
            category,
            f1: true,
            menu: [
                {
                    id: MenuId.MenubarEditMenu,
                    group: '4_find_global',
                    order: 2,
                },
            ],
        });
    }
    async run(accessor) {
        return await findOrReplaceInFiles(accessor, true);
    }
});
//#endregion
//#region Helpers
function toggleCaseSensitiveCommand(accessor) {
    const searchView = getSearchView(accessor.get(IViewsService));
    searchView?.toggleCaseSensitive();
}
function toggleWholeWordCommand(accessor) {
    const searchView = getSearchView(accessor.get(IViewsService));
    searchView?.toggleWholeWords();
}
function toggleRegexCommand(accessor) {
    const searchView = getSearchView(accessor.get(IViewsService));
    searchView?.toggleRegex();
}
function togglePreserveCaseCommand(accessor) {
    const searchView = getSearchView(accessor.get(IViewsService));
    searchView?.togglePreserveCase();
}
const focusSearchListCommand = (accessor) => {
    const viewsService = accessor.get(IViewsService);
    openSearchView(viewsService).then((searchView) => {
        searchView?.moveFocusToResults();
    });
};
async function focusNextSearchResult(accessor) {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        // cast as we cannot import SearchEditor as a value b/c cyclic dependency.
        return editorService.activeEditorPane.focusNextResult();
    }
    return openSearchView(accessor.get(IViewsService)).then((searchView) => searchView?.selectNextMatch());
}
async function focusPreviousSearchResult(accessor) {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        // cast as we cannot import SearchEditor as a value b/c cyclic dependency.
        return editorService.activeEditorPane.focusPreviousResult();
    }
    return openSearchView(accessor.get(IViewsService)).then((searchView) => searchView?.selectPreviousMatch());
}
async function findOrReplaceInFiles(accessor, expandSearchReplaceWidget) {
    return openSearchView(accessor.get(IViewsService), false).then((openedView) => {
        if (openedView) {
            const searchAndReplaceWidget = openedView.searchAndReplaceWidget;
            searchAndReplaceWidget.toggleReplace(expandSearchReplaceWidget);
            const updatedText = openedView.updateTextFromFindWidgetOrSelection({
                allowUnselectedWord: !expandSearchReplaceWidget,
            });
            openedView.searchAndReplaceWidget.focus(undefined, updatedText, updatedText);
        }
    });
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc05hdi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaEFjdGlvbnNOYXYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0JBQXdCLENBQUE7QUFDbkQsT0FBTyxLQUFLLHFCQUFxQixNQUFNLHlDQUF5QyxDQUFBO0FBRWhGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUdqRyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDRCQUE0QixFQUM1QixxQkFBcUIsRUFDckIseUJBQXlCLEdBQ3pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDaEYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sNERBQTRELENBQUE7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