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
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { Widget } from '../../../../../base/browser/ui/widget.js';
import * as dom from '../../../../../base/browser/dom.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
const $ = dom.$;
let TerminalHover = class TerminalHover extends Disposable {
    constructor(_targetOptions, _text, _actions, _linkHandler, _hoverService, _configurationService) {
        super();
        this._targetOptions = _targetOptions;
        this._text = _text;
        this._actions = _actions;
        this._linkHandler = _linkHandler;
        this._hoverService = _hoverService;
        this._configurationService = _configurationService;
        this.id = 'hover';
    }
    attach(container) {
        const showLinkHover = this._configurationService.getValue("terminal.integrated.showLinkHover" /* TerminalSettingId.ShowLinkHover */);
        if (!showLinkHover) {
            return;
        }
        const target = new CellHoverTarget(container, this._targetOptions);
        const hover = this._hoverService.showInstantHover({
            target,
            content: this._text,
            actions: this._actions,
            linkHandler: this._linkHandler,
            // .xterm-hover lets xterm know that the hover is part of a link
            additionalClasses: ['xterm-hover'],
        });
        if (hover) {
            this._register(hover);
        }
    }
};
TerminalHover = __decorate([
    __param(4, IHoverService),
    __param(5, IConfigurationService)
], TerminalHover);
export { TerminalHover };
class CellHoverTarget extends Widget {
    get targetElements() {
        return this._targetElements;
    }
    constructor(container, _options) {
        super();
        this._options = _options;
        this._targetElements = [];
        this._domNode = $('div.terminal-hover-targets.xterm-hover');
        const rowCount = this._options.viewportRange.end.y - this._options.viewportRange.start.y + 1;
        // Add top target row
        const width = (this._options.viewportRange.end.y > this._options.viewportRange.start.y
            ? this._options.terminalDimensions.width - this._options.viewportRange.start.x
            : this._options.viewportRange.end.x - this._options.viewportRange.start.x + 1) *
            this._options.cellDimensions.width;
        const topTarget = $('div.terminal-hover-target.hoverHighlight');
        topTarget.style.left = `${this._options.viewportRange.start.x * this._options.cellDimensions.width}px`;
        topTarget.style.bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.start.y - 1) * this._options.cellDimensions.height}px`;
        topTarget.style.width = `${width}px`;
        topTarget.style.height = `${this._options.cellDimensions.height}px`;
        this._targetElements.push(this._domNode.appendChild(topTarget));
        // Add middle target rows
        if (rowCount > 2) {
            const middleTarget = $('div.terminal-hover-target.hoverHighlight');
            middleTarget.style.left = `0px`;
            middleTarget.style.bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.start.y - 1 - (rowCount - 2)) * this._options.cellDimensions.height}px`;
            middleTarget.style.width = `${this._options.terminalDimensions.width * this._options.cellDimensions.width}px`;
            middleTarget.style.height = `${(rowCount - 2) * this._options.cellDimensions.height}px`;
            this._targetElements.push(this._domNode.appendChild(middleTarget));
        }
        // Add bottom target row
        if (rowCount > 1) {
            const bottomTarget = $('div.terminal-hover-target.hoverHighlight');
            bottomTarget.style.left = `0px`;
            bottomTarget.style.bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.end.y - 1) * this._options.cellDimensions.height}px`;
            bottomTarget.style.width = `${(this._options.viewportRange.end.x + 1) * this._options.cellDimensions.width}px`;
            bottomTarget.style.height = `${this._options.cellDimensions.height}px`;
            this._targetElements.push(this._domNode.appendChild(bottomTarget));
        }
        if (this._options.modifierDownCallback && this._options.modifierUpCallback) {
            let down = false;
            this._register(dom.addDisposableListener(container.ownerDocument, 'keydown', (e) => {
                if (e.ctrlKey && !down) {
                    down = true;
                    this._options.modifierDownCallback();
                }
            }));
            this._register(dom.addDisposableListener(container.ownerDocument, 'keyup', (e) => {
                if (!e.ctrlKey) {
                    down = false;
                    this._options.modifierUpCallback();
                }
            }));
        }
        container.appendChild(this._domNode);
        this._register(toDisposable(() => this._domNode?.remove()));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxIb3ZlcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci93aWRnZXRzL3Rlcm1pbmFsSG92ZXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFakUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFJckcsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQVVSLElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWMsU0FBUSxVQUFVO0lBRzVDLFlBQ2tCLGNBQXVDLEVBQ3ZDLEtBQXNCLEVBQ3RCLFFBQW9DLEVBQ3BDLFlBQXNDLEVBQ3hDLGFBQTZDLEVBQ3JDLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQVBVLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUN2QyxVQUFLLEdBQUwsS0FBSyxDQUFpQjtRQUN0QixhQUFRLEdBQVIsUUFBUSxDQUE0QjtRQUNwQyxpQkFBWSxHQUFaLFlBQVksQ0FBMEI7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDcEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQVI1RSxPQUFFLEdBQUcsT0FBTyxDQUFBO0lBV3JCLENBQUM7SUFFRCxNQUFNLENBQUMsU0FBc0I7UUFDNUIsTUFBTSxh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