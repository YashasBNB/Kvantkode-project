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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { IContextKeyService, RawContextKey, } from '../../contextkey/common/contextkey.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
import { IOpenerService } from '../../opener/common/opener.js';
import { QuickAccessController } from './quickAccess.js';
import { defaultButtonStyles, defaultCountBadgeStyles, defaultInputBoxStyles, defaultKeybindingLabelStyles, defaultProgressBarStyles, defaultToggleStyles, getListStyles, } from '../../theme/browser/defaultStyles.js';
import { activeContrastBorder, asCssVariable, pickerGroupBorder, pickerGroupForeground, quickInputBackground, quickInputForeground, quickInputListFocusBackground, quickInputListFocusForeground, quickInputListFocusIconForeground, quickInputTitleBackground, widgetBorder, widgetShadow, } from '../../theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../theme/common/themeService.js';
import { QuickInputHoverDelegate } from './quickInput.js';
import { QuickInputController } from './quickInputController.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { getWindow } from '../../../base/browser/dom.js';
let QuickInputService = class QuickInputService extends Themable {
    get backButton() {
        return this.controller.backButton;
    }
    get controller() {
        if (!this._controller) {
            this._controller = this._register(this.createController());
        }
        return this._controller;
    }
    get hasController() {
        return !!this._controller;
    }
    get currentQuickInput() {
        return this.controller.currentQuickInput;
    }
    get quickAccess() {
        if (!this._quickAccess) {
            this._quickAccess = this._register(this.instantiationService.createInstance(QuickAccessController));
        }
        return this._quickAccess;
    }
    constructor(instantiationService, contextKeyService, themeService, layoutService, configurationService) {
        super(themeService);
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this._onShow = this._register(new Emitter());
        this.onShow = this._onShow.event;
        this._onHide = this._register(new Emitter());
        this.onHide = this._onHide.event;
        this.contexts = new Map();
    }
    createController(host = this.layoutService, options) {
        const defaultOptions = {
            idPrefix: 'quickInput_',
            container: host.activeContainer,
            ignoreFocusOut: () => false,
            backKeybindingLabel: () => undefined,
            setContextKey: (id) => this.setContextKey(id),
            linkOpenerDelegate: (content) => {
                // HACK: https://github.com/microsoft/vscode/issues/173691
                this.instantiationService.invokeFunction((accessor) => {
                    const openerService = accessor.get(IOpenerService);
                    openerService.open(content, { allowCommands: true, fromUserGesture: true });
                });
            },
            returnFocus: () => host.focus(),
            styles: this.computeStyles(),
            hoverDelegate: this._register(this.instantiationService.createInstance(QuickInputHoverDelegate)),
        };
        const controller = this._register(this.instantiationService.createInstance(QuickInputController, {
            ...defaultOptions,
            ...options,
        }));
        controller.layout(host.activeContainerDimension, host.activeContainerOffset.quickPickTop);
        // Layout changes
        this._register(host.onDidLayoutActiveContainer((dimension) => {
            if (getWindow(host.activeContainer) === getWindow(controller.container)) {
                controller.layout(dimension, host.activeContainerOffset.quickPickTop);
            }
        }));
        this._register(host.onDidChangeActiveContainer(() => {
            if (controller.isVisible()) {
                return;
            }
            controller.layout(host.activeContainerDimension, host.activeContainerOffset.quickPickTop);
        }));
        // Context keys
        this._register(controller.onShow(() => {
            this.resetContextKeys();
            this._onShow.fire();
        }));
        this._register(controller.onHide(() => {
            this.resetContextKeys();
            this._onHide.fire();
        }));
        return controller;
    }
    setContextKey(id) {
        let key;
        if (id) {
            key = this.contexts.get(id);
            if (!key) {
                key = new RawContextKey(id, false).bindTo(this.contextKeyService);
                this.contexts.set(id, key);
            }
        }
        if (key && key.get()) {
            return; // already active context
        }
        this.resetContextKeys();
        key?.set(true);
    }
    resetContextKeys() {
        this.contexts.forEach((context) => {
            if (context.get()) {
                context.reset();
            }
        });
    }
    pick(picks, options, token = CancellationToken.None) {
        return this.controller.pick(picks, options, token);
    }
    input(options = {}, token = CancellationToken.None) {
        return this.controller.input(options, token);
    }
    createQuickPick(options = { useSeparators: false }) {
        return this.controller.createQuickPick(options);
    }
    createInputBox() {
        return this.controller.createInputBox();
    }
    createQuickWidget() {
        return this.controller.createQuickWidget();
    }
    focus() {
        this.controller.focus();
    }
    toggle() {
        this.controller.toggle();
    }
    navigate(next, quickNavigate) {
        this.controller.navigate(next, quickNavigate);
    }
    accept(keyMods) {
        return this.controller.accept(keyMods);
    }
    back() {
        return this.controller.back();
    }
    cancel() {
        return this.controller.cancel();
    }
    setAlignment(alignment) {
        this.controller.setAlignment(alignment);
    }
    toggleHover() {
        if (this.hasController) {
            this.controller.toggleHover();
        }
    }
    updateStyles() {
        if (this.hasController) {
            this.controller.applyStyles(this.computeStyles());
        }
    }
    computeStyles() {
        return {
            widget: {
                quickInputBackground: asCssVariable(quickInputBackground),
                quickInputForeground: asCssVariable(quickInputForeground),
                quickInputTitleBackground: asCssVariable(quickInputTitleBackground),
                widgetBorder: asCssVariable(widgetBorder),
                widgetShadow: asCssVariable(widgetShadow),
            },
            inputBox: defaultInputBoxStyles,
            toggle: defaultToggleStyles,
            countBadge: defaultCountBadgeStyles,
            button: defaultButtonStyles,
            progressBar: defaultProgressBarStyles,
            keybindingLabel: defaultKeybindingLabelStyles,
            list: getListStyles({
                listBackground: quickInputBackground,
                listFocusBackground: quickInputListFocusBackground,
                listFocusForeground: quickInputListFocusForeground,
                // Look like focused when inactive.
                listInactiveFocusForeground: quickInputListFocusForeground,
                listInactiveSelectionIconForeground: quickInputListFocusIconForeground,
                listInactiveFocusBackground: quickInputListFocusBackground,
                listFocusOutline: activeContrastBorder,
                listInactiveFocusOutline: activeContrastBorder,
            }),
            pickerGroup: {
                pickerGroupBorder: asCssVariable(pickerGroupBorder),
                pickerGroupForeground: asCssVariable(pickerGroupForeground),
            },
        };
    }
};
QuickInputService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IThemeService),
    __param(3, ILayoutService),
    __param(4, IConfigurationService)
], QuickInputService);
export { QuickInputService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFFTixrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQWV4RCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHVCQUF1QixFQUN2QixxQkFBcUIsRUFDckIsNEJBQTRCLEVBQzVCLHdCQUF3QixFQUN4QixtQkFBbUIsRUFDbkIsYUFBYSxHQUNiLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixhQUFhLEVBQ2IsaUJBQWlCLEVBQ2pCLHFCQUFxQixFQUNyQixvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsaUNBQWlDLEVBQ2pDLHlCQUF5QixFQUN6QixZQUFZLEVBQ1osWUFBWSxHQUNaLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RSxPQUFP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