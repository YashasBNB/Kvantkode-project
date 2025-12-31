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
import * as dom from '../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ResizableHTMLElement } from '../../../../base/browser/ui/resizable/resizable.js';
import * as nls from '../../../../nls.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
export function canExpandCompletionItem(item) {
    return (!!item &&
        Boolean(item.completion.documentation ||
            (item.completion.detail && item.completion.detail !== item.completion.label)));
}
export const SuggestDetailsClassName = 'suggest-details';
let SimpleSuggestDetailsWidget = class SimpleSuggestDetailsWidget {
    constructor(_getFontInfo, onDidFontInfoChange, _getAdvancedExplainModeDetails, instaService) {
        this._getFontInfo = _getFontInfo;
        this._getAdvancedExplainModeDetails = _getAdvancedExplainModeDetails;
        this._onDidClose = new Emitter();
        this.onDidClose = this._onDidClose.event;
        this._onDidChangeContents = new Emitter();
        this.onDidChangeContents = this._onDidChangeContents.event;
        this._disposables = new DisposableStore();
        this._renderDisposeable = this._disposables.add(new DisposableStore());
        this._borderWidth = 1;
        this._size = new dom.Dimension(330, 0);
        this.domNode = dom.$('.suggest-details');
        this.domNode.classList.add('no-docs');
        this._markdownRenderer = instaService.createInstance(MarkdownRenderer, {});
        this._body = dom.$('.body');
        this._scrollbar = new DomScrollableElement(this._body, {
            alwaysConsumeMouseWheel: true,
        });
        dom.append(this.domNode, this._scrollbar.getDomNode());
        this._disposables.add(this._scrollbar);
        this._header = dom.append(this._body, dom.$('.header'));
        this._close = dom.append(this._header, dom.$('span' + ThemeIcon.asCSSSelector(Codicon.close)));
        this._close.title = nls.localize('details.close', 'Close');
        this._close.role = 'button';
        this._close.tabIndex = -1;
        this._type = dom.append(this._header, dom.$('p.type'));
        this._docs = dom.append(this._body, dom.$('p.docs'));
        this._configureFont();
        this._disposables.add(onDidFontInfoChange(() => this._configureFont()));
    }
    _configureFont() {
        const fontInfo = this._getFontInfo();
        const fontFamily = fontInfo.fontFamily;
        const fontSize = fontInfo.fontSize;
        const lineHeight = fontInfo.lineHeight;
        const fontWeight = fontInfo.fontWeight;
        const fontSizePx = `${fontSize}px`;
        const lineHeightPx = `${lineHeight}px`;
        this.domNode.style.fontSize = fontSizePx;
        this.domNode.style.lineHeight = `${lineHeight / fontSize}`;
        this.domNode.style.fontWeight = fontWeight;
        // this.domNode.style.fontFeatureSettings = fontInfo.fontFeatureSettings;
        this._type.style.fontFamily = fontFamily;
        this._close.style.height = lineHeightPx;
        this._close.style.width = lineHeightPx;
    }
    dispose() {
        this._disposables.dispose();
        this._onDidClose.dispose();
        this._onDidChangeContents.dispose();
    }
    getLayoutInfo() {
        const lineHeight = this._getFontInfo().lineHeight;
        const borderWidth = this._borderWidth;
        const borderHeight = borderWidth * 2;
        return {
            lineHeight,
            borderWidth,
            borderHeight,
            verticalPadding: 22,
            horizontalPadding: 14,
        };
    }
    renderLoading() {
        this._type.textContent = nls.localize('loading', 'Loading...');
        this._docs.textContent = '';
        this.domNode.classList.remove('no-docs', 'no-type');
        this.layout(this.size.width, this.getLayoutInfo().lineHeight * 2);
        this._onDidChangeContents.fire(this);
    }
    renderItem(item, explainMode) {
        this._renderDisposeable.clear();
        let { detail, documentation } = item.completion;
        let md = '';
        if (explainMode) {
            md += `score: ${item.score[0]}\n`;
            md += `prefix: ${item.word ?? '(no prefix)'}\n`;
            md += `replacementIndex: ${item.completion.replacementIndex}\n`;
            md += `replacementLength: ${item.completion.replacementLength}\n`;
            md += `index: ${item.idx}\n`;
            if (this._getAdvancedExplainModeDetails) {
                const advancedDetails = this._getAdvancedExplainModeDetails();
                if (advancedDetails) {
                    md += `${advancedDetails}\n`;
                }
            }
            detail = `Provider: ${item.completion.provider}`;
            documentation = new MarkdownString().appendCodeblock('empty', md);
        }
        if (!explainMode && !canExpandCompletionItem(item)) {
            this.clearContents();
            return;
        }
        this.domNode.classList.remove('no-docs', 'no-type');
        // --- details
        if (detail) {
            const cappedDetail = detail.length > 100000 ? `${detail.substr(0, 100000)}…` : detail;
            this._type.textContent = cappedDetail;
            this._type.title = cappedDetail;
            dom.show(this._type);
            this._type.classList.toggle('auto-wrap', !/\r?\n^\s+/gim.test(cappedDetail));
        }
        else {
            dom.clearNode(this._type);
            this._type.title = '';
            dom.hide(this._type);
            this.domNode.classList.add('no-type');
        }
        // // --- documentation
        dom.clearNode(this._docs);
        if (typeof documentation === 'string') {
            this._docs.classList.remove('markdown-docs');
            this._docs.textContent = documentation;
        }
        else if (documentation) {
            this._docs.classList.add('markdown-docs');
            dom.clearNode(this._docs);
            const renderedContents = this._markdownRenderer.render(documentation, {
                asyncRenderCallback: () => {
                    this.layout(this._size.width, this._type.clientHeight + this._docs.clientHeight);
                    this._onDidChangeContents.fire(this);
                },
            });
            this._docs.appendChild(renderedContents.element);
            this._renderDisposeable.add(renderedContents);
        }
        this.domNode.classList.toggle('detail-and-doc', !!detail && !!documentation);
        this.domNode.style.userSelect = 'text';
        this.domNode.tabIndex = -1;
        this._close.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        this._close.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._onDidClose.fire();
        };
        this._body.scrollTop = 0;
        this.layout(this._size.width, this._type.clientHeight + this._docs.clientHeight + this.getLayoutInfo().verticalPadding);
        this._onDidChangeContents.fire(this);
    }
    clearContents() {
        this.domNode.classList.add('no-docs');
        this._type.textContent = '';
        this._docs.textContent = '';
    }
    get isEmpty() {
        return this.domNode.classList.contains('no-docs');
    }
    get size() {
        return this._size;
    }
    layout(width, height) {
        const newSize = new dom.Dimension(width, height);
        if (!dom.Dimension.equals(newSize, this._size)) {
            this._size = newSize;
            dom.size(this.domNode, width, height);
        }
        this._scrollbar.scanDomNode();
    }
    scrollDown(much = 8) {
        this._body.scrollTop += much;
    }
    scrollUp(much = 8) {
        this._body.scrollTop -= much;
    }
    scrollTop() {
        this._body.scrollTop = 0;
    }
    scrollBottom() {
        this._body.scrollTop = this._body.scrollHeight;
    }
    pageDown() {
        this.scrollDown(80);
    }
    pageUp() {
        this.scrollUp(80);
    }
    set borderWidth(width) {
        this._borderWidth = width;
    }
    get borderWidth() {
        return this._borderWidth;
    }
    focus() {
        this.domNode.focus();
    }
};
SimpleSuggestDetailsWidget = __decorate([
    __param(3, IInstantiationService)
], SimpleSuggestDetailsWidget);
export { SimpleSuggestDetailsWidget };
export class SimpleSuggestDetailsOverlay {
    constructor(widget, _container) {
        this.widget = widget;
        this._container = _container;
        this._disposables = new DisposableStore();
        this._added = false;
        this._resizable = this._disposables.add(new ResizableHTMLElement());
        this._resizable.domNode.classList.add('suggest-details-container');
        this._resizable.domNode.appendChild(widget.domNode);
        this._resizable.enableSashes(false, true, true, false);
        let topLeftNow;
        let sizeNow;
        let deltaTop = 0;
        let deltaLeft = 0;
        this._disposables.add(this._resizable.onDidWillResize(() => {
            topLeftNow = this._topLeft;
            sizeNow = this._resizable.size;
        }));
        this._disposables.add(this._resizable.onDidResize((e) => {
            if (topLeftNow && sizeNow) {
                this.widget.layout(e.dimension.width, e.dimension.height);
                let updateTopLeft = false;
                if (e.west) {
                    deltaLeft = sizeNow.width - e.dimension.width;
                    updateTopLeft = true;
                }
                if (e.north) {
                    deltaTop = sizeNow.height - e.dimension.height;
                    updateTopLeft = true;
                }
                if (updateTopLeft) {
                    this._applyTopLeft({
                        top: topLeftNow.top + deltaTop,
                        left: topLeftNow.left + deltaLeft,
                    });
                }
            }
            if (e.done) {
                topLeftNow = undefined;
                sizeNow = undefined;
                deltaTop = 0;
                deltaLeft = 0;
                this._userSize = e.dimension;
            }
        }));
        this._disposables.add(this.widget.onDidChangeContents(() => {
            if (this._anchorBox) {
                this._placeAtAnchor(this._anchorBox, this._userSize ?? this.widget.size);
            }
        }));
    }
    dispose() {
        this.widget.dispose();
        this._disposables.dispose();
        this.hide();
    }
    getId() {
        return 'suggest.details';
    }
    getDomNode() {
        return this._resizable.domNode;
    }
    show() {
        if (!this._added) {
            this._container.appendChild(this._resizable.domNode);
            this._added = true;
        }
    }
    hide(sessionEnded = false) {
        this._resizable.clearSashHoverState();
        if (this._added) {
            this._container.removeChild(this._resizable.domNode);
            this._added = false;
            this._anchorBox = undefined;
            // this._topLeft = undefined;
        }
        if (sessionEnded) {
            this._userSize = undefined;
            this.widget.clearContents();
        }
    }
    placeAtAnchor(anchor) {
        const anchorBox = anchor.getBoundingClientRect();
        this._anchorBox = anchorBox;
        this.widget.layout(this._resizable.size.width, this._resizable.size.height);
        this._placeAtAnchor(this._anchorBox, this._userSize ?? this.widget.size);
    }
    _placeAtAnchor(anchorBox, size) {
        const bodyBox = dom.getClientArea(this.getDomNode().ownerDocument.body);
        const info = this.widget.getLayoutInfo();
        const defaultMinSize = new dom.Dimension(220, 2 * info.lineHeight);
        const defaultTop = anchorBox.top;
        // EAST
        const eastPlacement = (function () {
            const width = bodyBox.width -
                (anchorBox.left + anchorBox.width + info.borderWidth + info.horizontalPadding);
            const left = -info.borderWidth + anchorBox.left + anchorBox.width;
            const maxSizeTop = new dom.Dimension(width, bodyBox.height - anchorBox.top - info.borderHeight - info.verticalPadding);
            const maxSizeBottom = maxSizeTop.with(undefined, anchorBox.top + anchorBox.height - info.borderHeight - info.verticalPadding);
            return {
                top: defaultTop,
                left,
                fit: width - size.width,
                maxSizeTop,
                maxSizeBottom,
                minSize: defaultMinSize.with(Math.min(width, defaultMinSize.width)),
            };
        })();
        // WEST
        const westPlacement = (function () {
            const width = anchorBox.left - info.borderWidth - info.horizontalPadding;
            const left = Math.max(info.horizontalPadding, anchorBox.left - size.width - info.borderWidth);
            const maxSizeTop = new dom.Dimension(width, bodyBox.height - anchorBox.top - info.borderHeight - info.verticalPadding);
            const maxSizeBottom = maxSizeTop.with(undefined, anchorBox.top + anchorBox.height - info.borderHeight - info.verticalPadding);
            return {
                top: defaultTop,
                left,
                fit: width - size.width,
                maxSizeTop,
                maxSizeBottom,
                minSize: defaultMinSize.with(Math.min(width, defaultMinSize.width)),
            };
        })();
        // SOUTH
        const southPacement = (function () {
            const left = anchorBox.left;
            const top = -info.borderWidth + anchorBox.top + anchorBox.height;
            const maxSizeBottom = new dom.Dimension(anchorBox.width - info.borderHeight, bodyBox.height - anchorBox.top - anchorBox.height - info.verticalPadding);
            return {
                top,
                left,
                fit: maxSizeBottom.height - size.height,
                maxSizeBottom,
                maxSizeTop: maxSizeBottom,
                minSize: defaultMinSize.with(maxSizeBottom.width),
            };
        })();
        // take first placement that fits or the first with "least bad" fit
        const placements = [eastPlacement, westPlacement, southPacement];
        const placement = placements.find((p) => p.fit >= 0) ?? placements.sort((a, b) => b.fit - a.fit)[0];
        // top/bottom placement
        const bottom = anchorBox.top + anchorBox.height - info.borderHeight;
        let alignAtTop;
        let height = size.height;
        const maxHeight = Math.max(placement.maxSizeTop.height, placement.maxSizeBottom.height);
        if (height > maxHeight) {
            height = maxHeight;
        }
        let maxSize;
        // if (preferAlignAtTop) {
        if (height <= placement.maxSizeTop.height) {
            alignAtTop = true;
            maxSize = placement.maxSizeTop;
        }
        else {
            alignAtTop = false;
            maxSize = placement.maxSizeBottom;
        }
        // } else {
        // 	if (height <= placement.maxSizeBottom.height) {
        // 		alignAtTop = false;
        // 		maxSize = placement.maxSizeBottom;
        // 	} else {
        // 		alignAtTop = true;
        // 		maxSize = placement.maxSizeTop;
        // 	}
        // }
        let { top, left } = placement;
        if (!alignAtTop && height > anchorBox.height) {
            top = bottom - height;
        }
        const editorDomNode = this._container;
        if (editorDomNode) {
            // get bounding rectangle of the suggest widget relative to the editor
            const editorBoundingBox = editorDomNode.getBoundingClientRect();
            top -= editorBoundingBox.top;
            left -= editorBoundingBox.left;
        }
        this._applyTopLeft({ left, top });
        this._resizable.enableSashes(!alignAtTop, placement === eastPlacement, alignAtTop, placement !== eastPlacement);
        this._resizable.minSize = placement.minSize;
        this._resizable.maxSize = maxSize;
        this._resizable.layout(height, Math.min(maxSize.width, size.width));
        this.widget.layout(this._resizable.size.width, this._resizable.size.height);
    }
    _applyTopLeft(topLeft) {
        this._topLeft = topLeft;
        // this._editor.layoutOverlayWidget(this);
        this._resizable.domNode.style.top = `${topLeft.top}px`;
        this._resizable.domNode.style.left = `${topLeft.left}px`;
        this._resizable.domNode.style.position = 'absolute';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlU3VnZ2VzdFdpZGdldERldGFpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3VnZ2VzdC9icm93c2VyL3NpbXBsZVN1Z2dlc3RXaWRnZXREZXRhaWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3pGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdGQUFnRixDQUFBO0FBQ2pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBR2xHLE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxJQUFzQztJQUM3RSxPQUFPLENBQ04sQ0FBQyxDQUFDLElBQUk7UUFDTixPQUFPLENBQ04sSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhO1lBQzVCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLFVB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