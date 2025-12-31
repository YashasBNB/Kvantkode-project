/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../iconLabel/iconLabels.js';
import { Disposable } from '../../../common/lifecycle.js';
import * as objects from '../../../common/objects.js';
/**
 * A widget which can render a label with substring highlights, often
 * originating from a filter function like the fuzzy matcher.
 */
export class HighlightedLabel extends Disposable {
    /**
     * Create a new {@link HighlightedLabel}.
     *
     * @param container The parent container to append to.
     */
    constructor(container, options) {
        super();
        this.options = options;
        this.text = '';
        this.title = '';
        this.highlights = [];
        this.didEverRender = false;
        this.supportIcons = options?.supportIcons ?? false;
        this.domNode = dom.append(container, dom.$('span.monaco-highlighted-label'));
    }
    /**
     * The label's DOM node.
     */
    get element() {
        return this.domNode;
    }
    /**
     * Set the label and highlights.
     *
     * @param text The label to display.
     * @param highlights The ranges to highlight.
     * @param title An optional title for the hover tooltip.
     * @param escapeNewLines Whether to escape new lines.
     * @returns
     */
    set(text, highlights = [], title = '', escapeNewLines) {
        if (!text) {
            text = '';
        }
        if (escapeNewLines) {
            // adjusts highlights inplace
            text = HighlightedLabel.escapeNewLines(text, highlights);
        }
        if (this.didEverRender &&
            this.text === text &&
            this.title === title &&
            objects.equals(this.highlights, highlights)) {
            return;
        }
        this.text = text;
        this.title = title;
        this.highlights = highlights;
        this.render();
    }
    render() {
        const children = [];
        let pos = 0;
        for (const highlight of this.highlights) {
            if (highlight.end === highlight.start) {
                continue;
            }
            if (pos < highlight.start) {
                const substring = this.text.substring(pos, highlight.start);
                if (this.supportIcons) {
                    children.push(...renderLabelWithIcons(substring));
                }
                else {
                    children.push(substring);
                }
                pos = highlight.start;
            }
            const substring = this.text.substring(pos, highlight.end);
            const element = dom.$('span.highlight', undefined, ...(this.supportIcons ? renderLabelWithIcons(substring) : [substring]));
            if (highlight.extraClasses) {
                element.classList.add(...highlight.extraClasses);
            }
            children.push(element);
            pos = highlight.end;
        }
        if (pos < this.text.length) {
            const substring = this.text.substring(pos);
            if (this.supportIcons) {
                children.push(...renderLabelWithIcons(substring));
            }
            else {
                children.push(substring);
            }
        }
        dom.reset(this.domNode, ...children);
        if (this.options?.hoverDelegate?.showNativeHover) {
            /* While custom hover is not inside custom hover */
            this.domNode.title = this.title;
        }
        else {
            if (!this.customHover && this.title !== '') {
                const hoverDelegate = this.options?.hoverDelegate ?? getDefaultHoverDelegate('mouse');
                this.customHover = this._register(getBaseLayerHoverDelegate().setupManagedHover(hoverDelegate, this.domNode, this.title));
            }
            else if (this.customHover) {
                this.customHover.update(this.title);
            }
        }
        this.didEverRender = true;
    }
    static escapeNewLines(text, highlights) {
        let total = 0;
        let extra = 0;
        return text.replace(/\r\n|\r|\n/g, (match, offset) => {
            extra = match === '\r\n' ? -1 : 0;
            offset += total;
            for (const highlight of highlights) {
                if (highlight.end <= offset) {
                    continue;
                }
                if (highlight.start >= offset) {
                    highlight.start += extra;
                }
                if (highlight.end >= offset) {
                    highlight.end += extra;
                }
            }
            total += extra;
            return '\u23CE';
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlnaGxpZ2h0ZWRMYWJlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9oaWdobGlnaHRlZGxhYmVsL2hpZ2hsaWdodGVkTGFiZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFHbkMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3pELE9BQU8sS0FBSyxPQUFPLE1BQU0sNEJBQTRCLENBQUE7QUFvQnJEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO0lBUy9DOzs7O09BSUc7SUFDSCxZQUNDLFNBQXNCLEVBQ0wsT0FBa0M7UUFFbkQsS0FBSyxFQUFFLENBQUE7UUFGVSxZQUFPLEdBQVAsT0FBTyxDQUEyQjtRQWQ1QyxTQUFJLEdBQVcsRUFBRSxDQUFBO1FBQ2pCLFVBQUssR0FBVyxFQUFFLENBQUE7UUFDbEIsZUFBVSxHQUEwQixFQUFFLENBQUE7UUFFdEMsa0JBQWEsR0FBWSxLQUFLLENBQUE7UUFjckMsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLEVBQUUsWUFBWSxJQUFJLEtBQUssQ0FBQTtRQUNsRCxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksT0FBTztRQUNWLE9B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