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
import * as browser from '../../../base/browser/browser.js';
import * as arrays from '../../../base/common/arrays.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as objects from '../../../base/common/objects.js';
import * as platform from '../../../base/common/platform.js';
import { ElementSizeObserver } from './elementSizeObserver.js';
import { FontMeasurements } from './fontMeasurements.js';
import { migrateOptions } from './migrateOptions.js';
import { TabFocus } from './tabFocus.js';
import { ComputeOptionsMemory, ConfigurationChangedEvent, editorOptionsRegistry, } from '../../common/config/editorOptions.js';
import { EditorZoom } from '../../common/config/editorZoom.js';
import { BareFontInfo } from '../../common/config/fontInfo.js';
import { IAccessibilityService, } from '../../../platform/accessibility/common/accessibility.js';
import { getWindow, getWindowById } from '../../../base/browser/dom.js';
import { PixelRatio } from '../../../base/browser/pixelRatio.js';
import { InputMode } from '../../common/inputMode.js';
let EditorConfiguration = class EditorConfiguration extends Disposable {
    constructor(isSimpleWidget, contextMenuId, options, container, _accessibilityService) {
        super();
        this._accessibilityService = _accessibilityService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeFast = this._register(new Emitter());
        this.onDidChangeFast = this._onDidChangeFast.event;
        this._isDominatedByLongLines = false;
        this._viewLineCount = 1;
        this._lineNumbersDigitCount = 1;
        this._reservedHeight = 0;
        this._glyphMarginDecorationLaneCount = 1;
        this._computeOptionsMemory = new ComputeOptionsMemory();
        this.isSimpleWidget = isSimpleWidget;
        this.contextMenuId = contextMenuId;
        this._containerObserver = this._register(new ElementSizeObserver(container, options.dimension));
        this._targetWindowId = getWindow(container).vscodeWindowId;
        this._rawOptions = deepCloneAndMigrateOptions(options);
        this._validatedOptions = EditorOptionsUtil.validateOptions(this._rawOptions);
        this.options = this._computeOptions();
        if (this.options.get(13 /* EditorOption.automaticLayout */)) {
            this._containerObserver.startObserving();
        }
        this._register(EditorZoom.onDidChangeZoomLevel(() => this._recomputeOptions()));
        this._register(TabFocus.onDidChangeTabFocus(() => this._recomputeOptions()));
        this._register(this._containerObserver.onDidChange(() => this._recomputeOptions()));
        this._register(FontMeasurements.onDidChange(() => this._recomputeOptions()));
        this._register(PixelRatio.getInstance(getWindow(container)).onDidChange(() => this._recomputeOptions()));
        this._register(this._accessibilityService.onDidChangeScreenReaderOptimized(() => this._recomputeOptions()));
        this._register(InputMode.onDidChangeInputMode(() => this._recomputeOptions()));
    }
    _recomputeOptions() {
        const newOptions = this._computeOptions();
        const changeEvent = EditorOptionsUtil.checkEquals(this.options, newOptions);
        if (changeEvent === null) {
            // nothing changed!
            return;
        }
        this.options = newOptions;
        this._onDidChangeFast.fire(changeEvent);
        this._onDidChange.fire(changeEvent);
    }
    _computeOptions() {
        const partialEnv = this._readEnvConfiguration();
        const bareFontInfo = BareFontInfo.createFromValidatedSettings(this._validatedOptions, partialEnv.pixelRatio, this.isSimpleWidget);
        const fontInfo = this._readFontInfo(bareFontInfo);
        const env = {
            memory: this._computeOptionsMemory,
            outerWidth: partialEnv.outerWidth,
            outerHeight: partialEnv.outerHeight - this._reservedHeight,
            fontInfo: fontInfo,
            extraEditorClassName: partialEnv.extraEditorClassName,
            isDominatedByLongLines: this._isDominatedByLongLines,
            viewLineCount: this._viewLineCount,
            lineNumbersDigitCount: this._lineNumbersDigitCount,
            emptySelectionClipboard: partialEnv.emptySelectionClipboard,
            pixelRatio: partialEnv.pixelRatio,
            tabFocusMode: TabFocus.getTabFocusMode(),
            inputMode: InputMode.getInputMode(),
            accessibilitySupport: partialEnv.accessibilitySupport,
            glyphMarginDecorationLaneCount: this._glyphMarginDecorationLaneCount,
        };
        return EditorOptionsUtil.computeOptions(this._validatedOptions, env);
    }
    _readEnvConfiguration() {
        return {
            extraEditorClassName: getExtraEditorClassName(),
            outerWidth: this._containerObserver.getWidth(),
            outerHeight: this._containerObserver.getHeight(),
            emptySelectionClipboard: browser.isWebKit || browser.isFirefox,
            pixelRatio: PixelRatio.getInstance(getWindowById(this._targetWindowId, true).window).value,
            accessibilitySupport: this._accessibilityService.isScreenReaderOptimized()
                ? 2 /* AccessibilitySupport.Enabled */
                : this._accessibilityService.getAccessibilitySupport(),
        };
    }
    _readFontInfo(bareFontInfo) {
        return FontMeasurements.readFontInfo(getWindowById(this._targetWindowId, true).window, bareFontInfo);
    }
    getRawOptions() {
        return this._rawOptions;
    }
    updateOptions(_newOptions) {
        const newOptions = deepCloneAndMigrateOptions(_newOptions);
        const didChange = EditorOptionsUtil.applyUpdate(this._rawOptions, newOptions);
        if (!didChange) {
            return;
        }
        this._validatedOptions = EditorOptionsUtil.validateOptions(this._rawOptions);
        this._recomputeOptions();
    }
    observeContainer(dimension) {
        this._containerObserver.observe(dimension);
    }
    setIsDominatedByLongLines(isDominatedByLongLines) {
        if (this._isDominatedByLongLines === isDominatedByLongLines) {
            return;
        }
        this._isDominatedByLongLines = isDominatedByLongLines;
        this._recomputeOptions();
    }
    setModelLineCount(modelLineCount) {
        const lineNumbersDigitCount = digitCount(modelLineCount);
        if (this._lineNumbersDigitCount === lineNumbersDigitCount) {
            return;
        }
        this._lineNumbersDigitCount = lineNumbersDigitCount;
        this._recomputeOptions();
    }
    setViewLineCount(viewLineCount) {
        if (this._viewLineCount === viewLineCount) {
            return;
        }
        this._viewLineCount = viewLineCount;
        this._recomputeOptions();
    }
    setReservedHeight(reservedHeight) {
        if (this._reservedHeight === reservedHeight) {
            return;
        }
        this._reservedHeight = reservedHeight;
        this._recomputeOptions();
    }
    setGlyphMarginDecorationLaneCount(decorationLaneCount) {
        if (this._glyphMarginDecorationLaneCount === decorationLaneCount) {
            return;
        }
        this._glyphMarginDecorationLaneCount = decorationLaneCount;
        this._recomputeOptions();
    }
};
EditorConfiguration = __decorate([
    __param(4, IAccessibilityService)
], EditorConfiguration);
export { EditorConfiguration };
function digitCount(n) {
    let r = 0;
    while (n) {
        n = Math.floor(n / 10);
        r++;
    }
    return r ? r : 1;
}
function getExtraEditorClassName() {
    let extra = '';
    if (!browser.isSafari && !browser.isWebkitWebView) {
        // Use user-select: none in all browsers except Safari and native macOS WebView
        extra += 'no-user-select ';
    }
    if (browser.isSafari) {
        // See https://github.com/microsoft/vscode/issues/108822
        extra += 'no-minimap-shadow ';
        extra += 'enable-user-select ';
    }
    if (platform.isMacintosh) {
        extra += 'mac ';
    }
    return extra;
}
class ValidatedEditorOptions {
    constructor() {
        this._values = [];
    }
    _read(option) {
        return this._values[option];
    }
    get(id) {
        return this._values[id];
    }
    _write(option, value) {
        this._values[option] = value;
    }
}
export class ComputedEditorOptions {
    constructor() {
        this._values = [];
    }
    _read(id) {
        if (id >= this._values.length) {
            throw new Error('Cannot read uninitialized value');
        }
        return this._values[id];
    }
    get(id) {
        return this._read(id);
    }
    _write(id, value) {
        this._values[id] = value;
    }
}
class EditorOptionsUtil {
    static validateOptions(options) {
        const result = new ValidatedEditorOptions();
        for (const editorOption of editorOptionsRegistry) {
            const value = editorOption.name === '_never_' ? undefined : options[editorOption.name];
            result._write(editorOption.id, editorOption.validate(value));
        }
        return result;
    }
    static computeOptions(options, env) {
        const result = new ComputedEditorOptions();
        for (const editorOption of editorOptionsRegistry) {
            result._write(editorOption.id, editorOption.compute(env, result, options._read(editorOption.id)));
        }
        return result;
    }
    static _deepEquals(a, b) {
        if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) {
            return a === b;
        }
        if (Array.isArray(a) || Array.isArray(b)) {
            return Array.isArray(a) && Array.isArray(b) ? arrays.equals(a, b) : false;
        }
        if (Object.keys(a).length !== Object.keys(b).length) {
            return false;
        }
        for (const key in a) {
            if (!EditorOptionsUtil._deepEquals(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }
    static checkEquals(a, b) {
        const result = [];
        let somethingChanged = false;
        for (const editorOption of editorOptionsRegistry) {
            const changed = !EditorOptionsUtil._deepEquals(a._read(editorOption.id), b._read(editorOption.id));
            result[editorOption.id] = changed;
            if (changed) {
                somethingChanged = true;
            }
        }
        return somethingChanged ? new ConfigurationChangedEvent(result) : null;
    }
    /**
     * Returns true if something changed.
     * Modifies `options`.
     */
    static applyUpdate(options, update) {
        let changed = false;
        for (const editorOption of editorOptionsRegistry) {
            if (update.hasOwnProperty(editorOption.name)) {
                const result = editorOption.applyUpdate(options[editorOption.name], update[editorOption.name]);
                options[editorOption.name] = result.newValue;
                changed = changed || result.didChange;
            }
        }
        return changed;
    }
}
function deepCloneAndMigrateOptions(_options) {
    const options = objects.deepClone(_options);
    migrateOptions(options);
    return options;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbmZpZy9lZGl0b3JDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLHlCQUF5QixFQUV6QixxQkFBcUIsR0FLckIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBcUMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUdqRyxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUs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