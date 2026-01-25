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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbENvbmZpZ3VyYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbEcsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixtQkFBbUIsRUFDbkIsc0JBQXNCLEVBQ3RCLG1CQUFtQixFQUduQixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0Qix1QkFBdUIsR0FFdkIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFakUsdUNBQXVDO0FBRWhDLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQ1osU0FBUSxVQUFVO0lBUWxCLElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBR0QsSUFBSSxlQUFlO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQTtJQUNuQyxDQUFDO0lBRUQsWUFDd0IscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBRmlDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFOcEUscUJBQWdCLEdBQUcs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