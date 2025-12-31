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
import * as DOM from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { MenuWorkbenchToolBar, } from '../../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { CodiconActionViewItem } from '../view/cellParts/cellActionView.js';
let ListTopCellToolbar = class ListTopCellToolbar extends Disposable {
    constructor(notebookEditor, notebookOptions, instantiationService, contextMenuService, menuService) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookOptions = notebookOptions;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.viewZone = this._register(new MutableDisposable());
        this._modelDisposables = this._register(new DisposableStore());
        this.topCellToolbarContainer = DOM.$('div');
        this.topCellToolbar = DOM.$('.cell-list-top-cell-toolbar-container');
        this.topCellToolbarContainer.appendChild(this.topCellToolbar);
        this._register(this.notebookEditor.onDidAttachViewModel(() => {
            this.updateTopToolbar();
        }));
        this._register(this.notebookOptions.onDidChangeOptions((e) => {
            if (e.insertToolbarAlignment || e.insertToolbarPosition || e.cellToolbarLocation) {
                this.updateTopToolbar();
            }
        }));
    }
    updateTopToolbar() {
        const layoutInfo = this.notebookOptions.getLayoutConfiguration();
        this.viewZone.value = new DisposableStore();
        if (layoutInfo.insertToolbarPosition === 'hidden' ||
            layoutInfo.insertToolbarPosition === 'notebookToolbar') {
            const height = this.notebookOptions.computeTopInsertToolbarHeight(this.notebookEditor.textModel?.viewType);
            if (height !== 0) {
                // reserve whitespace to avoid overlap with cell toolbar
                this.notebookEditor.changeViewZones((accessor) => {
                    const id = accessor.addZone({
                        afterModelPosition: 0,
                        heightInPx: height,
                        domNode: DOM.$('div'),
                    });
                    accessor.layoutZone(id);
                    this.viewZone.value?.add({
                        dispose: () => {
                            if (!this.notebookEditor.isDisposed) {
                                this.notebookEditor.changeViewZones((accessor) => {
                                    accessor.removeZone(id);
                                });
                            }
                        },
                    });
                });
            }
            return;
        }
        this.notebookEditor.changeViewZones((accessor) => {
            const height = this.notebookOptions.computeTopInsertToolbarHeight(this.notebookEditor.textModel?.viewType);
            const id = accessor.addZone({
                afterModelPosition: 0,
                heightInPx: height,
                domNode: this.topCellToolbarContainer,
            });
            accessor.layoutZone(id);
            this.viewZone.value?.add({
                dispose: () => {
                    if (!this.notebookEditor.isDisposed) {
                        this.notebookEditor.changeViewZones((accessor) => {
                            accessor.removeZone(id);
                        });
                    }
                },
            });
            DOM.clearNode(this.topCellToolbar);
            const toolbar = this.instantiationService.createInstance(MenuWorkbenchToolBar, this.topCellToolbar, this.notebookEditor.creationOptions.menuIds.cellTopInsertToolbar, {
                actionViewItemProvider: (action, options) => {
                    if (action instanceof MenuItemAction) {
                        const item = this.instantiationService.createInstance(CodiconActionViewItem, action, {
                            hoverDelegate: options.hoverDelegate,
                        });
                        return item;
                    }
                    return undefined;
                },
                menuOptions: {
                    shouldForwardArgs: true,
                },
                toolbarOptions: {
                    primaryGroup: (g) => /^inline/.test(g),
                },
                hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            });
            if (this.notebookEditor.hasModel()) {
                toolbar.context = {
                    notebookEditor: this.notebookEditor,
                };
            }
            this.viewZone.value?.add(toolbar);
            // update toolbar container css based on cell list length
            this.viewZone.value?.add(this.notebookEditor.onDidChangeModel(() => {
                this._modelDisposables.clear();
                if (this.notebookEditor.hasModel()) {
                    this._modelDisposables.add(this.notebookEditor.onDidChangeViewCells(() => {
                        this.updateClass();
                    }));
                    this.updateClass();
                }
            }));
            this.updateClass();
        });
    }
    updateClass() {
        if (this.notebookEditor.hasModel() && this.notebookEditor.getLength() === 0) {
            this.topCellToolbar.classList.add('emptyNotebook');
        }
        else {
            this.topCellToolbar.classList.remove('emptyNotebook');
        }
    }
};
ListTopCellToolbar = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IMenuService)
], ListTopCellToolbar);
export { ListTopCellToolbar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUb3BDZWxsVG9vbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld1BhcnRzL25vdGVib29rVG9wQ2VsbFRvb2xiYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUlyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVwRSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFPakQsWUFDb0IsY0FBdUMsRUFDekMsZUFBZ0MsRUFDMUIsb0JBQThELEVBQ2hFLGtCQUEwRCxFQUNqRSxXQUE0QztRQUUxRCxLQUFLLEVBQUUsQ0FBQTtRQU5ZLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUN6QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDUCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzdDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDOUMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFUMUMsYUFBUSxHQUF1QyxJQUFJLENBQUMsU0FBUyxDQUM3RSxJ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