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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUb3BDZWxsVG9vbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tUb3BDZWxsVG9vbGJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBSXJHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXBFLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQU9qRCxZQUNvQixjQUF1QyxFQUN6QyxlQUFnQyxFQUMxQixvQkFBOEQsRUFDaEUsa0JBQTBELEVBQ2pFLFdBQTRDO1FBRTFELEtBQUssRUFBRSxDQUFBO1FBTlksbUJBQWMsR0FBZCxjQUFjLENBQXlCO1FBQ3pDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNQLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDN0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQVQxQyxhQUFRLEdBQXVDLElBQUksQ0FBQyxTQUFTLENB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