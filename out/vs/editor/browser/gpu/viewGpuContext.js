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
var ViewGpuContext_1;
import * as nls from '../../../nls.js';
import { addDisposableListener, getActiveWindow } from '../../../base/browser/dom.js';
import { createFastDomNode } from '../../../base/browser/fastDomNode.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { observableValue, runOnChange } from '../../../base/common/observable.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { TextureAtlas } from './atlas/textureAtlas.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity, } from '../../../platform/notification/common/notification.js';
import { GPULifecycle } from './gpuDisposable.js';
import { ensureNonNullable, observeDevicePixelDimensions } from './gpuUtils.js';
import { RectangleRenderer } from './rectangleRenderer.js';
import { DecorationCssRuleExtractor } from './css/decorationCssRuleExtractor.js';
import { Event } from '../../../base/common/event.js';
import { DecorationStyleCache } from './css/decorationStyleCache.js';
import { ViewportRenderStrategy } from './renderStrategy/viewportRenderStrategy.js';
let ViewGpuContext = class ViewGpuContext extends Disposable {
    static { ViewGpuContext_1 = this; }
    static { this._decorationCssRuleExtractor = new DecorationCssRuleExtractor(); }
    static get decorationCssRuleExtractor() {
        return ViewGpuContext_1._decorationCssRuleExtractor;
    }
    static { this._decorationStyleCache = new DecorationStyleCache(); }
    static get decorationStyleCache() {
        return ViewGpuContext_1._decorationStyleCache;
    }
    /**
     * The shared texture atlas to use across all views.
     *
     * @throws if called before the GPU device is resolved
     */
    static get atlas() {
        if (!ViewGpuContext_1._atlas) {
            throw new BugIndicatingError('Cannot call ViewGpuContext.textureAtlas before device is resolved');
        }
        return ViewGpuContext_1._atlas;
    }
    /**
     * The shared texture atlas to use across all views. This is a convenience alias for
     * {@link ViewGpuContext.atlas}.
     *
     * @throws if called before the GPU device is resolved
     */
    get atlas() {
        return ViewGpuContext_1.atlas;
    }
    constructor(context, _instantiationService, _notificationService, configurationService) {
        super();
        this._instantiationService = _instantiationService;
        this._notificationService = _notificationService;
        this.configurationService = configurationService;
        /**
         * The hard cap for line columns rendered by the GPU renderer.
         */
        this.maxGpuCols = ViewportRenderStrategy.maxSupportedColumns;
        this.canvas = createFastDomNode(document.createElement('canvas'));
        this.canvas.setClassName('editorCanvas');
        // Adjust the canvas size to avoid drawing under the scroll bar
        this._register(Event.runAndSubscribe(configurationService.onDidChangeConfiguration, (e) => {
            if (!e || e.affectsConfiguration('editor.scrollbar.verticalScrollbarSize')) {
                const verticalScrollbarSize = configurationService.getValue('editor').scrollbar
                    ?.verticalScrollbarSize ?? 14;
                this.canvas.domNode.style.boxSizing = 'border-box';
                this.canvas.domNode.style.paddingRight = `${verticalScrollbarSize}px`;
            }
        }));
        this.ctx = ensureNonNullable(this.canvas.domNode.getContext('webgpu'));
        // Request the GPU device, we only want to do this a single time per window as it's async
        // and can delay the initial render.
        if (!ViewGpuContext_1.device) {
            ViewGpuContext_1.device = GPULifecycle.requestDevice((message) => {
                const choices = [
                    {
                        label: nls.localize('editor.dom.render', 'Use DOM-based rendering'),
                        run: () => this.configurationService.updateValue('editor.experimentalGpuAcceleration', 'off'),
                    },
                ];
                this._notificationService.prompt(Severity.Warning, message, choices);
            }).then((ref) => {
                ViewGpuContext_1.deviceSync = ref.object;
                if (!ViewGpuContext_1._atlas) {
                    ViewGpuContext_1._atlas = this._instantiationService.createInstance(TextureAtlas, ref.object.limits.maxTextureDimension2D, undefined);
                }
                return ref.object;
            });
        }
        const dprObs = observableValue(this, getActiveWindow().devicePixelRatio);
        this._register(addDisposableListener(getActiveWindow(), 'resize', () => {
            dprObs.set(getActiveWindow().devicePixelRatio, undefined);
        }));
        this.devicePixelRatio = dprObs;
        this._register(runOnChange(this.devicePixelRatio, () => ViewGpuContext_1.atlas?.clear()));
        const canvasDevicePixelDimensions = observableValue(this, {
            width: this.canvas.domNode.width,
            height: this.canvas.domNode.height,
        });
        this._register(observeDevicePixelDimensions(this.canvas.domNode, getActiveWindow(), (width, height) => {
            this.canvas.domNode.width = width;
            this.canvas.domNode.height = height;
            canvasDevicePixelDimensions.set({ width, height }, undefined);
        }));
        this.canvasDevicePixelDimensions = canvasDevicePixelDimensions;
        const contentLeft = observableValue(this, 0);
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            contentLeft.set(context.configuration.options.get(151 /* EditorOption.layoutInfo */).contentLeft, undefined);
        }));
        this.contentLeft = contentLeft;
        this.rectangleRenderer = this._instantiationService.createInstance(RectangleRenderer, context, this.contentLeft, this.devicePixelRatio, this.canvas.domNode, this.ctx, ViewGpuContext_1.device);
    }
    /**
     * This method determines which lines can be and are allowed to be rendered using the GPU
     * renderer. Eventually this should trend all lines, except maybe exceptional cases like
     * decorations that use class names.
     */
    canRender(options, viewportData, lineNumber) {
        const data = viewportData.getViewLineRenderingData(lineNumber);
        // Check if the line has simple attributes that aren't supported
        if (data.containsRTL || data.maxColumn > this.maxGpuCols) {
            return false;
        }
        // Check if all inline decorations are supported
        if (data.inlineDecorations.length > 0) {
            let supported = true;
            for (const decoration of data.inlineDecorations) {
                if (decoration.type !== 0 /* InlineDecorationType.Regular */) {
                    supported = false;
                    break;
                }
                const styleRules = ViewGpuContext_1._decorationCssRuleExtractor.getStyleRules(this.canvas.domNode, decoration.inlineClassName);
                supported &&= styleRules.every((rule) => {
                    // Pseudo classes aren't supported currently
                    if (rule.selectorText.includes(':')) {
                        return false;
                    }
                    for (const r of rule.style) {
                        if (!supportsCssRule(r, rule.style)) {
                            return false;
                        }
                    }
                    return true;
                });
                if (!supported) {
                    break;
                }
            }
            return supported;
        }
        return true;
    }
    /**
     * Like {@link canRender} but returns detailed information about why the line cannot be rendered.
     */
    canRenderDetailed(options, viewportData, lineNumber) {
        const data = viewportData.getViewLineRenderingData(lineNumber);
        const reasons = [];
        if (data.containsRTL) {
            reasons.push('containsRTL');
        }
        if (data.maxColumn > this.maxGpuCols) {
            reasons.push('maxColumn > maxGpuCols');
        }
        if (data.inlineDecorations.length > 0) {
            let supported = true;
            const problemTypes = [];
            const problemSelectors = [];
            const problemRules = [];
            for (const decoration of data.inlineDecorations) {
                if (decoration.type !== 0 /* InlineDecorationType.Regular */) {
                    problemTypes.push(decoration.type);
                    supported = false;
                    continue;
                }
                const styleRules = ViewGpuContext_1._decorationCssRuleExtractor.getStyleRules(this.canvas.domNode, decoration.inlineClassName);
                supported &&= styleRules.every((rule) => {
                    // Pseudo classes aren't supported currently
                    if (rule.selectorText.includes(':')) {
                        problemSelectors.push(rule.selectorText);
                        return false;
                    }
                    for (const r of rule.style) {
                        if (!supportsCssRule(r, rule.style)) {
                            problemRules.push(`${r}: ${rule.style[r]}`);
                            return false;
                        }
                    }
                    return true;
                });
                if (!supported) {
                    continue;
                }
            }
            if (problemTypes.length > 0) {
                reasons.push(`inlineDecorations with unsupported types (${problemTypes.map((e) => `\`${e}\``).join(', ')})`);
            }
            if (problemRules.length > 0) {
                reasons.push(`inlineDecorations with unsupported CSS rules (${problemRules.map((e) => `\`${e}\``).join(', ')})`);
            }
            if (problemSelectors.length > 0) {
                reasons.push(`inlineDecorations with unsupported CSS selectors (${problemSelectors.map((e) => `\`${e}\``).join(', ')})`);
            }
        }
        return reasons;
    }
};
ViewGpuContext = ViewGpuContext_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IConfigurationService)
], ViewGpuContext);
export { ViewGpuContext };
/**
 * A list of supported decoration CSS rules that can be used in the GPU renderer.
 */
const gpuSupportedDecorationCssRules = ['color', 'font-weight', 'opacity'];
function supportsCssRule(rule, style) {
    if (!gpuSupportedDecorationCssRules.includes(rule)) {
        return false;
    }
    // Check for values that aren't supported
    switch (rule) {
        default:
            return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0dwdUNvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvdmlld0dwdUNvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQW9CLE1BQU0sb0NBQW9DLENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFDTixvQkFBb0IsRUFFcEIsUUFBUSxHQUNSLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENB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