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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0T3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUtqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFzQzFELElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTs7YUFDeEIsaUJBQVksR0FBRyxHQUFHLEFBQU4sQ0FBTTtJQU0xQyxJQUFXLGFBQWE7UUFDdkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7YUFFdUIsdUJBQWtCLEdBQUc7UUFDNUMsd0JBQXdCO1FBQ3hCLHNCQUFzQjtRQUN0Qix3QkFBd0I7UUFDeEIsd0JBQXdCO1FBQ3hCLHNCQUFzQjtRQUN0Qix1QkFBdUI7UUFDdkIsc0JBQXNCO1FBQ3RCLDZCQUE2QjtRQUM3Qix3Q0FBd0M7UUFDeEMsbUVBQW1FO0tBQ25FLEFBWHlDLENBV3pDO0lBRUQsWUFDQyxNQUEwQixFQUNULFVBQWtCLEVBQ2xCLDBCQUFrQyxFQUNsQywyQkFBbUMsRUFDN0Isb0JBQTRELEVBQ3BFLFlBQTRDLEVBQ25DLHFCQUE4RDtRQUV0RixLQUFLLEVBQUUsQ0FBQTtRQVBVLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsK0JB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