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
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { SideBySideEditor } from '../../../browser/parts/editor/sideBySideEditor.js';
import { isEditorPaneWithScrolling, } from '../../../common/editor.js';
import { ReentrancyBarrier } from '../../../../base/common/controlFlow.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
let SyncScroll = class SyncScroll extends Disposable {
    static { this.ID = 'workbench.contrib.syncScrolling'; }
    constructor(editorService, statusbarService) {
        super();
        this.editorService = editorService;
        this.statusbarService = statusbarService;
        this.paneInitialScrollTop = new Map();
        this.syncScrollDispoasbles = this._register(new DisposableStore());
        this.paneDisposables = new DisposableStore();
        this.statusBarEntry = this._register(new MutableDisposable());
        this.isActive = false;
        // makes sure that the onDidEditorPaneScroll is not called multiple times for the same event
        this._reentrancyBarrier = new ReentrancyBarrier();
        this.registerActions();
    }
    registerActiveListeners() {
        this.syncScrollDispoasbles.add(this.editorService.onDidVisibleEditorsChange(() => this.trackVisiblePanes()));
    }
    activate() {
        this.registerActiveListeners();
        this.trackVisiblePanes();
    }
    toggle() {
        if (this.isActive) {
            this.deactivate();
        }
        else {
            this.activate();
        }
        this.isActive = !this.isActive;
        this.toggleStatusbarItem(this.isActive);
    }
    trackVisiblePanes() {
        this.paneDisposables.clear();
        this.paneInitialScrollTop.clear();
        for (const pane of this.getAllVisiblePanes()) {
            if (!isEditorPaneWithScrolling(pane)) {
                continue;
            }
            this.paneInitialScrollTop.set(pane, pane.getScrollPosition());
            this.paneDisposables.add(pane.onDidChangeScroll(() => this._reentrancyBarrier.runExclusivelyOrSkip(() => {
                this.onDidEditorPaneScroll(pane);
            })));
        }
    }
    onDidEditorPaneScroll(scrolledPane) {
        const scrolledPaneInitialOffset = this.paneInitialScrollTop.get(scrolledPane);
        if (scrolledPaneInitialOffset === undefined) {
            throw new Error('Scrolled pane not tracked');
        }
        if (!isEditorPaneWithScrolling(scrolledPane)) {
            throw new Error('Scrolled pane does not support scrolling');
        }
        const scrolledPaneCurrentPosition = scrolledPane.getScrollPosition();
        const scrolledFromInitial = {
            scrollTop: scrolledPaneCurrentPosition.scrollTop - scrolledPaneInitialOffset.scrollTop,
            scrollLeft: scrolledPaneCurrentPosition.scrollLeft !== undefined &&
                scrolledPaneInitialOffset.scrollLeft !== undefined
                ? scrolledPaneCurrentPosition.scrollLeft - scrolledPaneInitialOffset.scrollLeft
                : undefined,
        };
        for (const pane of this.getAllVisiblePanes()) {
            if (pane === scrolledPane) {
                continue;
            }
            if (!isEditorPaneWithScrolling(pane)) {
                continue;
            }
            const initialOffset = this.paneInitialScrollTop.get(pane);
            if (initialOffset === undefined) {
                throw new Error('Could not find initial offset for pane');
            }
            const currentPanePosition = pane.getScrollPosition();
            const newPaneScrollPosition = {
                scrollTop: initialOffset.scrollTop + scrolledFromInitial.scrollTop,
                scrollLeft: initialOffset.scrollLeft !== undefined && scrolledFromInitial.scrollLeft !== undefined
                    ? initialOffset.scrollLeft + scrolledFromInitial.scrollLeft
                    : undefined,
            };
            if (currentPanePosition.scrollTop === newPaneScrollPosition.scrollTop &&
                currentPanePosition.scrollLeft === newPaneScrollPosition.scrollLeft) {
                continue;
            }
            pane.setScrollPosition(newPaneScrollPosition);
        }
    }
    getAllVisiblePanes() {
        const panes = [];
        for (const pane of this.editorService.visibleEditorPanes) {
            if (pane instanceof SideBySideEditor) {
                const primaryPane = pane.getPrimaryEditorPane();
                const secondaryPane = pane.getSecondaryEditorPane();
                if (primaryPane) {
                    panes.push(primaryPane);
                }
                if (secondaryPane) {
                    panes.push(secondaryPane);
                }
                continue;
            }
            panes.push(pane);
        }
        return panes;
    }
    deactivate() {
        this.paneDisposables.clear();
        this.syncScrollDispoasbles.clear();
        this.paneInitialScrollTop.clear();
    }
    // Actions & Commands
    toggleStatusbarItem(active) {
        if (active) {
            if (!this.statusBarEntry.value) {
                const text = localize('mouseScrolllingLocked', 'Scrolling Locked');
                const tooltip = localize('mouseLockScrollingEnabled', 'Lock Scrolling Enabled');
                this.statusBarEntry.value = this.statusbarService.addEntry({
                    name: text,
                    text,
                    tooltip,
                    ariaLabel: text,
                    command: {
                        id: 'workbench.action.toggleLockedScrolling',
                        title: '',
                    },
                    kind: 'prominent',
                    showInAllWindows: true,
                }, 'status.scrollLockingEnabled', 1 /* StatusbarAlignment.RIGHT */, 102);
            }
        }
        else {
            this.statusBarEntry.clear();
        }
    }
    registerActions() {
        const $this = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.toggleLockedScrolling',
                    title: {
                        ...localize2('toggleLockedScrolling', 'Toggle Locked Scrolling Across Editors'),
                        mnemonicTitle: localize({ key: 'miToggleLockedScrolling', comment: ['&& denotes a mnemonic'] }, 'Locked Scrolling'),
                    },
                    category: Categories.View,
                    f1: true,
                    metadata: {
                        description: localize('synchronizeScrolling', 'Synchronize Scrolling Editors'),
                    },
                });
            }
            run() {
                $this.toggle();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.holdLockedScrolling',
                    title: {
                        ...localize2('holdLockedScrolling', 'Hold Locked Scrolling Across Editors'),
                        mnemonicTitle: localize({ key: 'miHoldLockedScrolling', comment: ['&& denotes a mnemonic'] }, 'Locked Scrolling'),
                    },
                    category: Categories.View,
                });
            }
            run(accessor) {
                const keybindingService = accessor.get(IKeybindingService);
                // Enable Sync Scrolling while pressed
                $this.toggle();
                const holdMode = keybindingService.enableKeybindingHoldMode('workbench.action.holdLockedScrolling');
                if (!holdMode) {
                    return;
                }
                holdMode.finally(() => {
                    $this.toggle();
                });
            }
        }));
    }
    dispose() {
        this.deactivate();
        super.dispose();
    }
};
SyncScroll = __decorate([
    __param(0, IEditorService),
    __param(1, IStatusbarService)
], SyncScroll);
export { SyncScroll };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsTG9ja2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Njcm9sbExvY2tpbmcvYnJvd3Nlci9zY3JvbGxMb2NraW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFcEYsT0FBTyxFQUdOLHlCQUF5QixHQUN6QixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBRU4saUJBQWlCLEdBRWpCLE1BQU0sa0RBQWtELENBQUE7QUFFbEQsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLFVBQVU7YUFDekIsT0FBRSxHQUFHLGlDQUFpQyxBQUFwQyxDQUFvQztJQWN0RCxZQUNpQixhQUE4QyxFQUMzQyxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUE7UUFIMEIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFkdkQs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