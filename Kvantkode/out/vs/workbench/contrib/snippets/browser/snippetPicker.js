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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9zbmlwcGV0UGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBRWhELE9BQU8sRUFFTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFdEUsTUFBTSxDQUFDLEtBQUssVUFBVSxXQUFXLENBQ2hDLFFBQTBCLEVBQzFCLG9CQUF3QztJQUV4QyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDckQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFNMUQsSUFBSSxRQUFtQixDQUFBO0lBQ3ZCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7UUFDekMsUUFBUSxHQUFHLG9CQUFvQixDQUFBO0lBQ2hDLENBQUM7U0FBTSxDQUFDO1FBQ1AsUUFBUSxHQUFHLE1BQU0sY0FBYyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRTtZQUNqRSx1QkFBdUIsRUFBRSxJQUFJ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