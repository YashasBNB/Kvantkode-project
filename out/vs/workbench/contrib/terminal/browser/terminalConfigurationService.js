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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { EDITOR_FONT_DEFAULTS, } from '../../../../editor/common/config/editorOptions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { DEFAULT_BOLD_FONT_WEIGHT, DEFAULT_FONT_WEIGHT, DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, MAXIMUM_FONT_WEIGHT, MINIMUM_FONT_WEIGHT, MINIMUM_LETTER_SPACING, TERMINAL_CONFIG_SECTION, } from '../common/terminal.js';
import { isMacintosh } from '../../../../base/common/platform.js';
// #region TerminalConfigurationService
let TerminalConfigurationService = class TerminalConfigurationService extends Disposable {
    get config() {
        return this._config;
    }
    get onConfigChanged() {
        return this._onConfigChanged.event;
    }
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._onConfigChanged = new Emitter();
        this._fontMetrics = this._register(new TerminalFontMetrics(this, this._configurationService));
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, (e) => {
            if (!e || e.affectsConfiguration(TERMINAL_CONFIG_SECTION)) {
                this._updateConfig();
            }
        }));
    }
    setPanelContainer(panelContainer) {
        return this._fontMetrics.setPanelContainer(panelContainer);
    }
    configFontIsMonospace() {
        return this._fontMetrics.configFontIsMonospace();
    }
    getFont(w, xtermCore, excludeDimensions) {
        return this._fontMetrics.getFont(w, xtermCore, excludeDimensions);
    }
    _updateConfig() {
        const configValues = {
            ...this._configurationService.getValue(TERMINAL_CONFIG_SECTION),
        };
        configValues.fontWeight = this._normalizeFontWeight(configValues.fontWeight, DEFAULT_FONT_WEIGHT);
        configValues.fontWeightBold = this._normalizeFontWeight(configValues.fontWeightBold, DEFAULT_BOLD_FONT_WEIGHT);
        this._config = configValues;
        this._onConfigChanged.fire();
    }
    _normalizeFontWeight(input, defaultWeight) {
        if (input === 'normal' || input === 'bold') {
            return input;
        }
        return clampInt(input, MINIMUM_FONT_WEIGHT, MAXIMUM_FONT_WEIGHT, defaultWeight);
    }
};
TerminalConfigurationService = __decorate([
    __param(0, IConfigurationService)
], TerminalConfigurationService);
export { TerminalConfigurationService };
// #endregion TerminalConfigurationService
// #region TerminalFontMetrics
var FontConstants;
(function (FontConstants) {
    FontConstants[FontConstants["MinimumFontSize"] = 6] = "MinimumFontSize";
    FontConstants[FontConstants["MaximumFontSize"] = 100] = "MaximumFontSize";
})(FontConstants || (FontConstants = {}));
export class TerminalFontMetrics extends Disposable {
    constructor(_terminalConfigurationService, _configurationService) {
        super();
        this._terminalConfigurationService = _terminalConfigurationService;
        this._configurationService = _configurationService;
        this.linuxDistro = 1 /* LinuxDistro.Unknown */;
        this._register(toDisposable(() => this._charMeasureElement?.remove()));
    }
    setPanelContainer(panelContainer) {
        this._panelContainer = panelContainer;
    }
    configFontIsMonospace() {
        const fontSize = 15;
        const fontFamily = this._terminalConfigurationService.config.fontFamily ||
            this._configurationService.getValue('editor').fontFamily ||
            EDITOR_FONT_DEFAULTS.fontFamily;
        const iRect = this._getBoundingRectFor('i', fontFamily, fontSize);
        const wRect = this._getBoundingRectFor('w', fontFamily, fontSize);
        // Check for invalid bounds, there is no reason to believe the font is not monospace
        if (!iRect || !wRect || !iRect.width || !wRect.width) {
            return true;
        }
        return iRect.width === wRect.width;
    }
    /**
     * Gets the font information based on the terminal.integrated.fontFamily
     * terminal.integrated.fontSize, terminal.integrated.lineHeight configuration properties
     */
    getFont(w, xtermCore, excludeDimensions) {
        const editorConfig = this._configurationService.getValue('editor');
        let fontFamily = this._terminalConfigurationService.config.fontFamily ||
            editorConfig.fontFamily ||
            EDITOR_FONT_DEFAULTS.fontFamily ||
            'monospace';
        let fontSize = clampInt(this._terminalConfigurationService.config.fontSize, 6 /* FontConstants.MinimumFontSize */, 100 /* FontConstants.MaximumFontSize */, EDITOR_FONT_DEFAULTS.fontSize);
        // Work around bad font on Fedora/Ubuntu
        if (!this._terminalConfigurationService.config.fontFamily) {
            if (this.linuxDistro === 2 /* LinuxDistro.Fedora */) {
                fontFamily = "'DejaVu Sans Mono'";
            }
            if (this.linuxDistro === 3 /* LinuxDistro.Ubuntu */) {
                fontFamily = "'Ubuntu Mono'";
                // Ubuntu mono is somehow smaller, so set fontSize a bit larger to get the same perceived size.
                fontSize = clampInt(fontSize + 2, 6 /* FontConstants.MinimumFontSize */, 100 /* FontConstants.MaximumFontSize */, EDITOR_FONT_DEFAULTS.fontSize);
            }
        }
        // Always fallback to monospace, otherwise a proportional font may become the default
        fontFamily += ', monospace';
        // Always fallback to AppleBraille on macOS, otherwise braille will render with filled and
        // empty circles in all 8 positions, instead of just filled circles
        // See https://github.com/microsoft/vscode/issues/174521
        if (isMacintosh) {
            fontFamily += ', AppleBraille';
        }
        const letterSpacing = this._terminalConfigurationService.config.letterSpacing
            ? Math.max(Math.floor(this._terminalConfigurationService.config.letterSpacing), MINIMUM_LETTER_SPACING)
            : DEFAULT_LETTER_SPACING;
        const lineHeight = this._terminalConfigurationService.config.lineHeight
            ? Math.max(this._terminalConfigurationService.config.lineHeight, 1)
            : DEFAULT_LINE_HEIGHT;
        if (excludeDimensions) {
            return {
                fontFamily,
                fontSize,
                letterSpacing,
                lineHeight,
            };
        }
        // Get the character dimensions from xterm if it's available
        if (xtermCore?._renderService?._renderer.value) {
            const cellDims = xtermCore._renderService.dimensions.css.cell;
            if (cellDims?.width && cellDims?.height) {
                return {
                    fontFamily,
                    fontSize,
                    letterSpacing,
                    lineHeight,
                    charHeight: cellDims.height / lineHeight,
                    charWidth: cellDims.width - Math.round(letterSpacing) / w.devicePixelRatio,
                };
            }
        }
        // Fall back to measuring the font ourselves
        return this._measureFont(w, fontFamily, fontSize, letterSpacing, lineHeight);
    }
    _createCharMeasureElementIfNecessary() {
        if (!this._panelContainer) {
            throw new Error('Cannot measure element when terminal is not attached');
        }
        // Create charMeasureElement if it hasn't been created or if it was orphaned by its parent
        if (!this._charMeasureElement || !this._charMeasureElement.parentElement) {
            this._charMeasureElement = document.createElement('div');
            this._panelContainer.appendChild(this._charMeasureElement);
        }
        return this._charMeasureElement;
    }
    _getBoundingRectFor(char, fontFamily, fontSize) {
        let charMeasureElement;
        try {
            charMeasureElement = this._createCharMeasureElementIfNecessary();
        }
        catch {
            return undefined;
        }
        const style = charMeasureElement.style;
        style.display = 'inline-block';
        style.fontFamily = fontFamily;
        style.fontSize = fontSize + 'px';
        style.lineHeight = 'normal';
        charMeasureElement.innerText = char;
        const rect = charMeasureElement.getBoundingClientRect();
        style.display = 'none';
        return rect;
    }
    _measureFont(w, fontFamily, fontSize, letterSpacing, lineHeight) {
        const rect = this._getBoundingRectFor('X', fontFamily, fontSize);
        // Bounding client rect was invalid, use last font measurement if available.
        if (this._lastFontMeasurement && (!rect || !rect.width || !rect.height)) {
            return this._lastFontMeasurement;
        }
        this._lastFontMeasurement = {
            fontFamily,
            fontSize,
            letterSpacing,
            lineHeight,
            charWidth: 0,
            charHeight: 0,
        };
        if (rect && rect.width && rect.height) {
            this._lastFontMeasurement.charHeight = Math.ceil(rect.height);
            // Char width is calculated differently for DOM and the other renderer types. Refer to
            // how each renderer updates their dimensions in xterm.js
            if (this._terminalConfigurationService.config.gpuAcceleration === 'off') {
                this._lastFontMeasurement.charWidth = rect.width;
            }
            else {
                const deviceCharWidth = Math.floor(rect.width * w.devicePixelRatio);
                const deviceCellWidth = deviceCharWidth + Math.round(letterSpacing);
                const cssCellWidth = deviceCellWidth / w.devicePixelRatio;
                this._lastFontMeasurement.charWidth =
                    cssCellWidth - Math.round(letterSpacing) / w.devicePixelRatio;
            }
        }
        return this._lastFontMeasurement;
    }
}
// #endregion TerminalFontMetrics
// #region Utils
function clampInt(source, minimum, maximum, fallback) {
    let r = parseInt(source, 10);
    if (isNaN(r)) {
        return fallback;
    }
    if (typeof minimum === 'number') {
        r = Math.max(minimum, r);
    }
    if (typeof maximum === 'number') {
        r = Math.min(maximum, r);
    }
    return r;
}
// #endregion Utils
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBR2xHLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixtQkFBbUIsRUFHbkIsbUJBQW1CLEVBQ25CLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsdUJBQXVCLEdBRXZCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWpFLHVDQUF1QztBQUVoQyxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUNaLFNBQVEsVUFBVTtJQVFsQixJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUdELElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7SUFDbkMsQ0FBQztJQUVELFlBQ3dCLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUZpQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBTnBFLHFCQUFnQixHQUFHLElBQUks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