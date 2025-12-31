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
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { addStandardDisposableListener, isHTMLElement } from '../../../base/browser/dom.js';
export const IHoverService = createDecorator('hoverService');
let WorkbenchHoverDelegate = class WorkbenchHoverDelegate extends Disposable {
    get delay() {
        if (this.isInstantlyHovering()) {
            return 0; // show instantly when a hover was recently shown
        }
        if (this.hoverOptions?.dynamicDelay) {
            return (content) => this.hoverOptions?.dynamicDelay?.(content) ?? this._delay;
        }
        return this._delay;
    }
    constructor(placement, hoverOptions, overrideOptions = {}, configurationService, hoverService) {
        super();
        this.placement = placement;
        this.hoverOptions = hoverOptions;
        this.overrideOptions = overrideOptions;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.lastHoverHideTime = 0;
        this.timeLimit = 200;
        this.hoverDisposables = this._register(new DisposableStore());
        this._delay = this.configurationService.getValue('workbench.hover.delay');
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.hover.delay')) {
                this._delay = this.configurationService.getValue('workbench.hover.delay');
            }
        }));
    }
    showHover(options, focus) {
        const overrideOptions = typeof this.overrideOptions === 'function'
            ? this.overrideOptions(options, focus)
            : this.overrideOptions;
        // close hover on escape
        this.hoverDisposables.clear();
        const targets = isHTMLElement(options.target) ? [options.target] : options.target.targetElements;
        for (const target of targets) {
            this.hoverDisposables.add(addStandardDisposableListener(target, 'keydown', (e) => {
                if (e.equals(9 /* KeyCode.Escape */)) {
                    this.hoverService.hideHover();
                }
            }));
        }
        const id = isHTMLElement(options.content)
            ? undefined
            : typeof options.content === 'string'
                ? options.content.toString()
                : options.content.value;
        return this.hoverService.showInstantHover({
            ...options,
            ...overrideOptions,
            persistence: {
                hideOnKeyDown: true,
                ...overrideOptions.persistence,
            },
            id,
            appearance: {
                ...options.appearance,
                compact: true,
                skipFadeInAnimation: this.isInstantlyHovering(),
                ...overrideOptions.appearance,
            },
        }, focus);
    }
    isInstantlyHovering() {
        return !!this.hoverOptions?.instantHover && Date.now() - this.lastHoverHideTime < this.timeLimit;
    }
    setInstantHoverTimeLimit(timeLimit) {
        if (!this.hoverOptions?.instantHover) {
            throw new Error('Instant hover is not enabled');
        }
        this.timeLimit = timeLimit;
    }
    onDidHideHover() {
        this.hoverDisposables.clear();
        if (this.hoverOptions?.instantHover) {
            this.lastHoverHideTime = Date.now();
        }
    }
};
WorkbenchHoverDelegate = __decorate([
    __param(3, IConfigurationService),
    __param(4, IHoverService)
], WorkbenchHoverDelegate);
export { WorkbenchHoverDelegate };
// TODO@benibenj remove this, only temp fix for contextviews
export const nativeHoverDelegate = {
    showHover: function () {
        throw new Error('Native hover function not implemented.');
    },
    delay: 0,
    showNativeHover: true,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9ob3Zlci9icm93c2VyL2hvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQVMzRixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFnQixjQUFjLENBQUMsQ0FBQTtBQVdwRSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFLckQsSUFBSSxLQUFLO1FBQ1IsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxDQUFBLENBQUMsaURBQWlEO1FBQzNELENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLENBQUM7WUFDckMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQzlFLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUlELFlBQ2lCLFNBQThCLEVBQzdCLFlBQTRDLEVBQ3JELGtCQUUyRSxFQUFFLEVBQzlELG9CQUE0RCxFQUNwRSxZQUE0QztRQUUzRCxLQUFLLEVBQUUsQ0FBQTtRQVJTLGNBQVMsR0FBVCxT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