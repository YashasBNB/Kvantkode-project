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
import './standaloneQuickInput.css';
import { Event } from '../../../../base/common/event.js';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorScopedLayoutService } from '../standaloneLayoutService.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { QuickInputService } from '../../../../platform/quickinput/browser/quickInputService.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let EditorScopedQuickInputService = class EditorScopedQuickInputService extends QuickInputService {
    constructor(editor, instantiationService, contextKeyService, themeService, codeEditorService, configurationService) {
        super(instantiationService, contextKeyService, themeService, new EditorScopedLayoutService(editor.getContainerDomNode(), codeEditorService), configurationService);
        this.host = undefined;
        // Use the passed in code editor as host for the quick input widget
        const contribution = QuickInputEditorContribution.get(editor);
        if (contribution) {
            const widget = contribution.widget;
            this.host = {
                _serviceBrand: undefined,
                get mainContainer() {
                    return widget.getDomNode();
                },
                getContainer() {
                    return widget.getDomNode();
                },
                whenContainerStylesLoaded() {
                    return undefined;
                },
                get containers() {
                    return [widget.getDomNode()];
                },
                get activeContainer() {
                    return widget.getDomNode();
                },
                get mainContainerDimension() {
                    return editor.getLayoutInfo();
                },
                get activeContainerDimension() {
                    return editor.getLayoutInfo();
                },
                get onDidLayoutMainContainer() {
                    return editor.onDidLayoutChange;
                },
                get onDidLayoutActiveContainer() {
                    return editor.onDidLayoutChange;
                },
                get onDidLayoutContainer() {
                    return Event.map(editor.onDidLayoutChange, (dimension) => ({
                        container: widget.getDomNode(),
                        dimension,
                    }));
                },
                get onDidChangeActiveContainer() {
                    return Event.None;
                },
                get onDidAddContainer() {
                    return Event.None;
                },
                get mainContainerOffset() {
                    return { top: 0, quickPickTop: 0 };
                },
                get activeContainerOffset() {
                    return { top: 0, quickPickTop: 0 };
                },
                focus: () => editor.focus(),
            };
        }
        else {
            this.host = undefined;
        }
    }
    createController() {
        return super.createController(this.host);
    }
};
EditorScopedQuickInputService = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, IThemeService),
    __param(4, ICodeEditorService),
    __param(5, IConfigurationService)
], EditorScopedQuickInputService);
let StandaloneQuickInputService = class StandaloneQuickInputService {
    get activeService() {
        const editor = this.codeEditorService.getFocusedCodeEditor();
        if (!editor) {
            throw new Error('Quick input service needs a focused editor to work.');
        }
        // Find the quick input implementation for the focused
        // editor or create it lazily if not yet created
        let quickInputService = this.mapEditorToService.get(editor);
        if (!quickInputService) {
            const newQuickInputService = (quickInputService = this.instantiationService.createInstance(EditorScopedQuickInputService, editor));
            this.mapEditorToService.set(editor, quickInputService);
            createSingleCallFunction(editor.onDidDispose)(() => {
                newQuickInputService.dispose();
                this.mapEditorToService.delete(editor);
            });
        }
        return quickInputService;
    }
    get currentQuickInput() {
        return this.activeService.currentQuickInput;
    }
    get quickAccess() {
        return this.activeService.quickAccess;
    }
    get backButton() {
        return this.activeService.backButton;
    }
    get onShow() {
        return this.activeService.onShow;
    }
    get onHide() {
        return this.activeService.onHide;
    }
    constructor(instantiationService, codeEditorService) {
        this.instantiationService = instantiationService;
        this.codeEditorService = codeEditorService;
        this.mapEditorToService = new Map();
    }
    pick(picks, options, token = CancellationToken.None) {
        return this.activeService /* TS fail */
            .pick(picks, options, token);
    }
    input(options, token) {
        return this.activeService.input(options, token);
    }
    createQuickPick(options = { useSeparators: false }) {
        return this.activeService.createQuickPick(options);
    }
    createInputBox() {
        return this.activeService.createInputBox();
    }
    createQuickWidget() {
        return this.activeService.createQuickWidget();
    }
    focus() {
        return this.activeService.focus();
    }
    toggle() {
        return this.activeService.toggle();
    }
    navigate(next, quickNavigate) {
        return this.activeService.navigate(next, quickNavigate);
    }
    accept() {
        return this.activeService.accept();
    }
    back() {
        return this.activeService.back();
    }
    cancel() {
        return this.activeService.cancel();
    }
    setAlignment(alignment) {
        return this.activeService.setAlignment(alignment);
    }
    toggleHover() {
        return this.activeService.toggleHover();
    }
};
StandaloneQuickInputService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ICodeEditorService)
], StandaloneQuickInputService);
export { StandaloneQuickInputService };
export class QuickInputEditorContribution {
    static { this.ID = 'editor.controller.quickInput'; }
    static get(editor) {
        return editor.getContribution(QuickInputEditorContribution.ID);
    }
    constructor(editor) {
        this.editor = editor;
        this.widget = new QuickInputEditorWidget(this.editor);
    }
    dispose() {
        this.widget.dispose();
    }
}
export class QuickInputEditorWidget {
    static { this.ID = 'editor.contrib.quickInputWidget'; }
    constructor(codeEditor) {
        this.codeEditor = codeEditor;
        this.domNode = document.createElement('div');
        this.codeEditor.addOverlayWidget(this);
    }
    getId() {
        return QuickInputEditorWidget.ID;
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        return { preference: 2 /* OverlayWidgetPositionPreference.TOP_CENTER */ };
    }
    dispose() {
        this.codeEditor.removeOverlayWidget(this);
    }
}
registerEditorContribution(QuickInputEditorContribution.ID, QuickInputEditorContribution, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVF1aWNrSW5wdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9xdWlja0lucHV0L3N0YW5kYWxvbmVRdWlja0lucHV0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQU94RCxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBWWpGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBS25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsaUJBQWlCO0lBRzVELFlBQ0MsTUFBbUIsRUFDSSxvQkFBMkMsRUFDOUMsaUJBQXFDLEVBQzFDLFlBQTJCLEVBQ3RCLGlCQUFxQyxFQUNsQyxvQkFBMkM7UUFFbEUsS0FBSyxD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