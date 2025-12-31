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
var AuxiliaryEditorPart_1, AuxiliaryEditorPartImpl_1;
import { onDidChangeFullscreen } from '../../../../base/browser/browser.js';
import { $, hide, show } from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isNative } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { hasCustomTitlebar } from '../../../../platform/window/common/window.js';
import { EditorPart } from './editorPart.js';
import { WindowTitle } from '../titlebar/windowTitle.js';
import { IAuxiliaryWindowService, } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService, shouldShowCustomTitleBar, } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { ITitleService } from '../../../services/title/browser/titleService.js';
let AuxiliaryEditorPart = class AuxiliaryEditorPart {
    static { AuxiliaryEditorPart_1 = this; }
    static { this.STATUS_BAR_VISIBILITY = 'workbench.statusBar.visible'; }
    constructor(editorPartsView, instantiationService, auxiliaryWindowService, lifecycleService, configurationService, statusbarService, titleService, editorService, layoutService) {
        this.editorPartsView = editorPartsView;
        this.instantiationService = instantiationService;
        this.auxiliaryWindowService = auxiliaryWindowService;
        this.lifecycleService = lifecycleService;
        this.configurationService = configurationService;
        this.statusbarService = statusbarService;
        this.titleService = titleService;
        this.editorService = editorService;
        this.layoutService = layoutService;
    }
    async create(label, options) {
        function computeEditorPartHeightOffset() {
            let editorPartHeightOffset = 0;
            if (statusbarVisible) {
                editorPartHeightOffset += statusbarPart.height;
            }
            if (titlebarPart && titlebarVisible) {
                editorPartHeightOffset += titlebarPart.height;
            }
            return editorPartHeightOffset;
        }
        function updateStatusbarVisibility(fromEvent) {
            if (statusbarVisible) {
                show(statusbarPart.container);
            }
            else {
                hide(statusbarPart.container);
            }
            if (fromEvent) {
                auxiliaryWindow.layout();
            }
        }
        function updateTitlebarVisibility(fromEvent) {
            if (!titlebarPart) {
                return;
            }
            if (titlebarVisible) {
                show(titlebarPart.container);
            }
            else {
                hide(titlebarPart.container);
            }
            if (fromEvent) {
                auxiliaryWindow.layout();
            }
        }
        const disposables = new DisposableStore();
        // Auxiliary Window
        const auxiliaryWindow = disposables.add(await this.auxiliaryWindowService.open(options));
        // Editor Part
        const editorPartContainer = $('.part.editor', { role: 'main' });
        editorPartContainer.style.position = 'relative';
        auxiliaryWindow.container.appendChild(editorPartContainer);
        const editorPart = disposables.add(this.instantiationService.createInstance(AuxiliaryEditorPartImpl, auxiliaryWindow.window.vscodeWindowId, this.editorPartsView, options?.state, label));
        disposables.add(this.editorPartsView.registerPart(editorPart));
        editorPart.create(editorPartContainer);
        // Titlebar
        let titlebarPart = undefined;
        let titlebarVisible = false;
        const useCustomTitle = isNative && hasCustomTitlebar(this.configurationService); // custom title in aux windows only enabled in native
        if (useCustomTitle) {
            titlebarPart = disposables.add(this.titleService.createAuxiliaryTitlebarPart(auxiliaryWindow.container, editorPart));
            titlebarVisible = shouldShowCustomTitleBar(this.configurationService, auxiliaryWindow.window, undefined);
            const handleTitleBarVisibilityEvent = () => {
                const oldTitlebarPartVisible = titlebarVisible;
                titlebarVisible = shouldShowCustomTitleBar(this.configurationService, auxiliaryWindow.window, undefined);
                if (oldTitlebarPartVisible !== titlebarVisible) {
                    updateTitlebarVisibility(true);
                }
            };
            disposables.add(titlebarPart.onDidChange(() => auxiliaryWindow.layout()));
            disposables.add(this.layoutService.onDidChangePartVisibility(() => handleTitleBarVisibilityEvent()));
            disposables.add(onDidChangeFullscreen((windowId) => {
                if (windowId !== auxiliaryWindow.window.vscodeWindowId) {
                    return; // ignore all but our window
                }
                handleTitleBarVisibilityEvent();
            }));
            updateTitlebarVisibility(false);
        }
        else {
            disposables.add(this.instantiationService.createInstance(WindowTitle, auxiliaryWindow.window, editorPart));
        }
        // Statusbar
        const statusbarPart = disposables.add(this.statusbarService.createAuxiliaryStatusbarPart(auxiliaryWindow.container));
        let statusbarVisible = this.configurationService.getValue(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY) !==
            false;
        disposables.add(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY)) {
                statusbarVisible =
                    this.configurationService.getValue(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY) !== false;
                updateStatusbarVisibility(true);
            }
        }));
        updateStatusbarVisibility(false);
        // Lifecycle
        const editorCloseListener = disposables.add(Event.once(editorPart.onWillClose)(() => auxiliaryWindow.window.close()));
        disposables.add(Event.once(auxiliaryWindow.onUnload)(() => {
            if (disposables.isDisposed) {
                return; // the close happened as part of an earlier dispose call
            }
            editorCloseListener.dispose();
            editorPart.close();
            disposables.dispose();
        }));
        disposables.add(Event.once(this.lifecycleService.onDidShutdown)(() => disposables.dispose()));
        disposables.add(auxiliaryWindow.onBeforeUnload((event) => {
            for (const group of editorPart.groups) {
                for (const editor of group.editors) {
                    // Closing an auxiliary window with opened editors
                    // will move the editors to the main window. As such,
                    // we need to validate that we can move and otherwise
                    // prevent the window from closing.
                    const canMoveVeto = editor.canMove(group.id, this.editorPartsView.mainPart.activeGroup.id);
                    if (typeof canMoveVeto === 'string') {
                        group.openEditor(editor);
                        event.veto(canMoveVeto);
                        break;
                    }
                }
            }
        }));
        // Layout: specifically `onWillLayout` to have a chance
        // to build the aux editor part before other components
        // have a chance to react.
        disposables.add(auxiliaryWindow.onWillLayout((dimension) => {
            const titlebarPartHeight = titlebarPart?.height ?? 0;
            titlebarPart?.layout(dimension.width, titlebarPartHeight, 0, 0);
            const editorPartHeight = dimension.height - computeEditorPartHeightOffset();
            editorPart.layout(dimension.width, editorPartHeight, titlebarPartHeight, 0);
            statusbarPart.layout(dimension.width, statusbarPart.height, dimension.height - statusbarPart.height, 0);
        }));
        auxiliaryWindow.layout();
        // Have a InstantiationService that is scoped to the auxiliary window
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IStatusbarService, this.statusbarService.createScoped(statusbarPart, disposables)], [IEditorService, this.editorService.createScoped(editorPart, disposables)])));
        return {
            part: editorPart,
            instantiationService,
            disposables,
        };
    }
};
AuxiliaryEditorPart = AuxiliaryEditorPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IAuxiliaryWindowService),
    __param(3, ILifecycleService),
    __param(4, IConfigurationService),
    __param(5, IStatusbarService),
    __param(6, ITitleService),
    __param(7, IEditorService),
    __param(8, IWorkbenchLayoutService)
], AuxiliaryEditorPart);
export { AuxiliaryEditorPart };
let AuxiliaryEditorPartImpl = class AuxiliaryEditorPartImpl extends EditorPart {
    static { AuxiliaryEditorPartImpl_1 = this; }
    static { this.COUNTER = 1; }
    constructor(windowId, editorPartsView, state, groupsLabel, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        const id = AuxiliaryEditorPartImpl_1.COUNTER++;
        super(editorPartsView, `workbench.parts.auxiliaryEditor.${id}`, groupsLabel, windowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService);
        this.state = state;
        this._onWillClose = this._register(new Emitter());
        this.onWillClose = this._onWillClose.event;
    }
    removeGroup(group, preserveFocus) {
        // Close aux window when last group removed
        const groupView = this.assertGroupView(group);
        if (this.count === 1 && this.activeGroup === groupView) {
            this.doRemoveLastGroup(preserveFocus);
        }
        // Otherwise delegate to parent implementation
        else {
            super.removeGroup(group, preserveFocus);
        }
    }
    doRemoveLastGroup(preserveFocus) {
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.container);
        // Activate next group
        const mostRecentlyActiveGroups = this.editorPartsView.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current group we are about to dispose
        if (nextActiveGroup) {
            nextActiveGroup.groupsView.activateGroup(nextActiveGroup);
            if (restoreFocus) {
                nextActiveGroup.focus();
            }
        }
        this.doClose(false /* do not merge any groups to main part */);
    }
    loadState() {
        return this.state;
    }
    saveState() {
        return; // disabled, auxiliary editor part state is tracked outside
    }
    close() {
        return this.doClose(true /* merge all groups to main part */);
    }
    doClose(mergeGroupsToMainPart) {
        let result = true;
        if (mergeGroupsToMainPart) {
            result = this.mergeGroupsToMainPart();
        }
        this._onWillClose.fire();
        return result;
    }
    mergeGroupsToMainPart() {
        if (!this.groups.some((group) => group.count > 0)) {
            return true; // skip if we have no editors opened
        }
        // Find the most recent group that is not locked
        let targetGroup = undefined;
        for (const group of this.editorPartsView.mainPart.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (!group.isLocked) {
                targetGroup = group;
                break;
            }
        }
        if (!targetGroup) {
            targetGroup = this.editorPartsView.mainPart.addGroup(this.editorPartsView.mainPart.activeGroup, this.partOptions.openSideBySideDirection === 'right'
                ? 3 /* GroupDirection.RIGHT */
                : 1 /* GroupDirection.DOWN */);
        }
        const result = this.mergeAllGroups(targetGroup, {
            // Try to reduce the impact of closing the auxiliary window
            // as much as possible by not changing existing editors
            // in the main window.
            preserveExistingIndex: true,
        });
        targetGroup.focus();
        return result;
    }
};
AuxiliaryEditorPartImpl = AuxiliaryEditorPartImpl_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IStorageService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IHostService),
    __param(10, IContextKeyService)
], AuxiliaryEditorPartImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5RWRpdG9yUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9hdXhpbGlhcnlFZGl0b3JQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVoRixPQUFPLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlCQUFpQixDQUFBO0FBRWhFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN4RCxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1B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