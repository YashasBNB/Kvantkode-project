/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './iconlabel.css';
import * as dom from '../../dom.js';
import * as css from '../../cssValue.js';
import { HighlightedLabel } from '../highlightedlabel/highlightedLabel.js';
import { Disposable } from '../../../common/lifecycle.js';
import { equals } from '../../../common/objects.js';
import { Range } from '../../../common/range.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { isString } from '../../../common/types.js';
import { stripIcons } from '../../../common/iconLabels.js';
class FastLabelNode {
    constructor(_element) {
        this._element = _element;
    }
    get element() {
        return this._element;
    }
    set textContent(content) {
        if (this.disposed || content === this._textContent) {
            return;
        }
        this._textContent = content;
        this._element.textContent = content;
    }
    set classNames(classNames) {
        if (this.disposed || equals(classNames, this._classNames)) {
            return;
        }
        this._classNames = classNames;
        this._element.classList.value = '';
        this._element.classList.add(...classNames);
    }
    set empty(empty) {
        if (this.disposed || empty === this._empty) {
            return;
        }
        this._empty = empty;
        this._element.style.marginLeft = empty ? '0' : '';
    }
    dispose() {
        this.disposed = true;
    }
}
export class IconLabel extends Disposable {
    constructor(container, options) {
        super();
        this.customHovers = new Map();
        this.creationOptions = options;
        this.domNode = this._register(new FastLabelNode(dom.append(container, dom.$('.monaco-icon-label'))));
        this.labelContainer = dom.append(this.domNode.element, dom.$('.monaco-icon-label-container'));
        this.nameContainer = dom.append(this.labelContainer, dom.$('span.monaco-icon-name-container'));
        if (options?.supportHighlights || options?.supportIcons) {
            this.nameNode = this._register(new LabelWithHighlights(this.nameContainer, !!options.supportIcons));
        }
        else {
            this.nameNode = new Label(this.nameContainer);
        }
        this.hoverDelegate = options?.hoverDelegate ?? getDefaultHoverDelegate('mouse');
    }
    get element() {
        return this.domNode.element;
    }
    setLabel(label, description, options) {
        const labelClasses = ['monaco-icon-label'];
        const containerClasses = ['monaco-icon-label-container'];
        let ariaLabel = '';
        if (options) {
            if (options.extraClasses) {
                labelClasses.push(...options.extraClasses);
            }
            if (options.italic) {
                labelClasses.push('italic');
            }
            if (options.strikethrough) {
                labelClasses.push('strikethrough');
            }
            if (options.disabledCommand) {
                containerClasses.push('disabled');
            }
            if (options.title) {
                if (typeof options.title === 'string') {
                    ariaLabel += options.title;
                }
                else {
                    ariaLabel += label;
                }
            }
        }
        const existingIconNode = this.domNode.element.querySelector('.monaco-icon-label-iconpath');
        if (options?.iconPath) {
            let iconNode;
            if (!existingIconNode || !dom.isHTMLElement(existingIconNode)) {
                iconNode = dom.$('.monaco-icon-label-iconpath');
                this.domNode.element.prepend(iconNode);
            }
            else {
                iconNode = existingIconNode;
            }
            iconNode.style.backgroundImage = css.asCSSUrl(options?.iconPath);
            iconNode.style.backgroundRepeat = 'no-repeat';
            iconNode.style.backgroundPosition = 'center';
            iconNode.style.backgroundSize = 'contain';
        }
        else if (existingIconNode) {
            existingIconNode.remove();
        }
        this.domNode.classNames = labelClasses;
        this.domNode.element.setAttribute('aria-label', ariaLabel);
        this.labelContainer.classList.value = '';
        this.labelContainer.classList.add(...containerClasses);
        this.setupHover(options?.descriptionTitle ? this.labelContainer : this.element, options?.title);
        this.nameNode.setLabel(label, options);
        if (description || this.descriptionNode) {
            const descriptionNode = this.getOrCreateDescriptionNode();
            if (descriptionNode instanceof HighlightedLabel) {
                descriptionNode.set(description || '', options ? options.descriptionMatches : undefined, undefined, options?.labelEscapeNewLines);
                this.setupHover(descriptionNode.element, options?.descriptionTitle);
            }
            else {
                descriptionNode.textContent =
                    description && options?.labelEscapeNewLines
                        ? HighlightedLabel.escapeNewLines(description, [])
                        : description || '';
                this.setupHover(descriptionNode.element, options?.descriptionTitle || '');
                descriptionNode.empty = !description;
            }
        }
        if (options?.suffix || this.suffixNode) {
            const suffixNode = this.getOrCreateSuffixNode();
            suffixNode.textContent = options?.suffix ?? '';
        }
    }
    setupHover(htmlElement, tooltip) {
        const previousCustomHover = this.customHovers.get(htmlElement);
        if (previousCustomHover) {
            previousCustomHover.dispose();
            this.customHovers.delete(htmlElement);
        }
        if (!tooltip) {
            htmlElement.removeAttribute('title');
            return;
        }
        let hoverTarget = htmlElement;
        if (this.creationOptions?.hoverTargetOverride) {
            if (!dom.isAncestor(htmlElement, this.creationOptions.hoverTargetOverride)) {
                throw new Error('hoverTargetOverrride must be an ancestor of the htmlElement');
            }
            hoverTarget = this.creationOptions.hoverTargetOverride;
        }
        if (this.hoverDelegate.showNativeHover) {
            function setupNativeHover(htmlElement, tooltip) {
                if (isString(tooltip)) {
                    // Icons don't render in the native hover so we strip them out
                    htmlElement.title = stripIcons(tooltip);
                }
                else if (tooltip?.markdownNotSupportedFallback) {
                    htmlElement.title = tooltip.markdownNotSupportedFallback;
                }
                else {
                    htmlElement.removeAttribute('title');
                }
            }
            setupNativeHover(hoverTarget, tooltip);
        }
        else {
            const hoverDisposable = getBaseLayerHoverDelegate().setupManagedHover(this.hoverDelegate, hoverTarget, tooltip);
            if (hoverDisposable) {
                this.customHovers.set(htmlElement, hoverDisposable);
            }
        }
    }
    dispose() {
        super.dispose();
        for (const disposable of this.customHovers.values()) {
            disposable.dispose();
        }
        this.customHovers.clear();
    }
    getOrCreateSuffixNode() {
        if (!this.suffixNode) {
            const suffixContainer = this._register(new FastLabelNode(dom.after(this.nameContainer, dom.$('span.monaco-icon-suffix-container'))));
            this.suffixNode = this._register(new FastLabelNode(dom.append(suffixContainer.element, dom.$('span.label-suffix'))));
        }
        return this.suffixNode;
    }
    getOrCreateDescriptionNode() {
        if (!this.descriptionNode) {
            const descriptionContainer = this._register(new FastLabelNode(dom.append(this.labelContainer, dom.$('span.monaco-icon-description-container'))));
            if (this.creationOptions?.supportDescriptionHighlights) {
                this.descriptionNode = this._register(new HighlightedLabel(dom.append(descriptionContainer.element, dom.$('span.label-description')), { supportIcons: !!this.creationOptions.supportIcons }));
            }
            else {
                this.descriptionNode = this._register(new FastLabelNode(dom.append(descriptionContainer.element, dom.$('span.label-description'))));
            }
        }
        return this.descriptionNode;
    }
}
class Label {
    constructor(container) {
        this.container = container;
        this.label = undefined;
        this.singleLabel = undefined;
    }
    setLabel(label, options) {
        if (this.label === label && equals(this.options, options)) {
            return;
        }
        this.label = label;
        this.options = options;
        if (typeof label === 'string') {
            if (!this.singleLabel) {
                this.container.innerText = '';
                this.container.classList.remove('multiple');
                this.singleLabel = dom.append(this.container, dom.$('a.label-name', { id: options?.domId }));
            }
            this.singleLabel.textContent = label;
        }
        else {
            this.container.innerText = '';
            this.container.classList.add('multiple');
            this.singleLabel = undefined;
            for (let i = 0; i < label.length; i++) {
                const l = label[i];
                const id = options?.domId && `${options?.domId}_${i}`;
                dom.append(this.container, dom.$('a.label-name', {
                    id,
                    'data-icon-label-count': label.length,
                    'data-icon-label-index': i,
                    role: 'treeitem',
                }, l));
                if (i < label.length - 1) {
                    dom.append(this.container, dom.$('span.label-separator', undefined, options?.separator || '/'));
                }
            }
        }
    }
}
function splitMatches(labels, separator, matches) {
    if (!matches) {
        return undefined;
    }
    let labelStart = 0;
    return labels.map((label) => {
        const labelRange = { start: labelStart, end: labelStart + label.length };
        const result = matches
            .map((match) => Range.intersect(labelRange, match))
            .filter((range) => !Range.isEmpty(range))
            .map(({ start, end }) => ({ start: start - labelStart, end: end - labelStart }));
        labelStart = labelRange.end + separator.length;
        return result;
    });
}
class LabelWithHighlights extends Disposable {
    constructor(container, supportIcons) {
        super();
        this.container = container;
        this.supportIcons = supportIcons;
        this.label = undefined;
        this.singleLabel = undefined;
    }
    setLabel(label, options) {
        if (this.label === label && equals(this.options, options)) {
            return;
        }
        this.label = label;
        this.options = options;
        if (typeof label === 'string') {
            if (!this.singleLabel) {
                this.container.innerText = '';
                this.container.classList.remove('multiple');
                this.singleLabel = this._register(new HighlightedLabel(dom.append(this.container, dom.$('a.label-name', { id: options?.domId })), { supportIcons: this.supportIcons }));
            }
            this.singleLabel.set(label, options?.matches, undefined, options?.labelEscapeNewLines);
        }
        else {
            this.container.innerText = '';
            this.container.classList.add('multiple');
            this.singleLabel = undefined;
            const separator = options?.separator || '/';
            const matches = splitMatches(label, separator, options?.matches);
            for (let i = 0; i < label.length; i++) {
                const l = label[i];
                const m = matches ? matches[i] : undefined;
                const id = options?.domId && `${options?.domId}_${i}`;
                const name = dom.$('a.label-name', {
                    id,
                    'data-icon-label-count': label.length,
                    'data-icon-label-index': i,
                    role: 'treeitem',
                });
                const highlightedLabel = this._register(new HighlightedLabel(dom.append(this.container, name), {
                    supportIcons: this.supportIcons,
                }));
                highlightedLabel.set(l, m, undefined, options?.labelEscapeNewLines);
                if (i < label.length - 1) {
                    dom.append(name, dom.$('span.label-separator', undefined, separator));
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2ljb25MYWJlbC9pY29uTGFiZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEtBQUssR0FBRyxNQUFNLG1CQUFtQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRzFFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUE0QjFELE1BQU0sYUFBYTtJQU1sQixZQUFvQixRQUFxQjtRQUFyQixhQUFRLEdBQVIsUUFBUSxDQUFhO0lBQUcsQ0FBQztJQUU3QyxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQUksV0FBVyxDQUFDLE9BQWU7UUFDOUIsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEQsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxHQUFH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