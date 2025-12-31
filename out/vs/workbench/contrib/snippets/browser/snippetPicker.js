/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ISnippetsService } from './snippets.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export async function pickSnippet(accessor, languageIdOrSnippets) {
    const snippetService = accessor.get(ISnippetsService);
    const quickInputService = accessor.get(IQuickInputService);
    let snippets;
    if (Array.isArray(languageIdOrSnippets)) {
        snippets = languageIdOrSnippets;
    }
    else {
        snippets = await snippetService.getSnippets(languageIdOrSnippets, {
            includeDisabledSnippets: true,
            includeNoPrefixSnippets: true,
        });
    }
    snippets.sort((a, b) => a.snippetSource - b.snippetSource);
    const makeSnippetPicks = () => {
        const result = [];
        let prevSnippet;
        for (const snippet of snippets) {
            const pick = {
                label: snippet.prefix || snippet.name,
                detail: snippet.description || snippet.body,
                snippet,
            };
            if (!prevSnippet ||
                prevSnippet.snippetSource !== snippet.snippetSource ||
                prevSnippet.source !== snippet.source) {
                let label = '';
                switch (snippet.snippetSource) {
                    case 1 /* SnippetSource.User */:
                        label = nls.localize('sep.userSnippet', 'User Snippets');
                        break;
                    case 3 /* SnippetSource.Extension */:
                        label = snippet.source;
                        break;
                    case 2 /* SnippetSource.Workspace */:
                        label = nls.localize('sep.workspaceSnippet', 'Workspace Snippets');
                        break;
                }
                result.push({ type: 'separator', label });
            }
            if (snippet.snippetSource === 3 /* SnippetSource.Extension */) {
                const isEnabled = snippetService.isEnabled(snippet);
                if (isEnabled) {
                    pick.buttons = [
                        {
                            iconClass: ThemeIcon.asClassName(Codicon.eyeClosed),
                            tooltip: nls.localize('disableSnippet', 'Hide from IntelliSense'),
                        },
                    ];
                }
                else {
                    pick.description = nls.localize('isDisabled', '(hidden from IntelliSense)');
                    pick.buttons = [
                        {
                            iconClass: ThemeIcon.asClassName(Codicon.eye),
                            tooltip: nls.localize('enable.snippet', 'Show in IntelliSense'),
                        },
                    ];
                }
            }
            result.push(pick);
            prevSnippet = snippet;
        }
        return result;
    };
    const disposables = new DisposableStore();
    const picker = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
    picker.placeholder = nls.localize('pick.placeholder', 'Select a snippet');
    picker.matchOnDetail = true;
    picker.ignoreFocusOut = false;
    picker.keepScrollPosition = true;
    disposables.add(picker.onDidTriggerItemButton((ctx) => {
        const isEnabled = snippetService.isEnabled(ctx.item.snippet);
        snippetService.updateEnablement(ctx.item.snippet, !isEnabled);
        picker.items = makeSnippetPicks();
    }));
    picker.items = makeSnippetPicks();
    if (!picker.items.length) {
        picker.validationMessage = nls.localize('pick.noSnippetAvailable', 'No snippet available');
    }
    picker.show();
    // wait for an item to be picked or the picker to become hidden
    await Promise.race([Event.toPromise(picker.onDidAccept), Event.toPromise(picker.onDidHide)]);
    const result = picker.selectedItems[0]?.snippet;
    disposables.dispose();
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvc25pcHBldFBpY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUVoRCxPQUFPLEVBRU4sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE1BQU0sQ0FBQyxLQUFLLFVBQVUsV0FBVyxDQUNoQyxRQUEwQixFQUMxQixvQkFBd0M7SUFFeEMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3JELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBTTFELElBQUksUUFBbUIsQ0FBQTtJQUN2QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1FBQ3pDLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQTtJQUNoQyxDQUFDO1NBQU0sQ0FBQztRQUNQLFFBQVEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUU7WUFDakUsdUJBQXVCLEVBQUUsSUFBSTtZQUM3Qix1QkFBdUIsRUFBRSxJQUFJ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