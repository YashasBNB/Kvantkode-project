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
var ChatEditorOptions_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IViewDescriptorService } from '../../../common/views.js';
let ChatEditorOptions = class ChatEditorOptions extends Disposable {
    static { ChatEditorOptions_1 = this; }
    static { this.lineHeightEm = 1.4; }
    get configuration() {
        return this._config;
    }
    static { this.relevantSettingIds = [
        'chat.editor.lineHeight',
        'chat.editor.fontSize',
        'chat.editor.fontFamily',
        'chat.editor.fontWeight',
        'chat.editor.wordWrap',
        'editor.cursorBlinking',
        'editor.fontLigatures',
        'editor.accessibilitySupport',
        'editor.bracketPairColorization.enabled',
        'editor.bracketPairColorization.independentColorPoolPerBracketType',
    ]; }
    constructor(viewId, foreground, inputEditorBackgroundColor, resultEditorBackgroundColor, configurationService, themeService, viewDescriptorService) {
        super();
        this.foreground = foreground;
        this.inputEditorBackgroundColor = inputEditorBackgroundColor;
        this.resultEditorBackgroundColor = resultEditorBackgroundColor;
        this.configurationService = configurationService;
        this.themeService = themeService;
        this.viewDescriptorService = viewDescriptorService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this.themeService.onDidColorThemeChange((e) => this.update()));
        this._register(this.viewDescriptorService.onDidChangeLocation((e) => {
            if (e.views.some((v) => v.id === viewId)) {
                this.update();
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (ChatEditorOptions_1.relevantSettingIds.some((id) => e.affectsConfiguration(id))) {
                this.update();
            }
        }));
        this.update();
    }
    update() {
        const editorConfig = this.configurationService.getValue('editor');
        // TODO shouldn't the setting keys be more specific?
        const chatEditorConfig = this.configurationService.getValue('chat')?.editor;
        const accessibilitySupport = this.configurationService.getValue('editor.accessibilitySupport');
        this._config = {
            foreground: this.themeService.getColorTheme().getColor(this.foreground),
            inputEditor: {
                backgroundColor: this.themeService
                    .getColorTheme()
                    .getColor(this.inputEditorBackgroundColor),
                accessibilitySupport,
            },
            resultEditor: {
                backgroundColor: this.themeService
                    .getColorTheme()
                    .getColor(this.resultEditorBackgroundColor),
                fontSize: chatEditorConfig.fontSize,
                fontFamily: chatEditorConfig.fontFamily === 'default'
                    ? editorConfig.fontFamily
                    : chatEditorConfig.fontFamily,
                fontWeight: chatEditorConfig.fontWeight,
                lineHeight: chatEditorConfig.lineHeight
                    ? chatEditorConfig.lineHeight
                    : ChatEditorOptions_1.lineHeightEm * chatEditorConfig.fontSize,
                bracketPairColorization: {
                    enabled: this.configurationService.getValue('editor.bracketPairColorization.enabled'),
                    independentColorPoolPerBracketType: this.configurationService.getValue('editor.bracketPairColorization.independentColorPoolPerBracketType'),
                },
                wordWrap: chatEditorConfig.wordWrap,
                fontLigatures: editorConfig.fontLigatures,
            },
        };
        this._onDidChange.fire();
    }
};
ChatEditorOptions = ChatEditorOptions_1 = __decorate([
    __param(4, IConfigurationService),
    __param(5, IThemeService),
    __param(6, IViewDescriptorService)
], ChatEditorOptions);
export { ChatEditorOptions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdE9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFLakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBc0MxRCxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7O2FBQ3hCLGlCQUFZLEdBQUcsR0FBRyxBQUFOLENBQU07SUFNMUMsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO2FBRXVCLHVCQUFrQixHQUFHO1FBQzVDLHdCQUF3QjtRQUN4QixzQkFBc0I7UUFDdEIsd0JBQXdCO1FBQ3hCLHdCQUF3QjtRQUN4QixzQkFBc0I7UUFDdEIsdUJBQXVCO1FBQ3ZCLHNCQUFzQjtRQUN0Qiw2QkFBNkI7UUFDN0Isd0NBQXdDO1FBQ3hDLG1FQUFtRTtLQUNuRSxBQVh5QyxDQVd6QztJQUVELFlBQ0MsTUFBMEIsRUFDVCxVQUFrQixFQUNsQiwwQkFBa0MsRUFDbEMsMkJBQW1DLEVBQzdCLG9CQUE0RCxFQUNwRSxZQUE0QyxFQUNuQyxxQkFBOEQ7UUFFdEYsS0FBSyxFQUFFLENBQUE7UUFQVSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBUTtR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