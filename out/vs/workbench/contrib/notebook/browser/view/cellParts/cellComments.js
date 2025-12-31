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
import { coalesce } from '../../../../../../base/common/arrays.js';
import { DisposableMap, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { EDITOR_FONT_DEFAULTS, } from '../../../../../../editor/common/config/editorOptions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { ICommentService, } from '../../../../comments/browser/commentService.js';
import { CommentThreadWidget } from '../../../../comments/browser/commentThreadWidget.js';
import { CellContentPart } from '../cellPart.js';
let CellComments = class CellComments extends CellContentPart {
    constructor(notebookEditor, container, contextKeyService, themeService, commentService, configurationService, instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.container = container;
        this.contextKeyService = contextKeyService;
        this.themeService = themeService;
        this.commentService = commentService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.container.classList.add('review-widget');
        this._register((this._commentThreadWidgets = new DisposableMap()));
        this._register(this.themeService.onDidColorThemeChange(this._applyTheme, this));
        // TODO @rebornix onDidChangeLayout (font change)
        // this._register(this.notebookEditor.onDidchangeLa)
        this._applyTheme();
    }
    async initialize(element) {
        if (this.currentElement === element) {
            return;
        }
        this.currentElement = element;
        await this._updateThread();
    }
    async _createCommentTheadWidget(owner, commentThread) {
        const widgetDisposables = new DisposableStore();
        const widget = this.instantiationService.createInstance(CommentThreadWidget, this.container, this.notebookEditor, owner, this.notebookEditor.textModel.uri, this.contextKeyService, this.instantiationService, commentThread, undefined, undefined, {
            codeBlockFontFamily: this.configurationService.getValue('editor').fontFamily ||
                EDITOR_FONT_DEFAULTS.fontFamily,
        }, undefined, {
            actionRunner: () => { },
            collapse: async () => {
                return true;
            },
        });
        widgetDisposables.add(widget);
        this._commentThreadWidgets.set(commentThread.threadId, {
            widget,
            dispose: () => widgetDisposables.dispose(),
        });
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        await widget.display(layoutInfo.fontInfo.lineHeight, true);
        this._applyTheme();
        widgetDisposables.add(widget.onDidResize(() => {
            if (this.currentElement) {
                this.currentElement.commentHeight = this._calculateCommentThreadHeight(widget.getDimensions().height);
            }
        }));
    }
    _bindListeners() {
        this.cellDisposables.add(this.commentService.onDidUpdateCommentThreads(async () => this._updateThread()));
    }
    async _updateThread() {
        if (!this.currentElement) {
            return;
        }
        const infos = await this._getCommentThreadsForCell(this.currentElement);
        const widgetsToDelete = new Set(this._commentThreadWidgets.keys());
        const layoutInfo = this.currentElement.layoutInfo;
        this.container.style.top = `${layoutInfo.commentOffset}px`;
        for (const info of infos) {
            if (!info) {
                continue;
            }
            for (const thread of info.threads) {
                widgetsToDelete.delete(thread.threadId);
                const widget = this._commentThreadWidgets.get(thread.threadId)?.widget;
                if (widget) {
                    await widget.updateCommentThread(thread);
                }
                else {
                    await this._createCommentTheadWidget(info.uniqueOwner, thread);
                }
            }
        }
        for (const threadId of widgetsToDelete) {
            this._commentThreadWidgets.deleteAndDispose(threadId);
        }
        this._updateHeight();
    }
    _calculateCommentThreadHeight(bodyHeight) {
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        const headHeight = Math.ceil(layoutInfo.fontInfo.lineHeight * 1.2);
        const lineHeight = layoutInfo.fontInfo.lineHeight;
        const arrowHeight = Math.round(lineHeight / 3);
        const frameThickness = Math.round(lineHeight / 9) * 2;
        const computedHeight = headHeight +
            bodyHeight +
            arrowHeight +
            frameThickness +
            8; /** margin bottom to avoid margin collapse */
        return computedHeight;
    }
    _updateHeight() {
        if (!this.currentElement) {
            return;
        }
        let height = 0;
        for (const { widget } of this._commentThreadWidgets.values()) {
            height += this._calculateCommentThreadHeight(widget.getDimensions().height);
        }
        this.currentElement.commentHeight = height;
    }
    async _getCommentThreadsForCell(element) {
        if (this.notebookEditor.hasModel()) {
            return coalesce(await this.commentService.getNotebookComments(element.uri));
        }
        return [];
    }
    _applyTheme() {
        const theme = this.themeService.getColorTheme();
        const fontInfo = this.notebookEditor.getLayoutInfo().fontInfo;
        for (const { widget } of this._commentThreadWidgets.values()) {
            widget.applyTheme(theme, fontInfo);
        }
    }
    didRenderCell(element) {
        this.initialize(element);
        this._bindListeners();
    }
    prepareLayout() {
        this._updateHeight();
    }
    updateInternalLayoutNow(element) {
        if (this.currentElement) {
            this.container.style.top = `${element.layoutInfo.commentOffset}px`;
        }
    }
};
CellComments = __decorate([
    __param(2, IContextKeyService),
    __param(3, IThemeService),
    __param(4, ICommentService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService)
], CellComments);
export { CellComments };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENvbW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsQ29tbWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDM0YsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFFekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBR3pDLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxlQUFlO0lBUWhELFlBQ2tCLGNBQXVDLEVBQ3ZDLFNBQXNCLEVBQ0YsaUJBQXFDLEVBQzFDLFlBQTJCLEVBQ3pCLGNBQStCLEVBQ3pCLG9CQUEyQyxFQUMzQyxvQkFBMkM7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFSVSxtQkFBYyxHQUFkLGNBQWMsQ0FBeUI7UUFDdkMsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUNGLHNCQUFpQixH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