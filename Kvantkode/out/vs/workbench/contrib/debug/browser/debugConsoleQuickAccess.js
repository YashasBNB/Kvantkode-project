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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb25zb2xlUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdDb25zb2xlUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBS0EsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUdOLHlCQUF5QixHQUV6QixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzRixPQUFPLEVBQUUsYUFBYSxFQUFpQixZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLHlCQUFpRDtJQUM3RixZQUNpQyxhQUE0QixFQUM1QixhQUE0QixFQUMxQixlQUFnQztRQUVsRSxLQUFLLENBQUMsaUNBQWlDLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBSnpDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQzVCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQzFCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtJQUduRSxDQUFDO0lBRVMsU0FBUyxDQUNsQixNQUFjLEVBQ2QsV0FBNEIsRUFDNUIsS0FBd0I7UUFNeEIsTUFBTSxpQkFBaUIsR0FBd0QsRUFBRSxDQUFBO1FBRWpGLElBQUksQ0FBQyxhQUFhO2FBQ2hCLFFBQVEsRUFBRTthQUNWLFdBQVcsQ0FBQyxJQUFJLENBQUM7YUFDakIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7YUFDbEMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzNCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNyRCxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFSCxJQUFJLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQ25DLG1DQUFtQyxFQUNuQywyQkFBMkIsQ0FDM0IsQ0FBQTtRQUNELGlCQUFpQixDQUFDLElBQUksQ0FBQztZQUN0QixLQUFLLEVBQUUsV0FBVyxtQkFBbUIsRUFBRTtZQUN2QyxTQUFTLEVBQUUsbUJBQW1CO1lBQzlCLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQztTQUN0RSxDQUFDLENBQUE7UUFDRixPQUFPLGlCQUFpQixDQUFBO0lBQ3pCLENBQUM7SUFFTyxXQUFXLENBQ2xCLE9BQXNCLEVBQ3RCLFlBQW9CLEVBQ3BCLE1BQWM7UUFFZCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBRTFCLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BELElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTixLQUFLO2dCQUNMLFVBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUU7Z0JBQ2pDLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDekIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtvQkFDckYsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7d0JBQ3JELElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtvQkFDaEQsQ0FBQztnQkFDRixDQUFDO2FBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBQ0QsQ0FBQTtBQXJFWSx1QkFBdUI7SUFFakMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0dBSkwsdUJBQXVCLENBcUVuQyJ9