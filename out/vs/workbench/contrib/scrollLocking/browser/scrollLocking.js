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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsTG9ja2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2Nyb2xsTG9ja2luZy9icm93c2VyL3Njcm9sbExvY2tpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVwRixPQUFPLEVBR04seUJBQXlCLEdBQ3pCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFFTixpQkFBaUIsR0FFakIsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRCxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEsVUFBVTthQUN6QixPQUFFLEdBQUcsaUNBQWlDLEFBQXBDLENBQW9DO0lBY3RELFlBQ2lCLGFBQThDLEVBQzNDLGdCQUFvRDtRQUV2RSxLQUFLLEVBQUUsQ0FBQTtRQUgwQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDMUIscUJBQWdCLEdB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