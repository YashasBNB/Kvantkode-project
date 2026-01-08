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
var NavigableContainerManager_1;
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { WorkbenchListFocusContextKey, WorkbenchListScrollAtBottomContextKey, WorkbenchListScrollAtTopContextKey, } from '../../../platform/list/browser/listService.js';
import { combinedDisposable, toDisposable, Disposable, } from '../../../base/common/lifecycle.js';
import { registerWorkbenchContribution2 } from '../../common/contributions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
function handleFocusEventsGroup(group, handler, onPartFocusChange) {
    const focusedIndices = new Set();
    return combinedDisposable(...group.map((events, index) => combinedDisposable(events.onDidFocus(() => {
        onPartFocusChange?.(index, 'focus');
        if (!focusedIndices.size) {
            handler(true);
        }
        focusedIndices.add(index);
    }), events.onDidBlur(() => {
        onPartFocusChange?.(index, 'blur');
        focusedIndices.delete(index);
        if (!focusedIndices.size) {
            handler(false);
        }
    }))));
}
const NavigableContainerFocusedContextKey = new RawContextKey('navigableContainerFocused', false);
let NavigableContainerManager = class NavigableContainerManager {
    static { NavigableContainerManager_1 = this; }
    static { this.ID = 'workbench.contrib.navigableContainerManager'; }
    constructor(contextKeyService, logService, configurationService) {
        this.logService = logService;
        this.configurationService = configurationService;
        this.containers = new Set();
        this.focused = NavigableContainerFocusedContextKey.bindTo(contextKeyService);
        NavigableContainerManager_1.INSTANCE = this;
    }
    dispose() {
        this.containers.clear();
        this.focused.reset();
        NavigableContainerManager_1.INSTANCE = undefined;
    }
    get debugEnabled() {
        return this.configurationService.getValue('workbench.navigibleContainer.enableDebug');
    }
    log(msg, ...args) {
        if (this.debugEnabled) {
            this.logService.debug(msg, ...args);
        }
    }
    static register(container) {
        const instance = this.INSTANCE;
        if (!instance) {
            return Disposable.None;
        }
        instance.containers.add(container);
        instance.log('NavigableContainerManager.register', container.name);
        return combinedDisposable(handleFocusEventsGroup(container.focusNotifiers, (isFocus) => {
            if (isFocus) {
                instance.log('NavigableContainerManager.focus', container.name);
                instance.focused.set(true);
                instance.lastContainer = container;
            }
            else {
                instance.log('NavigableContainerManager.blur', container.name, instance.lastContainer?.name);
                if (instance.lastContainer === container) {
                    instance.focused.set(false);
                    instance.lastContainer = undefined;
                }
            }
        }, (index, event) => {
            instance.log('NavigableContainerManager.partFocusChange', container.name, index, event);
        }), toDisposable(() => {
            instance.containers.delete(container);
            instance.log('NavigableContainerManager.unregister', container.name, instance.lastContainer?.name);
            if (instance.lastContainer === container) {
                instance.focused.set(false);
                instance.lastContainer = undefined;
            }
        }));
    }
    static getActive() {
        return this.INSTANCE?.lastContainer;
    }
};
NavigableContainerManager = NavigableContainerManager_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILogService),
    __param(2, IConfigurationService)
], NavigableContainerManager);
export function registerNavigableContainer(container) {
    return NavigableContainerManager.register(container);
}
registerWorkbenchContribution2(NavigableContainerManager.ID, NavigableContainerManager, 1 /* WorkbenchPhase.BlockStartup */);
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'widgetNavigation.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(NavigableContainerFocusedContextKey, ContextKeyExpr.or(WorkbenchListFocusContextKey?.negate(), WorkbenchListScrollAtTopContextKey)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
    handler: () => {
        const activeContainer = NavigableContainerManager.getActive();
        activeContainer?.focusPreviousWidget();
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'widgetNavigation.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(NavigableContainerFocusedContextKey, ContextKeyExpr.or(WorkbenchListFocusContextKey?.negate(), WorkbenchListScrollAtBottomContextKey)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
    handler: () => {
        const activeContainer = NavigableContainerManager.getActive();
        activeContainer?.focusNextWidget();
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lkZ2V0TmF2aWdhdGlvbkNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL3dpZGdldE5hdmlnYXRpb25Db21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUVOLG1CQUFtQixHQUNuQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIscUNBQXFDLEVBQ3JDLGtDQUFrQyxHQUNsQyxNQUFNLCtDQUErQyxDQUFBO0FBRXRELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsWUFBWSxFQUVaLFVBQVUsR0FDVixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUEwQi9GLFNBQVMsc0JBQXNCLENBQzlCLEtBQWdDLEVBQ2hDLE9BQW1DLEVBQ25DLGlCQUEwRDtJQUUxRCxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO0lBQ3hDLE9BQU8sa0JBQWtCLENBQ3hCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUM5QixrQkFBa0IsQ0FDakIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDdEIsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbkMsSUFB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