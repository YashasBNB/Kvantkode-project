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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxIb3ZlcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvd2lkZ2V0cy90ZXJtaW5hbEhvdmVyV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFbEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWpFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBSXJHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFVUixJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFjLFNBQVEsVUFBVTtJQUc1QyxZQUNrQixjQUF1QyxFQUN2QyxLQUFzQixFQUN0QixRQUFvQyxFQUNwQyxZQUFzQyxFQUN4QyxhQUE2QyxFQUNyQyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFQVSxtQkFBYyxHQUFkLGNBQWMsQ0FBeUI7UUFDdkMsVUFBSyxHQUFMLEtBQUssQ0FBaUI7UUFDdEIsYUFBUSxHQUFSLFFBQVEsQ0FBNEI7UUFDcEMsaUJBQVksR0FBWixZQUFZLENBQTBCO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3BCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFSNUUsT0FBRSxHQUFHLE9BQU8sQ0FBQTtJQVdyQixDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQXNCO1FBQzVCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFB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