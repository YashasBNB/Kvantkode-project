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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lkZ2V0TmF2aWdhdGlvbkNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy93aWRnZXROYXZpZ2F0aW9uQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHFDQUFxQyxFQUNyQyxrQ0FBa0MsR0FDbEMsTUFBTSwrQ0FBK0MsQ0FBQTtBQUV0RCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLFlBQVksRUFFWixVQUFVLEdBQ1YsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBMEIvRixTQUFTLHNCQUFzQixDQUM5QixLQUFnQyxFQUNoQyxPQUFtQyxFQUNuQyxpQkFBMEQ7SUFFMUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtJQUN4QyxPQUFPLGtCQUFrQixDQUN4QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FDOUIsa0JBQWtCLENBQ2pCLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ3RCLGlCQUFpQixFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FB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