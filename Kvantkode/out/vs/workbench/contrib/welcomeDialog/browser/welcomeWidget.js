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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZURpYWxvZy9icm93c2VyL3dlbGNvbWVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFPakUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdGQUFnRixDQUFBO0FBRWpILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUV6RixPQUFPLEVBQ04sTUFBTSxHQUdOLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBYyxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbEUsT0FBTyxFQUFF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