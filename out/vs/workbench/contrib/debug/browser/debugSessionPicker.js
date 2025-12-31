/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IDebugService, REPL_VIEW_ID } from '../common/debug.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
export async function showDebugSessionMenu(accessor, selectAndStartID) {
    const quickInputService = accessor.get(IQuickInputService);
    const debugService = accessor.get(IDebugService);
    const viewsService = accessor.get(IViewsService);
    const commandService = accessor.get(ICommandService);
    const localDisposableStore = new DisposableStore();
    const quickPick = quickInputService.createQuickPick({ useSeparators: true });
    localDisposableStore.add(quickPick);
    quickPick.matchOnLabel =
        quickPick.matchOnDescription =
            quickPick.matchOnDetail =
                quickPick.sortByLabel =
                    false;
    quickPick.placeholder = nls.localize('moveFocusedView.selectView', 'Search debug sessions by name');
    const pickItems = _getPicksAndActiveItem(quickPick.value, selectAndStartID, debugService, viewsService, commandService);
    quickPick.items = pickItems.picks;
    quickPick.activeItems = pickItems.activeItems;
    localDisposableStore.add(quickPick.onDidChangeValue(async () => {
        quickPick.items = _getPicksAndActiveItem(quickPick.value, selectAndStartID, debugService, viewsService, commandService).picks;
    }));
    localDisposableStore.add(quickPick.onDidAccept(() => {
        const selectedItem = quickPick.selectedItems[0];
        selectedItem.accept();
        quickPick.hide();
        localDisposableStore.dispose();
    }));
    quickPick.show();
}
function _getPicksAndActiveItem(filter, selectAndStartID, debugService, viewsService, commandService) {
    const debugConsolePicks = [];
    const headerSessions = [];
    const currSession = debugService.getViewModel().focusedSession;
    const sessions = debugService.getModel().getSessions(false);
    const activeItems = [];
    sessions.forEach((session) => {
        if (session.compact && session.parentSession) {
            headerSessions.push(session.parentSession);
        }
    });
    sessions.forEach((session) => {
        const isHeader = headerSessions.includes(session);
        if (!session.parentSession) {
            debugConsolePicks.push({ type: 'separator', label: isHeader ? session.name : undefined });
        }
        if (!isHeader) {
            const pick = _createPick(session, filter, debugService, viewsService, commandService);
            if (pick) {
                debugConsolePicks.push(pick);
                if (session.getId() === currSession?.getId()) {
                    activeItems.push(pick);
                }
            }
        }
    });
    if (debugConsolePicks.length) {
        debugConsolePicks.push({ type: 'separator' });
    }
    const createDebugSessionLabel = nls.localize('workbench.action.debug.startDebug', 'Start a New Debug Session');
    debugConsolePicks.push({
        label: `$(plus) ${createDebugSessionLabel}`,
        ariaLabel: createDebugSessionLabel,
        accept: () => commandService.executeCommand(selectAndStartID),
    });
    return { picks: debugConsolePicks, activeItems };
}
function _getSessionInfo(session) {
    const label = !session.configuration.name.length ? session.name : session.configuration.name;
    const parentName = session.compact ? undefined : session.parentSession?.configuration.name;
    let description = '';
    let ariaLabel = '';
    if (parentName) {
        ariaLabel = nls.localize('workbench.action.debug.spawnFrom', 'Session {0} spawned from {1}', label, parentName);
        description = parentName;
    }
    return { label, description, ariaLabel };
}
function _createPick(session, filter, debugService, viewsService, commandService) {
    const pickInfo = _getSessionInfo(session);
    const highlights = matchesFuzzy(filter, pickInfo.label, true);
    if (highlights) {
        return {
            label: pickInfo.label,
            description: pickInfo.description,
            ariaLabel: pickInfo.ariaLabel,
            highlights: { label: highlights },
            accept: () => {
                debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
                if (!viewsService.isViewVisible(REPL_VIEW_ID)) {
                    viewsService.openView(REPL_VIEW_ID, true);
                }
            },
        };
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uUGlja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1Nlc3Npb25QaWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQWlCLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQy9FLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUk3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWxGLE1BQU0sQ0FBQyxLQUFLLFVBQVUsb0JBQW9CLENBQUMsUUFBMEIsRUFBRSxnQkFBd0I7SUFDOUYsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDMUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNoRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2hELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7SUFFcEQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ2xELE1BQU0sU0FBUyxHQUFHLGlCQUFpQixDQUFDLGVBQWUsQ0FBbUIsRUFBRSxh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