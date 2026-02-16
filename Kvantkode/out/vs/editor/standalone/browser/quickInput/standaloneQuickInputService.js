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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVF1aWNrSW5wdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3F1aWNrSW5wdXQvc3RhbmRhbG9uZVF1aWNrSW5wdXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBT3hELE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFZakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFLbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxpQkFBaUI7SUFHNUQsWUFDQyxNQUFtQixFQUNJLG9CQUEyQyxFQUM5QyxpQkFBcUMsRUFDMUMsWUFBMkIsRUFDdEIsaUJBQXFDLEVB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