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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29uZmlnL2VkaXRvckNvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3hDLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIseUJBQXlCLEVBRXpCLHFCQUFxQixHQUtyQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFxQyxNQUFNLGlDQUFpQyxDQUFBO0FBR2pHLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZFLE9BQU8s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