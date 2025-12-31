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
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ResizableHTMLElement } from '../../../../base/browser/ui/resizable/resizable.js';
import * as nls from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
export function canExpandCompletionItem(item) {
    return (!!item &&
        Boolean(item.completion.documentation ||
            (item.completion.detail && item.completion.detail !== item.completion.label)));
}
let SuggestDetailsWidget = class SuggestDetailsWidget {
    constructor(_editor, instaService) {
        this._editor = _editor;
        this._onDidClose = new Emitter();
        this.onDidClose = this._onDidClose.event;
        this._onDidChangeContents = new Emitter();
        this.onDidChangeContents = this._onDidChangeContents.event;
        this._disposables = new DisposableStore();
        this._renderDisposeable = new DisposableStore();
        this._borderWidth = 1;
        this._size = new dom.Dimension(330, 0);
        this.domNode = dom.$('.suggest-details');
        this.domNode.classList.add('no-docs');
        this._markdownRenderer = instaService.createInstance(MarkdownRenderer, { editor: _editor });
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
        this._disposables.add(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this._configureFont();
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
        this._renderDisposeable.dispose();
    }
    _configureFont() {
        const options = this._editor.getOptions();
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const fontFamily = fontInfo.getMassagedFontFamily();
        const fontSize = options.get(124 /* EditorOption.suggestFontSize */) || fontInfo.fontSize;
        const lineHeight = options.get(125 /* EditorOption.suggestLineHeight */) || fontInfo.lineHeight;
        const fontWeight = fontInfo.fontWeight;
        const fontSizePx = `${fontSize}px`;
        const lineHeightPx = `${lineHeight}px`;
        this.domNode.style.fontSize = fontSizePx;
        this.domNode.style.lineHeight = `${lineHeight / fontSize}`;
        this.domNode.style.fontWeight = fontWeight;
        this.domNode.style.fontFeatureSettings = fontInfo.fontFeatureSettings;
        this._type.style.fontFamily = fontFamily;
        this._close.style.height = lineHeightPx;
        this._close.style.width = lineHeightPx;
    }
    getLayoutInfo() {
        const lineHeight = this._editor.getOption(125 /* EditorOption.suggestLineHeight */) ||
            this._editor.getOption(52 /* EditorOption.fontInfo */).lineHeight;
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
        if (explainMode) {
            let md = '';
            md += `score: ${item.score[0]}\n`;
            md += `prefix: ${item.word ?? '(no prefix)'}\n`;
            md += `word: ${item.completion.filterText ? item.completion.filterText + ' (filterText)' : item.textLabel}\n`;
            md += `distance: ${item.distance} (localityBonus-setting)\n`;
            md += `index: ${item.idx}, based on ${(item.completion.sortText && `sortText: "${item.completion.sortText}"`) || 'label'}\n`;
            md += `commit_chars: ${item.completion.commitCharacters?.join('')}\n`;
            documentation = new MarkdownString().appendCodeblock('empty', md);
            detail = `Provider: ${item.provider._debugDisplayName}`;
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
        // --- documentation
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
        this.layout(this._size.width, this._type.clientHeight + this._docs.clientHeight);
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
SuggestDetailsWidget = __decorate([
    __param(1, IInstantiationService)
], SuggestDetailsWidget);
export { SuggestDetailsWidget };
export class SuggestDetailsOverlay {
    constructor(widget, _editor) {
        this.widget = widget;
        this._editor = _editor;
        this.allowEditorOverflow = true;
        this._disposables = new DisposableStore();
        this._added = false;
        this._preferAlignAtTop = true;
        this._resizable = new ResizableHTMLElement();
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
                this._placeAtAnchor(this._anchorBox, this._userSize ?? this.widget.size, this._preferAlignAtTop);
            }
        }));
    }
    dispose() {
        this._resizable.dispose();
        this._disposables.dispose();
        this.hide();
    }
    getId() {
        return 'suggest.details';
    }
    getDomNode() {
        return this._resizable.domNode;
    }
    getPosition() {
        return this._topLeft ? { preference: this._topLeft } : null;
    }
    show() {
        if (!this._added) {
            this._editor.addOverlayWidget(this);
            this._added = true;
        }
    }
    hide(sessionEnded = false) {
        this._resizable.clearSashHoverState();
        if (this._added) {
            this._editor.removeOverlayWidget(this);
            this._added = false;
            this._anchorBox = undefined;
            this._topLeft = undefined;
        }
        if (sessionEnded) {
            this._userSize = undefined;
            this.widget.clearContents();
        }
    }
    placeAtAnchor(anchor, preferAlignAtTop) {
        const anchorBox = anchor.getBoundingClientRect();
        this._anchorBox = anchorBox;
        this._preferAlignAtTop = preferAlignAtTop;
        this._placeAtAnchor(this._anchorBox, this._userSize ?? this.widget.size, preferAlignAtTop);
    }
    _placeAtAnchor(anchorBox, size, preferAlignAtTop) {
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
        if (preferAlignAtTop) {
            if (height <= placement.maxSizeTop.height) {
                alignAtTop = true;
                maxSize = placement.maxSizeTop;
            }
            else {
                alignAtTop = false;
                maxSize = placement.maxSizeBottom;
            }
        }
        else {
            if (height <= placement.maxSizeBottom.height) {
                alignAtTop = false;
                maxSize = placement.maxSizeBottom;
            }
            else {
                alignAtTop = true;
                maxSize = placement.maxSizeTop;
            }
        }
        let { top, left } = placement;
        if (!alignAtTop && height > anchorBox.height) {
            top = bottom - height;
        }
        const editorDomNode = this._editor.getDomNode();
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
        this._editor.layoutOverlayWidget(this);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldERldGFpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvc3VnZ2VzdFdpZGdldERldGFpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBT3ZHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3pGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbEcsTUFBTSxVQUFVLHVCQUF1QixDQUFDLElBQWdDO0lBQ3ZFLE9BQU8sQ0FDTixDQUFDLENBQUMsSUFBSTtRQUNOLE9BQU8sQ0FDTixJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWE7WUFDNUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FB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