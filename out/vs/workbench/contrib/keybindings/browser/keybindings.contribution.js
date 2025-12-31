/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { showWindowLogActionId } from '../../../services/log/common/logConstants.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { $, append, getDomNodePagePosition, getWindows, onDidRegisterWindow, } from '../../../../base/browser/dom.js';
import { createCSSRule, createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { Emitter } from '../../../../base/common/event.js';
import { DomEmitter } from '../../../../base/browser/event.js';
class ToggleKeybindingsLogAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleKeybindingsLog',
            title: nls.localize2('toggleKeybindingsLog', 'Toggle Keyboard Shortcuts Troubleshooting'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        const logging = accessor.get(IKeybindingService).toggleLogging();
        if (logging) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(showWindowLogActionId);
        }
        if (ToggleKeybindingsLogAction.disposable) {
            ToggleKeybindingsLogAction.disposable.dispose();
            ToggleKeybindingsLogAction.disposable = undefined;
            return;
        }
        const layoutService = accessor.get(ILayoutService);
        const disposables = new DisposableStore();
        const container = layoutService.activeContainer;
        const focusMarker = append(container, $('.focus-troubleshooting-marker'));
        disposables.add(toDisposable(() => focusMarker.remove()));
        // Add CSS rule for focus marker
        const stylesheet = createStyleSheet(undefined, undefined, disposables);
        createCSSRule('.focus-troubleshooting-marker', `
			position: fixed;
			pointer-events: none;
			z-index: 100000;
			background-color: rgba(255, 0, 0, 0.2);
			border: 2px solid rgba(255, 0, 0, 0.8);
			border-radius: 2px;
			display: none;
		`, stylesheet);
        const onKeyDown = disposables.add(new Emitter());
        function registerWindowListeners(window, disposables) {
            disposables.add(disposables.add(new DomEmitter(window, 'keydown', true)).event((e) => onKeyDown.fire(e)));
        }
        for (const { window, disposables } of getWindows()) {
            registerWindowListeners(window, disposables);
        }
        disposables.add(onDidRegisterWindow(({ window, disposables }) => registerWindowListeners(window, disposables)));
        disposables.add(layoutService.onDidChangeActiveContainer(() => {
            layoutService.activeContainer.appendChild(focusMarker);
        }));
        disposables.add(onKeyDown.event((e) => {
            const target = e.target;
            if (target) {
                const position = getDomNodePagePosition(target);
                focusMarker.style.top = `${position.top}px`;
                focusMarker.style.left = `${position.left}px`;
                focusMarker.style.width = `${position.width}px`;
                focusMarker.style.height = `${position.height}px`;
                focusMarker.style.display = 'block';
                // Hide after timeout
                setTimeout(() => {
                    focusMarker.style.display = 'none';
                }, 800);
            }
        }));
        ToggleKeybindingsLogAction.disposable = disposables;
    }
}
registerAction2(ToggleKeybindingsLogAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIva2V5YmluZGluZ3MvYnJvd3Nlci9rZXliaW5kaW5ncy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLENBQUMsRUFDRCxNQUFNLEVBQ04sc0JBQXNCLEVBQ3RCLFVBQVUsRUFDVixtQkFBbUIsR0FDbkIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxNQUFNLDBCQUEyQixTQUFRLE9BQU87SUFHL0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsdUNBQXVDO1lBQzND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