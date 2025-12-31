/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/welcomeWidget.css';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { $, append, hide } from '../../../../base/browser/dom.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ButtonBar } from '../../../../base/browser/ui/button/button.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Action, } from '../../../../base/common/actions.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { localize } from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { contrastBorder, editorWidgetBackground, editorWidgetForeground, widgetBorder, widgetShadow, } from '../../../../platform/theme/common/colorRegistry.js';
export class WelcomeWidget extends Disposable {
    constructor(_editor, instantiationService, commandService, telemetryService, openerService) {
        super();
        this._editor = _editor;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.openerService = openerService;
        this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        this._isVisible = false;
        this._rootDomNode = document.createElement('div');
        this._rootDomNode.className = 'welcome-widget';
        this.element = this._rootDomNode.appendChild($('.monaco-dialog-box'));
        this.element.setAttribute('role', 'dialog');
        hide(this._rootDomNode);
        this.messageContainer = this.element.appendChild($('.dialog-message-container'));
    }
    async executeCommand(commandId, ...args) {
        try {
            await this.commandService.executeCommand(commandId, ...args);
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: commandId,
                from: 'welcomeWidget',
            });
        }
        catch (ex) { }
    }
    async render(title, message, buttonText, buttonAction) {
        if (!this._editor._getViewModel()) {
            return;
        }
        await this.buildWidgetContent(title, message, buttonText, buttonAction);
        this._editor.addOverlayWidget(this);
        this._show();
        this.telemetryService.publicLog2('workbenchActionExecuted', {
            id: 'welcomeWidgetRendered',
            from: 'welcomeWidget',
        });
    }
    async buildWidgetContent(title, message, buttonText, buttonAction) {
        const actionBar = this._register(new ActionBar(this.element, {}));
        const action = this._register(new Action('dialog.close', localize('dialogClose', 'Close Dialog'), ThemeIcon.asClassName(Codicon.dialogClose), true, async () => {
            this._hide();
        }));
        actionBar.push(action, { icon: true, label: false });
        const renderBody = (message, icon) => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true, supportHtml: true });
            mds.appendMarkdown(`<a class="copilot">$(${icon})</a>`);
            mds.appendMarkdown(message);
            return mds;
        };
        const titleElement = this.messageContainer.appendChild($('#monaco-dialog-message-detail.dialog-message-detail-title'));
        const titleElementMdt = this.markdownRenderer.render(renderBody(title, 'zap'));
        titleElement.appendChild(titleElementMdt.element);
        this.buildStepMarkdownDescription(this.messageContainer, message
            .split('\n')
            .filter((x) => x)
            .map((text) => parseLinkedText(text)));
        const buttonsRowElement = this.messageContainer.appendChild($('.dialog-buttons-row'));
        const buttonContainer = buttonsRowElement.appendChild($('.dialog-buttons'));
        const buttonBar = this._register(new ButtonBar(buttonContainer));
        const primaryButton = this._register(buttonBar.addButtonWithDescription({ title: true, secondary: false, ...defaultButtonStyles }));
        primaryButton.label = mnemonicButtonLabel(buttonText, true);
        this._register(primaryButton.onDidClick(async () => {
            await this.executeCommand(buttonAction);
        }));
        buttonBar.buttons[0].focus();
    }
    buildStepMarkdownDescription(container, text) {
        for (const linkedText of text) {
            const p = append(container, $('p'));
            for (const node of linkedText.nodes) {
                if (typeof node === 'string') {
                    const labelWithIcon = renderLabelWithIcons(node);
                    for (const element of labelWithIcon) {
                        if (typeof element === 'string') {
                            p.appendChild(renderFormattedText(element, { inline: true, renderCodeSegments: true }));
                        }
                        else {
                            p.appendChild(element);
                        }
                    }
                }
                else {
                    const link = this.instantiationService.createInstance(Link, p, node, {
                        opener: (href) => {
                            this.telemetryService.publicLog2('workbenchActionExecuted', {
                                id: 'welcomeWidetLinkAction',
                                from: 'welcomeWidget',
                            });
                            this.openerService.open(href, { allowCommands: true });
                        },
                    });
                    this._register(link);
                }
            }
        }
        return container;
    }
    getId() {
        return 'editor.contrib.welcomeWidget';
    }
    getDomNode() {
        return this._rootDomNode;
    }
    getPosition() {
        return {
            preference: 0 /* OverlayWidgetPositionPreference.TOP_RIGHT_CORNER */,
        };
    }
    _show() {
        if (this._isVisible) {
            return;
        }
        this._isVisible = true;
        this._rootDomNode.style.display = 'block';
    }
    _hide() {
        if (!this._isVisible) {
            return;
        }
        this._isVisible = true;
        this._rootDomNode.style.display = 'none';
        this._editor.removeOverlayWidget(this);
        this.telemetryService.publicLog2('workbenchActionExecuted', {
            id: 'welcomeWidgetDismissed',
            from: 'welcomeWidget',
        });
    }
}
registerThemingParticipant((theme, collector) => {
    const addBackgroundColorRule = (selector, color) => {
        if (color) {
            collector.addRule(`.monaco-editor ${selector} { background-color: ${color}; }`);
        }
    };
    const widgetBackground = theme.getColor(editorWidgetBackground);
    addBackgroundColorRule('.welcome-widget', widgetBackground);
    const widgetShadowColor = theme.getColor(widgetShadow);
    if (widgetShadowColor) {
        collector.addRule(`.welcome-widget { box-shadow: 0 0 8px 2px ${widgetShadowColor}; }`);
    }
    const widgetBorderColor = theme.getColor(widgetBorder);
    if (widgetBorderColor) {
        collector.addRule(`.welcome-widget { border-left: 1px solid ${widgetBorderColor}; border-right: 1px solid ${widgetBorderColor}; border-bottom: 1px solid ${widgetBorderColor}; }`);
    }
    const hcBorder = theme.getColor(contrastBorder);
    if (hcBorder) {
        collector.addRule(`.welcome-widget { border: 1px solid ${hcBorder}; }`);
    }
    const foreground = theme.getColor(editorWidgetForeground);
    if (foreground) {
        collector.addRule(`.welcome-widget { color: ${foreground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVEaWFsb2cvYnJvd3Nlci93ZWxjb21lV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBT2pFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQTtBQUVqSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFFekYsT0FBTyxFQUNOLE1BQU0sR0FHTixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQWMsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFx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