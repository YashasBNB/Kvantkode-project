/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import * as Constants from '../common/constants.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { category, getSearchView } from './searchActionsBase.js';
import { isWindows } from '../../../../base/common/platform.js';
import { searchMatchComparer } from './searchCompare.js';
import { isSearchTreeMatch, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchWithResource, } from './searchTreeModel/searchTreeCommon.js';
//#region Actions
registerAction2(class CopyMatchCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.copyMatch" /* Constants.SearchCommandIds.CopyMatchCommandId */,
            title: nls.localize2('copyMatchLabel', 'Copy'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: Constants.SearchContext.FileMatchOrMatchFocusKey,
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
            },
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: Constants.SearchContext.FileMatchOrMatchFocusKey,
                    group: 'search_2',
                    order: 1,
                },
            ],
        });
    }
    async run(accessor, match) {
        await copyMatchCommand(accessor, match);
    }
});
registerAction2(class CopyPathCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.copyPath" /* Constants.SearchCommandIds.CopyPathCommandId */,
            title: nls.localize2('copyPathLabel', 'Copy Path'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: Constants.SearchContext.FileMatchOrFolderMatchWithResourceFocusKey,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
                win: {
                    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
                },
            },
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: Constants.SearchContext.FileMatchOrFolderMatchWithResourceFocusKey,
                    group: 'search_2',
                    order: 2,
                },
            ],
        });
    }
    async run(accessor, fileMatch) {
        await copyPathCommand(accessor, fileMatch);
    }
});
registerAction2(class CopyAllCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.copyAll" /* Constants.SearchCommandIds.CopyAllCommandId */,
            title: nls.localize2('copyAllLabel', 'Copy All'),
            category,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: Constants.SearchContext.HasSearchResults,
                    group: 'search_2',
                    order: 3,
                },
            ],
        });
    }
    async run(accessor) {
        await copyAllCommand(accessor);
    }
});
registerAction2(class GetSearchResultsAction extends Action2 {
    constructor() {
        super({
            id: "search.action.getSearchResults" /* Constants.SearchCommandIds.GetSearchResultsActionId */,
            title: nls.localize2('getSearchResultsLabel', 'Get Search Results'),
            category,
            f1: false,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const labelService = accessor.get(ILabelService);
        const searchView = getSearchView(viewsService);
        if (searchView) {
            const root = searchView.searchResult;
            const textSearchResult = allFolderMatchesToString(root.folderMatches(), labelService);
            const aiSearchResult = allFolderMatchesToString(root.folderMatches(true), labelService);
            const text = `${textSearchResult}${lineDelimiter}${lineDelimiter}${aiSearchResult}`;
            return text;
        }
        return undefined;
    }
});
//#endregion
//#region Helpers
export const lineDelimiter = isWindows ? '\r\n' : '\n';
async function copyPathCommand(accessor, fileMatch) {
    if (!fileMatch) {
        const selection = getSelectedRow(accessor);
        if (!isSearchTreeFileMatch(selection) || isSearchTreeFolderMatchWithResource(selection)) {
            return;
        }
        fileMatch = selection;
    }
    const clipboardService = accessor.get(IClipboardService);
    const labelService = accessor.get(ILabelService);
    const text = labelService.getUriLabel(fileMatch.resource, { noPrefix: true });
    await clipboardService.writeText(text);
}
async function copyMatchCommand(accessor, match) {
    if (!match) {
        const selection = getSelectedRow(accessor);
        if (!selection) {
            return;
        }
        match = selection;
    }
    const clipboardService = accessor.get(IClipboardService);
    const labelService = accessor.get(ILabelService);
    let text;
    if (isSearchTreeMatch(match)) {
        text = matchToString(match);
    }
    else if (isSearchTreeFileMatch(match)) {
        text = fileMatchToString(match, labelService).text;
    }
    else if (isSearchTreeFolderMatch(match)) {
        text = folderMatchToString(match, labelService).text;
    }
    if (text) {
        await clipboardService.writeText(text);
    }
}
async function copyAllCommand(accessor) {
    const viewsService = accessor.get(IViewsService);
    const clipboardService = accessor.get(IClipboardService);
    const labelService = accessor.get(ILabelService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        const root = searchView.searchResult;
        const text = allFolderMatchesToString(root.folderMatches(), labelService);
        await clipboardService.writeText(text);
    }
}
function matchToString(match, indent = 0) {
    const getFirstLinePrefix = () => `${match.range().startLineNumber},${match.range().startColumn}`;
    const getOtherLinePrefix = (i) => match.range().startLineNumber + i + '';
    const fullMatchLines = match.fullPreviewLines();
    const largestPrefixSize = fullMatchLines.reduce((largest, _, i) => {
        const thisSize = i === 0 ? getFirstLinePrefix().length : getOtherLinePrefix(i).length;
        return Math.max(thisSize, largest);
    }, 0);
    const formattedLines = fullMatchLines.map((line, i) => {
        const prefix = i === 0 ? getFirstLinePrefix() : getOtherLinePrefix(i);
        const paddingStr = ' '.repeat(largestPrefixSize - prefix.length);
        const indentStr = ' '.repeat(indent);
        return `${indentStr}${prefix}: ${paddingStr}${line}`;
    });
    return formattedLines.join('\n');
}
function fileFolderMatchToString(match, labelService) {
    if (isSearchTreeFileMatch(match)) {
        return fileMatchToString(match, labelService);
    }
    else {
        return folderMatchToString(match, labelService);
    }
}
function fileMatchToString(fileMatch, labelService) {
    const matchTextRows = fileMatch
        .matches()
        .sort(searchMatchComparer)
        .map((match) => matchToString(match, 2));
    const uriString = labelService.getUriLabel(fileMatch.resource, { noPrefix: true });
    return {
        text: `${uriString}${lineDelimiter}${matchTextRows.join(lineDelimiter)}`,
        count: matchTextRows.length,
    };
}
function folderMatchToString(folderMatch, labelService) {
    const results = [];
    let numMatches = 0;
    const matches = folderMatch.matches().sort(searchMatchComparer);
    matches.forEach((match) => {
        const result = fileFolderMatchToString(match, labelService);
        numMatches += result.count;
        results.push(result.text);
    });
    return {
        text: results.join(lineDelimiter + lineDelimiter),
        count: numMatches,
    };
}
function allFolderMatchesToString(folderMatches, labelService) {
    const folderResults = [];
    folderMatches = folderMatches.sort(searchMatchComparer);
    for (let i = 0; i < folderMatches.length; i++) {
        const folderResult = folderMatchToString(folderMatches[i], labelService);
        if (folderResult.count) {
            folderResults.push(folderResult.text);
        }
    }
    return folderResults.join(lineDelimiter + lineDelimiter);
}
function getSelectedRow(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    return searchView?.getControl().getSelection()[0];
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc0NvcHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hBY3Rpb25zQ29weS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxLQUFLLFNBQVMsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUdqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBR04saUJBQWlCLEVBSWpCLHFCQUFxQixFQUNyQix1QkFBdUIsRUFDdkIsbUNBQW1DLEdBQ25DLE1BQU0sdUNBQXVDLENBQUE7QUFFOUMsaUJBQWlCO0FBQ2pCLGVBQWUsQ0FDZCxNQUFNLHNCQUF1QixTQUFRLE9BQU87SUFDM0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLCtFQUErQztZQUNqRCxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUM7WUFDOUMsUUFBUTtZQUNSLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztn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