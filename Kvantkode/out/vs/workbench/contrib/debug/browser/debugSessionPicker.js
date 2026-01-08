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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uUGlja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnU2Vzc2lvblBpY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBaUIsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDL0UsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBSTdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFbEYsTUFBTSxDQUFDLEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxRQUEwQixFQUFFLGdCQUF3QjtJQUM5RixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUMxRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2hELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDaEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUVwRCxNQUFNLG9CQUFvQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDbEQsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsZUFBZSxDQUFtQixF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