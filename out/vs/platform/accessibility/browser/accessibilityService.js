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
import { addDisposableListener } from '../../../base/browser/dom.js';
import { alert, status } from '../../../base/browser/ui/aria/aria.js';
import { mainWindow } from '../../../base/browser/window.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED, } from '../common/accessibility.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
let AccessibilityService = class AccessibilityService extends Disposable {
    constructor(_contextKeyService, _layoutService, _configurationService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._layoutService = _layoutService;
        this._configurationService = _configurationService;
        this._accessibilitySupport = 0 /* AccessibilitySupport.Unknown */;
        this._onDidChangeScreenReaderOptimized = new Emitter();
        this._onDidChangeReducedMotion = new Emitter();
        this._onDidChangeLinkUnderline = new Emitter();
        this._accessibilityModeEnabledContext = CONTEXT_ACCESSIBILITY_MODE_ENABLED.bindTo(this._contextKeyService);
        const updateContextKey = () => this._accessibilityModeEnabledContext.set(this.isScreenReaderOptimized());
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.accessibilitySupport')) {
                updateContextKey();
                this._onDidChangeScreenReaderOptimized.fire();
            }
            if (e.affectsConfiguration('workbench.reduceMotion')) {
                this._configMotionReduced = this._configurationService.getValue('workbench.reduceMotion');
                this._onDidChangeReducedMotion.fire();
            }
        }));
        updateContextKey();
        this._register(this.onDidChangeScreenReaderOptimized(() => updateContextKey()));
        const reduceMotionMatcher = mainWindow.matchMedia(`(prefers-reduced-motion: reduce)`);
        this._systemMotionReduced = reduceMotionMatcher.matches;
        this._configMotionReduced = this._configurationService.getValue('workbench.reduceMotion');
        this._linkUnderlinesEnabled = this._configurationService.getValue('accessibility.underlineLinks');
        this.initReducedMotionListeners(reduceMotionMatcher);
        this.initLinkUnderlineListeners();
    }
    initReducedMotionListeners(reduceMotionMatcher) {
        this._register(addDisposableListener(reduceMotionMatcher, 'change', () => {
            this._systemMotionReduced = reduceMotionMatcher.matches;
            if (this._configMotionReduced === 'auto') {
                this._onDidChangeReducedMotion.fire();
            }
        }));
        const updateRootClasses = () => {
            const reduce = this.isMotionReduced();
            this._layoutService.mainContainer.classList.toggle('reduce-motion', reduce);
            this._layoutService.mainContainer.classList.toggle('enable-motion', !reduce);
        };
        updateRootClasses();
        this._register(this.onDidChangeReducedMotion(() => updateRootClasses()));
    }
    initLinkUnderlineListeners() {
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('accessibility.underlineLinks')) {
                const linkUnderlinesEnabled = this._configurationService.getValue('accessibility.underlineLinks');
                this._linkUnderlinesEnabled = linkUnderlinesEnabled;
                this._onDidChangeLinkUnderline.fire();
            }
        }));
        const updateLinkUnderlineClasses = () => {
            const underlineLinks = this._linkUnderlinesEnabled;
            this._layoutService.mainContainer.classList.toggle('underline-links', underlineLinks);
        };
        updateLinkUnderlineClasses();
        this._register(this.onDidChangeLinkUnderlines(() => updateLinkUnderlineClasses()));
    }
    onDidChangeLinkUnderlines(listener) {
        return this._onDidChangeLinkUnderline.event(listener);
    }
    get onDidChangeScreenReaderOptimized() {
        return this._onDidChangeScreenReaderOptimized.event;
    }
    isScreenReaderOptimized() {
        const config = this._configurationService.getValue('editor.accessibilitySupport');
        return (config === 'on' ||
            (config === 'auto' && this._accessibilitySupport === 2 /* AccessibilitySupport.Enabled */));
    }
    get onDidChangeReducedMotion() {
        return this._onDidChangeReducedMotion.event;
    }
    isMotionReduced() {
        const config = this._configMotionReduced;
        return config === 'on' || (config === 'auto' && this._systemMotionReduced);
    }
    alwaysUnderlineAccessKeys() {
        return Promise.resolve(false);
    }
    getAccessibilitySupport() {
        return this._accessibilitySupport;
    }
    setAccessibilitySupport(accessibilitySupport) {
        if (this._accessibilitySupport === accessibilitySupport) {
            return;
        }
        this._accessibilitySupport = accessibilitySupport;
        this._onDidChangeScreenReaderOptimized.fire();
    }
    alert(message) {
        alert(message);
    }
    status(message) {
        status(message);
    }
};
AccessibilityService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ILayoutService),
    __param(2, IConfigurationService)
], AccessibilityService);
export { AccessibilityService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJpbGl0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sa0NBQWtDLEdBRWxDLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9ELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQWNuRCxZQUNxQixrQkFBdUQsRUFDM0QsY0FBK0MsRUFDeEMscUJBQStEO1FBRXRGLEtBQUssRUFBRSxDQUFBO1FBSjhCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDMUMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3JCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFiN0UsMEJBQXFCLHdDQUErQjtRQUMzQyxzQ0FBaUMsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBSXZELDhC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