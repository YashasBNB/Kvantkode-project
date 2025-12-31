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
import './media/exceptionWidget.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import { EDITOR_CONTRIBUTION_ID, } from '../common/debug.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { LinkDetector } from './linkDetector.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
const $ = dom.$;
// theming
const debugExceptionWidgetBorder = registerColor('debugExceptionWidget.border', '#a31515', nls.localize('debugExceptionWidgetBorder', 'Exception widget border color.'));
const debugExceptionWidgetBackground = registerColor('debugExceptionWidget.background', { dark: '#420b0d', light: '#f1dfde', hcDark: '#420b0d', hcLight: '#f1dfde' }, nls.localize('debugExceptionWidgetBackground', 'Exception widget background color.'));
let ExceptionWidget = class ExceptionWidget extends ZoneWidget {
    constructor(editor, exceptionInfo, debugSession, themeService, instantiationService) {
        super(editor, {
            showFrame: true,
            showArrow: true,
            isAccessible: true,
            frameWidth: 1,
            className: 'exception-widget-container',
        });
        this.exceptionInfo = exceptionInfo;
        this.debugSession = debugSession;
        this.instantiationService = instantiationService;
        this.applyTheme(themeService.getColorTheme());
        this._disposables.add(themeService.onDidColorThemeChange(this.applyTheme.bind(this)));
        this.create();
        const onDidLayoutChangeScheduler = new RunOnceScheduler(() => this._doLayout(undefined, undefined), 50);
        this._disposables.add(this.editor.onDidLayoutChange(() => onDidLayoutChangeScheduler.schedule()));
        this._disposables.add(onDidLayoutChangeScheduler);
    }
    applyTheme(theme) {
        this.backgroundColor = theme.getColor(debugExceptionWidgetBackground);
        const frameColor = theme.getColor(debugExceptionWidgetBorder);
        this.style({
            arrowColor: frameColor,
            frameColor: frameColor,
        }); // style() will trigger _applyStyles
    }
    _applyStyles() {
        if (this.container) {
            this.container.style.backgroundColor = this.backgroundColor
                ? this.backgroundColor.toString()
                : '';
        }
        super._applyStyles();
    }
    _fillContainer(container) {
        this.setCssClass('exception-widget');
        // Set the font size and line height to the one from the editor configuration.
        const fontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
        container.style.fontSize = `${fontInfo.fontSize}px`;
        container.style.lineHeight = `${fontInfo.lineHeight}px`;
        container.tabIndex = 0;
        const title = $('.title');
        const label = $('.label');
        dom.append(title, label);
        const actions = $('.actions');
        dom.append(title, actions);
        label.textContent = this.exceptionInfo.id
            ? nls.localize('exceptionThrownWithId', 'Exception has occurred: {0}', this.exceptionInfo.id)
            : nls.localize('exceptionThrown', 'Exception has occurred.');
        let ariaLabel = label.textContent;
        const actionBar = new ActionBar(actions);
        actionBar.push(new Action('editor.closeExceptionWidget', nls.localize('close', 'Close'), ThemeIcon.asClassName(widgetClose), true, async () => {
            const contribution = this.editor.getContribution(EDITOR_CONTRIBUTION_ID);
            contribution?.closeExceptionWidget();
        }), { label: false, icon: true });
        dom.append(container, title);
        if (this.exceptionInfo.description) {
            const description = $('.description');
            description.textContent = this.exceptionInfo.description;
            ariaLabel += ', ' + this.exceptionInfo.description;
            dom.append(container, description);
        }
        if (this.exceptionInfo.details && this.exceptionInfo.details.stackTrace) {
            const stackTrace = $('.stack-trace');
            const linkDetector = this.instantiationService.createInstance(LinkDetector);
            const linkedStackTrace = linkDetector.linkify(this.exceptionInfo.details.stackTrace, true, this.debugSession ? this.debugSession.root : undefined, undefined, { type: 0 /* DebugLinkHoverBehavior.Rich */, store: this._disposables });
            stackTrace.appendChild(linkedStackTrace);
            dom.append(container, stackTrace);
            ariaLabel += ', ' + this.exceptionInfo.details.stackTrace;
        }
        container.setAttribute('aria-label', ariaLabel);
    }
    _doLayout(_heightInPixel, _widthInPixel) {
        // Reload the height with respect to the exception text content and relayout it to match the line count.
        this.container.style.height = 'initial';
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        const arrowHeight = Math.round(lineHeight / 3);
        const computedLinesNumber = Math.ceil((this.container.offsetHeight + arrowHeight) / lineHeight);
        this._relayout(computedLinesNumber);
    }
    focus() {
        // Focus into the container for accessibility purposes so the exception and stack trace gets read
        this.container?.focus();
    }
    hasFocus() {
        if (!this.container) {
            return false;
        }
        return dom.isAncestorOfActiveElement(this.container);
    }
};
ExceptionWidget = __decorate([
    __param(3, IThemeService),
    __param(4, IInstantiationService)
], ExceptionWidget);
export { ExceptionWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhjZXB0aW9uV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9leGNlcHRpb25XaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBRXhGLE9BQU8sRUFJTixzQkFBc0IsR0FDdEIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQTBCLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRXhFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQy9FLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFZixVQUFVO0FBRVYsTUFBTSwwQkFBMEIsR0FBRyxhQUFhLENBQy9DLDZCQUE2QixFQUM3QixTQUFTLEVB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