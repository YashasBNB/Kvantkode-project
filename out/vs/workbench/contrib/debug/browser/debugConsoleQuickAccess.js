var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { PickerQuickAccessProvider, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { DEBUG_CONSOLE_QUICK_ACCESS_PREFIX, SELECT_AND_START_ID } from './debugCommands.js';
import { IDebugService, REPL_VIEW_ID } from '../common/debug.js';
let DebugConsoleQuickAccess = class DebugConsoleQuickAccess extends PickerQuickAccessProvider {
    constructor(_debugService, _viewsService, _commandService) {
        super(DEBUG_CONSOLE_QUICK_ACCESS_PREFIX, { canAcceptInBackground: true });
        this._debugService = _debugService;
        this._viewsService = _viewsService;
        this._commandService = _commandService;
    }
    _getPicks(filter, disposables, token) {
        const debugConsolePicks = [];
        this._debugService
            .getModel()
            .getSessions(true)
            .filter((s) => s.hasSeparateRepl())
            .forEach((session, index) => {
            const pick = this._createPick(session, index, filter);
            if (pick) {
                debugConsolePicks.push(pick);
            }
        });
        if (debugConsolePicks.length > 0) {
            debugConsolePicks.push({ type: 'separator' });
        }
        const createTerminalLabel = localize('workbench.action.debug.startDebug', 'Start a New Debug Session');
        debugConsolePicks.push({
            label: `$(plus) ${createTerminalLabel}`,
            ariaLabel: createTerminalLabel,
            accept: () => this._commandService.executeCommand(SELECT_AND_START_ID),
        });
        return debugConsolePicks;
    }
    _createPick(session, sessionIndex, filter) {
        const label = session.name;
        const highlights = matchesFuzzy(filter, label, true);
        if (highlights) {
            return {
                label,
                highlights: { label: highlights },
                accept: (keyMod, event) => {
                    this._debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
                    if (!this._viewsService.isViewVisible(REPL_VIEW_ID)) {
                        this._viewsService.openView(REPL_VIEW_ID, true);
                    }
                },
            };
        }
        return undefined;
    }
};
DebugConsoleQuickAccess = __decorate([
    __param(0, IDebugService),
    __param(1, IViewsService),
    __param(2, ICommandService)
], DebugConsoleQuickAccess);
export { DebugConsoleQuickAccess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb25zb2xlUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnQ29uc29sZVF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUtBLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFHTix5QkFBeUIsR0FFekIsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDM0YsT0FBTyxFQUFFLGFBQWEsRUFBaUIsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFeEUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSx5QkFBaUQ7SUFDN0YsWUFDaUMsYUFBNEIsRUFDNUIsYUFBNEIsRUFDMUIsZUFBZ0M7UUFFbEUsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUp6QyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUM1QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUMxQixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7SUFHbkUsQ0FBQztJQUVTLFNBQVMsQ0FDbEIsTUFBYyxFQUNkLFdBQTRCLEVBQzVCLEtBQXdCO1FBTXhCLE1BQU0saUJBQWlCLEdBQXdELEVBQUUsQ0FBQTtRQUVqRixJQUFJLENBQUMsYUFBYTthQUNoQixRQUFRLEVBQUU7YUFDVixXQUFXLENBQUMsSUFBSSxDQUFDO2FBQ2pCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2FBQ2xDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDckQsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUgsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUNuQyxtQ0FBbUMsRUFDbkMsMkJBQTJCLENBQzNCLENBQUE7UUFDRCxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7WUFDdEIsS0FBSyxFQUFFLFdBQVcsbUJBQW1CLEVBQUU7WUFDdkMsU0FBUyxFQUFFLG1CQUFtQjtZQUM5QixNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUM7U0FDdEUsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxpQkFBaUIsQ0FBQTtJQUN6QixDQUFDO0lBRU8sV0FBVyxDQUNsQixPQUFzQixFQUN0QixZQUFvQixFQUNwQixNQUFjO1FBRWQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUUxQixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ04sS0FBSztnQkFDTCxVQUFVLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFO2dCQUNqQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7b0JBQ3pCLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7b0JBQ3JGLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO3dCQUNyRCxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ2hELENBQUM7Z0JBQ0YsQ0FBQzthQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNELENBQUE7QUFyRVksdUJBQXVCO0lBRWpDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGVBQWUsQ0FBQTtHQUpMLHVCQUF1QixDQXFFbkMifQ==