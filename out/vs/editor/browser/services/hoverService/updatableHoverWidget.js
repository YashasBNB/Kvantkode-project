/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isHTMLElement } from '../../../../base/browser/dom.js';
import { isManagedHoverTooltipMarkdownString, } from '../../../../base/browser/ui/hover/hover.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { isFunction, isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
export class ManagedHoverWidget {
    constructor(hoverDelegate, target, fadeInAnimation) {
        this.hoverDelegate = hoverDelegate;
        this.target = target;
        this.fadeInAnimation = fadeInAnimation;
    }
    async update(content, focus, options) {
        if (this._cancellationTokenSource) {
            // there's an computation ongoing, cancel it
            this._cancellationTokenSource.dispose(true);
            this._cancellationTokenSource = undefined;
        }
        if (this.isDisposed) {
            return;
        }
        let resolvedContent;
        if (isString(content) || isHTMLElement(content) || content === undefined) {
            resolvedContent = content;
        }
        else {
            // compute the content, potentially long-running
            this._cancellationTokenSource = new CancellationTokenSource();
            const token = this._cancellationTokenSource.token;
            let managedContent;
            if (isManagedHoverTooltipMarkdownString(content)) {
                if (isFunction(content.markdown)) {
                    managedContent = content
                        .markdown(token)
                        .then((resolvedContent) => resolvedContent ?? content.markdownNotSupportedFallback);
                }
                else {
                    managedContent = content.markdown ?? content.markdownNotSupportedFallback;
                }
            }
            else {
                managedContent = content.element(token);
            }
            // compute the content
            if (managedContent instanceof Promise) {
                // show 'Loading' if no hover is up yet
                if (!this._hoverWidget) {
                    this.show(localize('iconLabel.loading', 'Loading...'), focus, options);
                }
                resolvedContent = await managedContent;
            }
            else {
                resolvedContent = managedContent;
            }
            if (this.isDisposed || token.isCancellationRequested) {
                // either the widget has been closed in the meantime
                // or there has been a new call to `update`
                return;
            }
        }
        this.show(resolvedContent, focus, options);
    }
    show(content, focus, options) {
        const oldHoverWidget = this._hoverWidget;
        if (this.hasContent(content)) {
            const hoverOptions = {
                content,
                target: this.target,
                actions: options?.actions,
                linkHandler: options?.linkHandler,
                trapFocus: options?.trapFocus,
                appearance: {
                    showPointer: this.hoverDelegate.placement === 'element',
                    skipFadeInAnimation: !this.fadeInAnimation || !!oldHoverWidget, // do not fade in if the hover is already showing
                    showHoverHint: options?.appearance?.showHoverHint,
                },
                position: {
                    hoverPosition: 2 /* HoverPosition.BELOW */,
                },
            };
            this._hoverWidget = this.hoverDelegate.showHover(hoverOptions, focus);
        }
        oldHoverWidget?.dispose();
    }
    hasContent(content) {
        if (!content) {
            return false;
        }
        if (isMarkdownString(content)) {
            return !!content.value;
        }
        return true;
    }
    get isDisposed() {
        return this._hoverWidget?.isDisposed;
    }
    dispose() {
        this._hoverWidget?.dispose();
        this._cancellationTokenSource?.dispose(true);
        this._cancellationTokenSource = undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRhYmxlSG92ZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9ob3ZlclNlcnZpY2UvdXBkYXRhYmxlSG92ZXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQy9ELE9BQU8sRUFDTixtQ0FBbUMsR0FJbkMsTUFBTSw0Q0FBNEMsQ0FBQTtBQU9uRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLE1BQU0sd0NBQXdDLENBQUE7QUFFL0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFJN0MsTUFBTSxPQUFPLGtCQUFrQjtJQUk5QixZQUNTLGFBQTZCLEVBQzdCLE1BQTBDLEVBQzFDLGVBQXdCO1FBRnhCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM3QixXQUFNLEdBQU4sTUFBTSxDQUFvQztRQUMxQyxvQkFBZSxHQUFmLGVBQWUsQ0FBUztJQUM5QixDQUFDO0lBRUosS0FBSyxDQUFDLE1BQU0sQ0FDWCxPQUE2QixFQUM3QixLQUFlLEVBQ2YsT0FBOEI7UUFFOUIsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNuQyw0Q0FBNEM7WUFDNUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsU0FBUyxDQUFBO1FBQzFDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNy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