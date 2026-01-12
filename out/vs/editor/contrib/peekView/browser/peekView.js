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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import * as objects from '../../../../base/common/objects.js';
import './media/peekViewWidget.css';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { EmbeddedCodeEditorWidget } from '../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { ZoneWidget } from '../../zoneWidget/browser/zoneWidget.js';
import * as nls from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { activeContrastBorder, contrastBorder, editorForeground, editorInfoForeground, registerColor, } from '../../../../platform/theme/common/colorRegistry.js';
import { observableCodeEditor } from '../../../browser/observableCodeEditor.js';
export const IPeekViewService = createDecorator('IPeekViewService');
registerSingleton(IPeekViewService, class {
    constructor() {
        this._widgets = new Map();
    }
    addExclusiveWidget(editor, widget) {
        const existing = this._widgets.get(editor);
        if (existing) {
            existing.listener.dispose();
            existing.widget.dispose();
        }
        const remove = () => {
            const data = this._widgets.get(editor);
            if (data && data.widget === widget) {
                data.listener.dispose();
                this._widgets.delete(editor);
            }
        };
        this._widgets.set(editor, { widget, listener: widget.onDidClose(remove) });
    }
}, 1 /* InstantiationType.Delayed */);
export var PeekContext;
(function (PeekContext) {
    PeekContext.inPeekEditor = new RawContextKey('inReferenceSearchEditor', true, nls.localize('inReferenceSearchEditor', 'Whether the current code editor is embedded inside peek'));
    PeekContext.notInPeekEditor = PeekContext.inPeekEditor.toNegated();
})(PeekContext || (PeekContext = {}));
let PeekContextController = class PeekContextController {
    static { this.ID = 'editor.contrib.referenceController'; }
    constructor(editor, contextKeyService) {
        if (editor instanceof EmbeddedCodeEditorWidget) {
            PeekContext.inPeekEditor.bindTo(contextKeyService);
        }
    }
    dispose() { }
};
PeekContextController = __decorate([
    __param(1, IContextKeyService)
], PeekContextController);
registerEditorContribution(PeekContextController.ID, PeekContextController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to define a context key
const defaultOptions = {
    headerBackgroundColor: Color.white,
    primaryHeadingColor: Color.fromHex('#333333'),
    secondaryHeadingColor: Color.fromHex('#6c6c6cb3'),
};
let PeekViewWidget = class PeekViewWidget extends ZoneWidget {
    constructor(editor, options, instantiationService) {
        super(editor, options);
        this.instantiationService = instantiationService;
        this._onDidClose = new Emitter();
        this.onDidClose = this._onDidClose.event;
        objects.mixin(this.options, defaultOptions, false);
        const e = observableCodeEditor(this.editor);
        e.openedPeekWidgets.set(e.openedPeekWidgets.get() + 1, undefined);
    }
    dispose() {
        if (!this.disposed) {
            this.disposed = true; // prevent consumers who dispose on onDidClose from looping
            super.dispose();
            this._onDidClose.fire(this);
            const e = observableCodeEditor(this.editor);
            e.openedPeekWidgets.set(e.openedPeekWidgets.get() - 1, undefined);
        }
    }
    style(styles) {
        const options = this.options;
        if (styles.headerBackgroundColor) {
            options.headerBackgroundColor = styles.headerBackgroundColor;
        }
        if (styles.primaryHeadingColor) {
            options.primaryHeadingColor = styles.primaryHeadingColor;
        }
        if (styles.secondaryHeadingColor) {
            options.secondaryHeadingColor = styles.secondaryHeadingColor;
        }
        super.style(styles);
    }
    _applyStyles() {
        super._applyStyles();
        const options = this.options;
        if (this._headElement && options.headerBackgroundColor) {
            this._headElement.style.backgroundColor = options.headerBackgroundColor.toString();
        }
        if (this._primaryHeading && options.primaryHeadingColor) {
            this._primaryHeading.style.color = options.primaryHeadingColor.toString();
        }
        if (this._secondaryHeading && options.secondaryHeadingColor) {
            this._secondaryHeading.style.color = options.secondaryHeadingColor.toString();
        }
        if (this._bodyElement && options.frameColor) {
            this._bodyElement.style.borderColor = options.frameColor.toString();
        }
    }
    _fillContainer(container) {
        this.setCssClass('peekview-widget');
        this._headElement = dom.$('.head');
        this._bodyElement = dom.$('.body');
        this._fillHead(this._headElement);
        this._fillBody(this._bodyElement);
        container.appendChild(this._headElement);
        container.appendChild(this._bodyElement);
    }
    _fillHead(container, noCloseAction) {
        this._titleElement = dom.$('.peekview-title');
        if (this.options.supportOnTitleClick) {
            this._titleElement.classList.add('clickable');
            dom.addStandardDisposableListener(this._titleElement, 'click', (event) => this._onTitleClick(event));
        }
        dom.append(this._headElement, this._titleElement);
        this._fillTitleIcon(this._titleElement);
        this._primaryHeading = dom.$('span.filename');
        this._secondaryHeading = dom.$('span.dirname');
        this._metaHeading = dom.$('span.meta');
        dom.append(this._titleElement, this._primaryHeading, this._secondaryHeading, this._metaHeading);
        const actionsContainer = dom.$('.peekview-actions');
        dom.append(this._headElement, actionsContainer);
        const actionBarOptions = this._getActionBarOptions();
        this._actionbarWidget = new ActionBar(actionsContainer, actionBarOptions);
        this._disposables.add(this._actionbarWidget);
        if (!noCloseAction) {
            this._actionbarWidget.push(this._disposables.add(new Action('peekview.close', nls.localize('label.close', 'Close'), ThemeIcon.asClassName(Codicon.close), true, () => {
                this.dispose();
                return Promise.resolve();
            })), { label: false, icon: true });
        }
    }
    _fillTitleIcon(container) { }
    _getActionBarOptions() {
        return {
            actionViewItemProvider: createActionViewItem.bind(undefined, this.instantiationService),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
        };
    }
    _onTitleClick(event) {
        // implement me if supportOnTitleClick option is set
    }
    setTitle(primaryHeading, secondaryHeading) {
        if (this._primaryHeading && this._secondaryHeading) {
            this._primaryHeading.innerText = primaryHeading;
            this._primaryHeading.setAttribute('title', primaryHeading);
            if (secondaryHeading) {
                this._secondaryHeading.innerText = secondaryHeading;
            }
            else {
                dom.clearNode(this._secondaryHeading);
            }
        }
    }
    setMetaTitle(value) {
        if (this._metaHeading) {
            if (value) {
                this._metaHeading.innerText = value;
                dom.show(this._metaHeading);
            }
            else {
                dom.hide(this._metaHeading);
            }
        }
    }
    _doLayout(heightInPixel, widthInPixel) {
        if (!this._isShowing && heightInPixel < 0) {
            // Looks like the view zone got folded away!
            this.dispose();
            return;
        }
        const headHeight = Math.ceil(this.editor.getOption(68 /* EditorOption.lineHeight */) * 1.2);
        const bodyHeight = Math.round(heightInPixel - (headHeight + 2) /* the border-top/bottom width*/);
        this._doLayoutHead(headHeight, widthInPixel);
        this._doLayoutBody(bodyHeight, widthInPixel);
    }
    _doLayoutHead(heightInPixel, widthInPixel) {
        if (this._headElement) {
            this._headElement.style.height = `${heightInPixel}px`;
            this._headElement.style.lineHeight = this._headElement.style.height;
        }
    }
    _doLayoutBody(heightInPixel, widthInPixel) {
        if (this._bodyElement) {
            this._bodyElement.style.height = `${heightInPixel}px`;
        }
    }
};
PeekViewWidget = __decorate([
    __param(2, IInstantiationService)
], PeekViewWidget);
export { PeekViewWidget };
export const peekViewTitleBackground = registerColor('peekViewTitle.background', { dark: '#252526', light: '#F3F3F3', hcDark: Color.black, hcLight: Color.white }, nls.localize('peekViewTitleBackground', 'Background color of the peek view title area.'));
export const peekViewTitleForeground = registerColor('peekViewTitleLabel.foreground', { dark: Color.white, light: Color.black, hcDark: Color.white, hcLight: editorForeground }, nls.localize('peekViewTitleForeground', 'Color of the peek view title.'));
export const peekViewTitleInfoForeground = registerColor('peekViewTitleDescription.foreground', { dark: '#ccccccb3', light: '#616161', hcDark: '#FFFFFF99', hcLight: '#292929' }, nls.localize('peekViewTitleInfoForeground', 'Color of the peek view title info.'));
export const peekViewBorder = registerColor('peekView.border', {
    dark: editorInfoForeground,
    light: editorInfoForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('peekViewBorder', 'Color of the peek view borders and arrow.'));
export const peekViewResultsBackground = registerColor('peekViewResult.background', { dark: '#252526', light: '#F3F3F3', hcDark: Color.black, hcLight: Color.white }, nls.localize('peekViewResultsBackground', 'Background color of the peek view result list.'));
export const peekViewResultsMatchForeground = registerColor('peekViewResult.lineForeground', { dark: '#bbbbbb', light: '#646465', hcDark: Color.white, hcLight: editorForeground }, nls.localize('peekViewResultsMatchForeground', 'Foreground color for line nodes in the peek view result list.'));
export const peekViewResultsFileForeground = registerColor('peekViewResult.fileForeground', { dark: Color.white, light: '#1E1E1E', hcDark: Color.white, hcLight: editorForeground }, nls.localize('peekViewResultsFileForeground', 'Foreground color for file nodes in the peek view result list.'));
export const peekViewResultsSelectionBackground = registerColor('peekViewResult.selectionBackground', { dark: '#3399ff33', light: '#3399ff33', hcDark: null, hcLight: null }, nls.localize('peekViewResultsSelectionBackground', 'Background color of the selected entry in the peek view result list.'));
export const peekViewResultsSelectionForeground = registerColor('peekViewResult.selectionForeground', { dark: Color.white, light: '#6C6C6C', hcDark: Color.white, hcLight: editorForeground }, nls.localize('peekViewResultsSelectionForeground', 'Foreground color of the selected entry in the peek view result list.'));
export const peekViewEditorBackground = registerColor('peekViewEditor.background', { dark: '#001F33', light: '#F2F8FC', hcDark: Color.black, hcLight: Color.white }, nls.localize('peekViewEditorBackground', 'Background color of the peek view editor.'));
export const peekViewEditorGutterBackground = registerColor('peekViewEditorGutter.background', peekViewEditorBackground, nls.localize('peekViewEditorGutterBackground', 'Background color of the gutter in the peek view editor.'));
export const peekViewEditorStickyScrollBackground = registerColor('peekViewEditorStickyScroll.background', peekViewEditorBackground, nls.localize('peekViewEditorStickScrollBackground', 'Background color of sticky scroll in the peek view editor.'));
export const peekViewResultsMatchHighlight = registerColor('peekViewResult.matchHighlightBackground', { dark: '#ea5c004d', light: '#ea5c004d', hcDark: null, hcLight: null }, nls.localize('peekViewResultsMatchHighlight', 'Match highlight color in the peek view result list.'));
export const peekViewEditorMatchHighlight = registerColor('peekViewEditor.matchHighlightBackground', { dark: '#ff8f0099', light: '#f5d802de', hcDark: null, hcLight: null }, nls.localize('peekViewEditorMatchHighlight', 'Match highlight color in the peek view editor.'));
export const peekViewEditorMatchHighlightBorder = registerColor('peekViewEditor.matchHighlightBorder', { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('peekViewEditorMatchHighlightBorder', 'Match highlight border in the peek view editor.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVla1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3BlZWtWaWV3L2Jyb3dzZXIvcGVla1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQ04sU0FBUyxHQUdULE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sNEJBQTRCLENBQUE7QUFFbkMsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBR3pHLE9BQU8sRUFBcUIsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdEYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN0RyxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04s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