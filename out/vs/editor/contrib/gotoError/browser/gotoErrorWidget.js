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
var MarkerNavigationWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { ScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/resources.js';
import { splitLines } from '../../../../base/common/strings.js';
import './media/gotoErrorWidget.css';
import { Range } from '../../../common/core/range.js';
import { peekViewTitleForeground, peekViewTitleInfoForeground, PeekViewWidget, } from '../../peekView/browser/peekView.js';
import * as nls from '../../../../nls.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { MarkerSeverity, } from '../../../../platform/markers/common/markers.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { contrastBorder, editorBackground, editorErrorBorder, editorErrorForeground, editorInfoBorder, editorInfoForeground, editorWarningBorder, editorWarningForeground, oneOf, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
class MessageWidget {
    constructor(parent, editor, onRelatedInformation, _openerService, _labelService) {
        this._openerService = _openerService;
        this._labelService = _labelService;
        this._lines = 0;
        this._longestLineLength = 0;
        this._relatedDiagnostics = new WeakMap();
        this._disposables = new DisposableStore();
        this._editor = editor;
        const domNode = document.createElement('div');
        domNode.className = 'descriptioncontainer';
        this._messageBlock = document.createElement('div');
        this._messageBlock.classList.add('message');
        this._messageBlock.setAttribute('aria-live', 'assertive');
        this._messageBlock.setAttribute('role', 'alert');
        domNode.appendChild(this._messageBlock);
        this._relatedBlock = document.createElement('div');
        domNode.appendChild(this._relatedBlock);
        this._disposables.add(dom.addStandardDisposableListener(this._relatedBlock, 'click', (event) => {
            event.preventDefault();
            const related = this._relatedDiagnostics.get(event.target);
            if (related) {
                onRelatedInformation(related);
            }
        }));
        this._scrollable = new ScrollableElement(domNode, {
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            vertical: 1 /* ScrollbarVisibility.Auto */,
            useShadows: false,
            horizontalScrollbarSize: 6,
            verticalScrollbarSize: 6,
        });
        parent.appendChild(this._scrollable.getDomNode());
        this._disposables.add(this._scrollable.onScroll((e) => {
            domNode.style.left = `-${e.scrollLeft}px`;
            domNode.style.top = `-${e.scrollTop}px`;
        }));
        this._disposables.add(this._scrollable);
    }
    dispose() {
        dispose(this._disposables);
    }
    update(marker) {
        const { source, message, relatedInformation, code } = marker;
        let sourceAndCodeLength = (source?.length || 0) + '()'.length;
        if (code) {
            if (typeof code === 'string') {
                sourceAndCodeLength += code.length;
            }
            else {
                sourceAndCodeLength += code.value.length;
            }
        }
        const lines = splitLines(message);
        this._lines = lines.length;
        this._longestLineLength = 0;
        for (const line of lines) {
            this._longestLineLength = Math.max(line.length + sourceAndCodeLength, this._longestLineLength);
        }
        dom.clearNode(this._messageBlock);
        this._messageBlock.setAttribute('aria-label', this.getAriaLabel(marker));
        this._editor.applyFontInfo(this._messageBlock);
        let lastLineElement = this._messageBlock;
        for (const line of lines) {
            lastLineElement = document.createElement('div');
            lastLineElement.innerText = line;
            if (line === '') {
                lastLineElement.style.height = this._messageBlock.style.lineHeight;
            }
            this._messageBlock.appendChild(lastLineElement);
        }
        if (source || code) {
            const detailsElement = document.createElement('span');
            detailsElement.classList.add('details');
            lastLineElement.appendChild(detailsElement);
            if (source) {
                const sourceElement = document.createElement('span');
                sourceElement.innerText = source;
                sourceElement.classList.add('source');
                detailsElement.appendChild(sourceElement);
            }
            if (code) {
                if (typeof code === 'string') {
                    const codeElement = document.createElement('span');
                    codeElement.innerText = `(${code})`;
                    codeElement.classList.add('code');
                    detailsElement.appendChild(codeElement);
                }
                else {
                    this._codeLink = dom.$('a.code-link');
                    this._codeLink.setAttribute('href', `${code.target.toString()}`);
                    this._codeLink.onclick = (e) => {
                        this._openerService.open(code.target, { allowCommands: true });
                        e.preventDefault();
                        e.stopPropagation();
                    };
                    const codeElement = dom.append(this._codeLink, dom.$('span'));
                    codeElement.innerText = code.value;
                    detailsElement.appendChild(this._codeLink);
                }
            }
        }
        dom.clearNode(this._relatedBlock);
        this._editor.applyFontInfo(this._relatedBlock);
        if (isNonEmptyArray(relatedInformation)) {
            const relatedInformationNode = this._relatedBlock.appendChild(document.createElement('div'));
            relatedInformationNode.style.paddingTop = `${Math.floor(this._editor.getOption(68 /* EditorOption.lineHeight */) * 0.66)}px`;
            this._lines += 1;
            for (const related of relatedInformation) {
                const container = document.createElement('div');
                const relatedResource = document.createElement('a');
                relatedResource.classList.add('filename');
                relatedResource.innerText = `${this._labelService.getUriBasenameLabel(related.resource)}(${related.startLineNumber}, ${related.startColumn}): `;
                relatedResource.title = this._labelService.getUriLabel(related.resource);
                this._relatedDiagnostics.set(relatedResource, related);
                const relatedMessage = document.createElement('span');
                relatedMessage.innerText = related.message;
                container.appendChild(relatedResource);
                container.appendChild(relatedMessage);
                this._lines += 1;
                relatedInformationNode.appendChild(container);
            }
        }
        const fontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        const scrollWidth = Math.ceil(fontInfo.typicalFullwidthCharacterWidth * this._longestLineLength * 0.75);
        const scrollHeight = fontInfo.lineHeight * this._lines;
        this._scrollable.setScrollDimensions({ scrollWidth, scrollHeight });
    }
    layout(height, width) {
        this._scrollable.getDomNode().style.height = `${height}px`;
        this._scrollable.getDomNode().style.width = `${width}px`;
        this._scrollable.setScrollDimensions({ width, height });
    }
    getHeightInLines() {
        return Math.min(17, this._lines);
    }
    getAriaLabel(marker) {
        let severityLabel = '';
        switch (marker.severity) {
            case MarkerSeverity.Error:
                severityLabel = nls.localize('Error', 'Error');
                break;
            case MarkerSeverity.Warning:
                severityLabel = nls.localize('Warning', 'Warning');
                break;
            case MarkerSeverity.Info:
                severityLabel = nls.localize('Info', 'Info');
                break;
            case MarkerSeverity.Hint:
                severityLabel = nls.localize('Hint', 'Hint');
                break;
        }
        let ariaLabel = nls.localize('marker aria', '{0} at {1}. ', severityLabel, marker.startLineNumber + ':' + marker.startColumn);
        const model = this._editor.getModel();
        if (model && marker.startLineNumber <= model.getLineCount() && marker.startLineNumber >= 1) {
            const lineContent = model.getLineContent(marker.startLineNumber);
            ariaLabel = `${lineContent}, ${ariaLabel}`;
        }
        return ariaLabel;
    }
}
let MarkerNavigationWidget = class MarkerNavigationWidget extends PeekViewWidget {
    static { MarkerNavigationWidget_1 = this; }
    static { this.TitleMenu = new MenuId('gotoErrorTitleMenu'); }
    constructor(editor, _themeService, _openerService, _menuService, instantiationService, _contextKeyService, _labelService) {
        super(editor, { showArrow: true, showFrame: true, isAccessible: true, frameWidth: 1 }, instantiationService);
        this._themeService = _themeService;
        this._openerService = _openerService;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._labelService = _labelService;
        this._callOnDispose = new DisposableStore();
        this._onDidSelectRelatedInformation = new Emitter();
        this.onDidSelectRelatedInformation = this._onDidSelectRelatedInformation.event;
        this._severity = MarkerSeverity.Warning;
        this._backgroundColor = Color.white;
        this._applyTheme(_themeService.getColorTheme());
        this._callOnDispose.add(_themeService.onDidColorThemeChange(this._applyTheme.bind(this)));
        this.create();
    }
    _applyTheme(theme) {
        this._backgroundColor = theme.getColor(editorMarkerNavigationBackground);
        let colorId = editorMarkerNavigationError;
        let headerBackground = editorMarkerNavigationErrorHeader;
        if (this._severity === MarkerSeverity.Warning) {
            colorId = editorMarkerNavigationWarning;
            headerBackground = editorMarkerNavigationWarningHeader;
        }
        else if (this._severity === MarkerSeverity.Info) {
            colorId = editorMarkerNavigationInfo;
            headerBackground = editorMarkerNavigationInfoHeader;
        }
        const frameColor = theme.getColor(colorId);
        const headerBg = theme.getColor(headerBackground);
        this.style({
            arrowColor: frameColor,
            frameColor: frameColor,
            headerBackgroundColor: headerBg,
            primaryHeadingColor: theme.getColor(peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekViewTitleInfoForeground),
        }); // style() will trigger _applyStyles
    }
    _applyStyles() {
        if (this._parentContainer) {
            this._parentContainer.style.backgroundColor = this._backgroundColor
                ? this._backgroundColor.toString()
                : '';
        }
        super._applyStyles();
    }
    dispose() {
        this._callOnDispose.dispose();
        super.dispose();
    }
    focus() {
        this._parentContainer.focus();
    }
    _fillHead(container) {
        super._fillHead(container);
        this._disposables.add(this._actionbarWidget.actionRunner.onWillRun((e) => this.editor.focus()));
        const menu = this._menuService.getMenuActions(MarkerNavigationWidget_1.TitleMenu, this._contextKeyService);
        const actions = getFlatActionBarActions(menu);
        this._actionbarWidget.push(actions, { label: false, icon: true, index: 0 });
    }
    _fillTitleIcon(container) {
        this._icon = dom.append(container, dom.$(''));
    }
    _fillBody(container) {
        this._parentContainer = container;
        container.classList.add('marker-widget');
        this._parentContainer.tabIndex = 0;
        this._parentContainer.setAttribute('role', 'tooltip');
        this._container = document.createElement('div');
        container.appendChild(this._container);
        this._message = new MessageWidget(this._container, this.editor, (related) => this._onDidSelectRelatedInformation.fire(related), this._openerService, this._labelService);
        this._disposables.add(this._message);
    }
    show() {
        throw new Error('call showAtMarker');
    }
    showAtMarker(marker, markerIdx, markerCount) {
        // update:
        // * title
        // * message
        this._container.classList.remove('stale');
        this._message.update(marker);
        // update frame color (only applied on 'show')
        this._severity = marker.severity;
        this._applyTheme(this._themeService.getColorTheme());
        // show
        const range = Range.lift(marker);
        const editorPosition = this.editor.getPosition();
        const position = editorPosition && range.containsPosition(editorPosition)
            ? editorPosition
            : range.getStartPosition();
        super.show(position, this.computeRequiredHeight());
        const model = this.editor.getModel();
        if (model) {
            const detail = markerCount > 1
                ? nls.localize('problems', '{0} of {1} problems', markerIdx, markerCount)
                : nls.localize('change', '{0} of {1} problem', markerIdx, markerCount);
            this.setTitle(basename(model.uri), detail);
        }
        this._icon.className = `codicon ${SeverityIcon.className(MarkerSeverity.toSeverity(this._severity))}`;
        this.editor.revealPositionNearTop(position, 0 /* ScrollType.Smooth */);
        this.editor.focus();
    }
    updateMarker(marker) {
        this._container.classList.remove('stale');
        this._message.update(marker);
    }
    showStale() {
        this._container.classList.add('stale');
        this._relayout();
    }
    _doLayoutBody(heightInPixel, widthInPixel) {
        super._doLayoutBody(heightInPixel, widthInPixel);
        this._heightInPixel = heightInPixel;
        this._message.layout(heightInPixel, widthInPixel);
        this._container.style.height = `${heightInPixel}px`;
    }
    _onWidth(widthInPixel) {
        this._message.layout(this._heightInPixel, widthInPixel);
    }
    _relayout() {
        super._relayout(this.computeRequiredHeight());
    }
    computeRequiredHeight() {
        return 3 + this._message.getHeightInLines();
    }
};
MarkerNavigationWidget = MarkerNavigationWidget_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IOpenerService),
    __param(3, IMenuService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService),
    __param(6, ILabelService)
], MarkerNavigationWidget);
export { MarkerNavigationWidget };
// theming
const errorDefault = oneOf(editorErrorForeground, editorErrorBorder);
const warningDefault = oneOf(editorWarningForeground, editorWarningBorder);
const infoDefault = oneOf(editorInfoForeground, editorInfoBorder);
const editorMarkerNavigationError = registerColor('editorMarkerNavigationError.background', { dark: errorDefault, light: errorDefault, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('editorMarkerNavigationError', 'Editor marker navigation widget error color.'));
const editorMarkerNavigationErrorHeader = registerColor('editorMarkerNavigationError.headerBackground', {
    dark: transparent(editorMarkerNavigationError, 0.1),
    light: transparent(editorMarkerNavigationError, 0.1),
    hcDark: null,
    hcLight: null,
}, nls.localize('editorMarkerNavigationErrorHeaderBackground', 'Editor marker navigation widget error heading background.'));
const editorMarkerNavigationWarning = registerColor('editorMarkerNavigationWarning.background', { dark: warningDefault, light: warningDefault, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('editorMarkerNavigationWarning', 'Editor marker navigation widget warning color.'));
const editorMarkerNavigationWarningHeader = registerColor('editorMarkerNavigationWarning.headerBackground', {
    dark: transparent(editorMarkerNavigationWarning, 0.1),
    light: transparent(editorMarkerNavigationWarning, 0.1),
    hcDark: '#0C141F',
    hcLight: transparent(editorMarkerNavigationWarning, 0.2),
}, nls.localize('editorMarkerNavigationWarningBackground', 'Editor marker navigation widget warning heading background.'));
const editorMarkerNavigationInfo = registerColor('editorMarkerNavigationInfo.background', { dark: infoDefault, light: infoDefault, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('editorMarkerNavigationInfo', 'Editor marker navigation widget info color.'));
const editorMarkerNavigationInfoHeader = registerColor('editorMarkerNavigationInfo.headerBackground', {
    dark: transparent(editorMarkerNavigationInfo, 0.1),
    light: transparent(editorMarkerNavigationInfo, 0.1),
    hcDark: null,
    hcLight: null,
}, nls.localize('editorMarkerNavigationInfoHeaderBackground', 'Editor marker navigation widget info heading background.'));
const editorMarkerNavigationBackground = registerColor('editorMarkerNavigation.background', editorBackground, nls.localize('editorMarkerNavigationBackground', 'Editor marker navigation widget background.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0Vycm9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvRXJyb3IvYnJvd3Nlci9nb3RvRXJyb3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sNkJBQTZCLENBQUE7QUFHcEMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsMkJBQTJCLEVBQzNCLGNBQWMsR0FDZCxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDekcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFP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