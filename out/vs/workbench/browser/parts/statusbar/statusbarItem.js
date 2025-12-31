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
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { SimpleIconLabel } from '../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isTooltipWithCommands, ShowTooltipCommand, StatusbarEntryKinds, } from '../../../services/statusbar/browser/statusbar.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isThemeColor } from '../../../../editor/common/editorCommon.js';
import { addDisposableListener, EventType, hide, show, append, EventHelper, $, } from '../../../../base/browser/dom.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { renderIcon, renderLabelWithIcons, } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { spinningLoading, syncing } from '../../../../platform/theme/common/iconRegistry.js';
import { isMarkdownString, markdownStringEqual } from '../../../../base/common/htmlContent.js';
import { Gesture, EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let StatusbarEntryItem = class StatusbarEntryItem extends Disposable {
    get name() {
        return assertIsDefined(this.entry).name;
    }
    get hasCommand() {
        return typeof this.entry?.command !== 'undefined';
    }
    constructor(container, entry, hoverDelegate, commandService, hoverService, notificationService, telemetryService, themeService) {
        super();
        this.container = container;
        this.hoverDelegate = hoverDelegate;
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.themeService = themeService;
        this.entry = undefined;
        this.foregroundListener = this._register(new MutableDisposable());
        this.backgroundListener = this._register(new MutableDisposable());
        this.commandMouseListener = this._register(new MutableDisposable());
        this.commandTouchListener = this._register(new MutableDisposable());
        this.commandKeyboardListener = this._register(new MutableDisposable());
        this.hover = undefined;
        // Label Container
        this.labelContainer = $('a.statusbar-item-label', {
            role: 'button',
            tabIndex: -1, // allows screen readers to read title, but still prevents tab focus.
        });
        this._register(Gesture.addTarget(this.labelContainer)); // enable touch
        // Label (with support for progress)
        this.label = this._register(new StatusBarCodiconLabel(this.labelContainer));
        this.container.appendChild(this.labelContainer);
        // Beak Container
        this.beakContainer = $('.status-bar-item-beak-container');
        this.container.appendChild(this.beakContainer);
        this.update(entry);
    }
    update(entry) {
        // Update: Progress
        this.label.showProgress = entry.showProgress ?? false;
        // Update: Text
        if (!this.entry || entry.text !== this.entry.text) {
            this.label.text = entry.text;
            if (entry.text) {
                show(this.labelContainer);
            }
            else {
                hide(this.labelContainer);
            }
        }
        // Update: ARIA label
        //
        // Set the aria label on both elements so screen readers would read
        // the correct thing without duplication #96210
        if (!this.entry || entry.ariaLabel !== this.entry.ariaLabel) {
            this.container.setAttribute('aria-label', entry.ariaLabel);
            this.labelContainer.setAttribute('aria-label', entry.ariaLabel);
        }
        if (!this.entry || entry.role !== this.entry.role) {
            this.labelContainer.setAttribute('role', entry.role || 'button');
        }
        // Update: Hover
        if (!this.entry || !this.isEqualTooltip(this.entry, entry)) {
            let hoverOptions;
            let hoverTooltip;
            if (isTooltipWithCommands(entry.tooltip)) {
                hoverTooltip = entry.tooltip.content;
                hoverOptions = {
                    actions: entry.tooltip.commands.map((command) => ({
                        commandId: command.id,
                        label: command.title,
                        run: () => this.executeCommand(command),
                    })),
                };
            }
            else {
                hoverTooltip = entry.tooltip;
            }
            const hoverContents = isMarkdownString(hoverTooltip)
                ? { markdown: hoverTooltip, markdownNotSupportedFallback: undefined }
                : hoverTooltip;
            if (this.hover) {
                this.hover.update(hoverContents, hoverOptions);
            }
            else {
                this.hover = this._register(this.hoverService.setupManagedHover(this.hoverDelegate, this.container, hoverContents, hoverOptions));
            }
        }
        // Update: Command
        if (!this.entry || entry.command !== this.entry.command) {
            this.commandMouseListener.clear();
            this.commandTouchListener.clear();
            this.commandKeyboardListener.clear();
            const command = entry.command;
            if (command &&
                (command !== ShowTooltipCommand ||
                    this.hover) /* "Show Hover" is only valid when we have a hover */) {
                this.commandMouseListener.value = addDisposableListener(this.labelContainer, EventType.CLICK, () => this.executeCommand(command));
                this.commandTouchListener.value = addDisposableListener(this.labelContainer, TouchEventType.Tap, () => this.executeCommand(command));
                this.commandKeyboardListener.value = addDisposableListener(this.labelContainer, EventType.KEY_DOWN, (e) => {
                    const event = new StandardKeyboardEvent(e);
                    if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                        EventHelper.stop(e);
                        this.executeCommand(command);
                    }
                    else if (event.equals(9 /* KeyCode.Escape */) ||
                        event.equals(15 /* KeyCode.LeftArrow */) ||
                        event.equals(17 /* KeyCode.RightArrow */)) {
                        EventHelper.stop(e);
                        this.hover?.hide();
                    }
                });
                this.labelContainer.classList.remove('disabled');
            }
            else {
                this.labelContainer.classList.add('disabled');
            }
        }
        // Update: Beak
        if (!this.entry || entry.showBeak !== this.entry.showBeak) {
            if (entry.showBeak) {
                this.container.classList.add('has-beak');
            }
            else {
                this.container.classList.remove('has-beak');
            }
        }
        const hasBackgroundColor = !!entry.backgroundColor || (entry.kind && entry.kind !== 'standard');
        // Update: Kind
        if (!this.entry || entry.kind !== this.entry.kind) {
            for (const kind of StatusbarEntryKinds) {
                this.container.classList.remove(`${kind}-kind`);
            }
            if (entry.kind && entry.kind !== 'standard') {
                this.container.classList.add(`${entry.kind}-kind`);
            }
            this.container.classList.toggle('has-background-color', hasBackgroundColor);
        }
        // Update: Foreground
        if (!this.entry || entry.color !== this.entry.color) {
            this.applyColor(this.labelContainer, entry.color);
        }
        // Update: Background
        if (!this.entry || entry.backgroundColor !== this.entry.backgroundColor) {
            this.container.classList.toggle('has-background-color', hasBackgroundColor);
            this.applyColor(this.container, entry.backgroundColor, true);
        }
        // Remember for next round
        this.entry = entry;
    }
    isEqualTooltip({ tooltip }, { tooltip: otherTooltip }) {
        if (tooltip === undefined) {
            return otherTooltip === undefined;
        }
        if (isMarkdownString(tooltip)) {
            return isMarkdownString(otherTooltip) && markdownStringEqual(tooltip, otherTooltip);
        }
        return tooltip === otherTooltip;
    }
    async executeCommand(command) {
        // Custom command from us: Show tooltip
        if (command === ShowTooltipCommand) {
            this.hover?.show(true /* focus */);
        }
        // Any other command is going through command service
        else {
            const id = typeof command === 'string' ? command : command.id;
            const args = typeof command === 'string' ? [] : (command.arguments ?? []);
            this.telemetryService.publicLog2('workbenchActionExecuted', { id, from: 'status bar' });
            try {
                await this.commandService.executeCommand(id, ...args);
            }
            catch (error) {
                this.notificationService.error(toErrorMessage(error));
            }
        }
    }
    applyColor(container, color, isBackground) {
        let colorResult = undefined;
        if (isBackground) {
            this.backgroundListener.clear();
        }
        else {
            this.foregroundListener.clear();
        }
        if (color) {
            if (isThemeColor(color)) {
                colorResult = this.themeService.getColorTheme().getColor(color.id)?.toString();
                const listener = this.themeService.onDidColorThemeChange((theme) => {
                    const colorValue = theme.getColor(color.id)?.toString();
                    if (isBackground) {
                        container.style.backgroundColor = colorValue ?? '';
                    }
                    else {
                        container.style.color = colorValue ?? '';
                    }
                });
                if (isBackground) {
                    this.backgroundListener.value = listener;
                }
                else {
                    this.foregroundListener.value = listener;
                }
            }
            else {
                colorResult = color;
            }
        }
        if (isBackground) {
            container.style.backgroundColor = colorResult ?? '';
        }
        else {
            container.style.color = colorResult ?? '';
        }
    }
};
StatusbarEntryItem = __decorate([
    __param(3, ICommandService),
    __param(4, IHoverService),
    __param(5, INotificationService),
    __param(6, ITelemetryService),
    __param(7, IThemeService)
], StatusbarEntryItem);
export { StatusbarEntryItem };
class StatusBarCodiconLabel extends SimpleIconLabel {
    constructor(container) {
        super(container);
        this.container = container;
        this.progressCodicon = renderIcon(syncing);
        this.currentText = '';
        this.currentShowProgress = false;
    }
    set showProgress(showProgress) {
        if (this.currentShowProgress !== showProgress) {
            this.currentShowProgress = showProgress;
            this.progressCodicon = renderIcon(showProgress === 'syncing' ? syncing : spinningLoading);
            this.text = this.currentText;
        }
    }
    set text(text) {
        // Progress: insert progress codicon as first element as needed
        // but keep it stable so that the animation does not reset
        if (this.currentShowProgress) {
            // Append as needed
            if (this.container.firstChild !== this.progressCodicon) {
                this.container.appendChild(this.progressCodicon);
            }
            // Remove others
            for (const node of Array.from(this.container.childNodes)) {
                if (node !== this.progressCodicon) {
                    node.remove();
                }
            }
            // If we have text to show, add a space to separate from progress
            let textContent = text ?? '';
            if (textContent) {
                textContent = `\u00A0${textContent}`; // prepend non-breaking space
            }
            // Append new elements
            append(this.container, ...renderLabelWithIcons(textContent));
        }
        // No Progress: no special handling
        else {
            super.text = text;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFySXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3N0YXR1c2Jhci9zdGF0dXNiYXJJdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBRU4scUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixtQkFBbUIsR0FFbkIsTUFBTSxrREFBa0QsQ0FBQTtBQUt6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsU0FBUyxFQUNULElBQUksRUFDSixJQUFJLEVBQ0osTUFBTSxFQUNOLFdBQVcsRUFDWCxDQUFDLEdBQ0QsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFakYsT0FBTyxFQUNOLFVBQVUsRUFDVixvQkFBb0IsR0FDcEIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1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