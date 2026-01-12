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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0lucHV0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBZXhELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsdUJBQXVCLEVBQ3ZCLHFCQUFxQixFQUNyQiw0QkFBNEIsRUFDNUIsd0JBQXdCLEVBQ3hCLG1CQUFtQixFQUNuQixhQUFhLEdBQ2IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGFBQWEsRUFDYixpQkFBaUIsRUFDakIscUJBQXFCLEVBQ3JCLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsNkJBQTZCLEVBQzdCLDZCQUE2QixFQUM3QixpQ0FBaUMsRUFDakMseUJBQXlCLEVBQ3pCLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVF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