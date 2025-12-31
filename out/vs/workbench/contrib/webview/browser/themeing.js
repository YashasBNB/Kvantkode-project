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
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EDITOR_FONT_DEFAULTS, } from '../../../../editor/common/config/editorOptions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import * as colorRegistry from '../../../../platform/theme/common/colorRegistry.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { IWorkbenchThemeService, } from '../../../services/themes/common/workbenchThemeService.js';
let WebviewThemeDataProvider = class WebviewThemeDataProvider extends Disposable {
    constructor(_themeService, _configurationService) {
        super();
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._cachedWebViewThemeData = undefined;
        this._onThemeDataChanged = this._register(new Emitter());
        this.onThemeDataChanged = this._onThemeDataChanged.event;
        this._register(this._themeService.onDidColorThemeChange(() => {
            this._reset();
        }));
        const webviewConfigurationKeys = [
            'editor.fontFamily',
            'editor.fontWeight',
            'editor.fontSize',
            'accessibility.underlineLinks',
        ];
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (webviewConfigurationKeys.some((key) => e.affectsConfiguration(key))) {
                this._reset();
            }
        }));
    }
    getTheme() {
        return this._themeService.getColorTheme();
    }
    getWebviewThemeData() {
        if (!this._cachedWebViewThemeData) {
            const configuration = this._configurationService.getValue('editor');
            const editorFontFamily = configuration.fontFamily || EDITOR_FONT_DEFAULTS.fontFamily;
            const editorFontWeight = configuration.fontWeight || EDITOR_FONT_DEFAULTS.fontWeight;
            const editorFontSize = configuration.fontSize || EDITOR_FONT_DEFAULTS.fontSize;
            const linkUnderlines = this._configurationService.getValue('accessibility.underlineLinks');
            const theme = this._themeService.getColorTheme();
            const exportedColors = colorRegistry
                .getColorRegistry()
                .getColors()
                .reduce((colors, entry) => {
                const color = theme.getColor(entry.id);
                if (color) {
                    colors['vscode-' + entry.id.replace('.', '-')] = color.toString();
                }
                return colors;
            }, {});
            const styles = {
                'vscode-font-family': DEFAULT_FONT_FAMILY,
                'vscode-font-weight': 'normal',
                'vscode-font-size': '13px',
                'vscode-editor-font-family': editorFontFamily,
                'vscode-editor-font-weight': editorFontWeight,
                'vscode-editor-font-size': editorFontSize + 'px',
                'text-link-decoration': linkUnderlines ? 'underline' : 'none',
                ...exportedColors,
            };
            const activeTheme = ApiThemeClassName.fromTheme(theme);
            this._cachedWebViewThemeData = {
                styles,
                activeTheme,
                themeLabel: theme.label,
                themeId: theme.settingsId,
            };
        }
        return this._cachedWebViewThemeData;
    }
    _reset() {
        this._cachedWebViewThemeData = undefined;
        this._onThemeDataChanged.fire();
    }
};
WebviewThemeDataProvider = __decorate([
    __param(0, IWorkbenchThemeService),
    __param(1, IConfigurationService)
], WebviewThemeDataProvider);
export { WebviewThemeDataProvider };
var ApiThemeClassName;
(function (ApiThemeClassName) {
    ApiThemeClassName["light"] = "vscode-light";
    ApiThemeClassName["dark"] = "vscode-dark";
    ApiThemeClassName["highContrast"] = "vscode-high-contrast";
    ApiThemeClassName["highContrastLight"] = "vscode-high-contrast-light";
})(ApiThemeClassName || (ApiThemeClassName = {}));
(function (ApiThemeClassName) {
    function fromTheme(theme) {
        switch (theme.type) {
            case ColorScheme.LIGHT:
                return ApiThemeClassName.light;
            case ColorScheme.DARK:
                return ApiThemeClassName.dark;
            case ColorScheme.HIGH_CONTRAST_DARK:
                return ApiThemeClassName.highContrast;
            case ColorScheme.HIGH_CONTRAST_LIGHT:
                return ApiThemeClassName.highContrastLight;
        }
    }
    ApiThemeClassName.fromTheme = fromTheme;
})(ApiThemeClassName || (ApiThemeClassName = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvdGhlbWVpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxLQUFLLGFBQWEsTUFBTSxvREFBb0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDeEUsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLDBEQUEwRCxDQUFBO0FBVTFELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQU12RCxZQUN5QixhQUFzRCxFQUN2RCxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFIa0Msa0JBQWEsR0FBYixhQUFhLENBQXdCO1FBQ3RDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFQN0UsNEJBQXVCLEdBQWlDLFNBQVMsQ0FBQTtRQUV4RCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUMxRCx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBUWxFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxx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