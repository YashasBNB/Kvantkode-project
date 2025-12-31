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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVla1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9wZWVrVmlldy9icm93c2VyL3BlZWtWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUNOLFNBQVMsR0FHVCxNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLDRCQUE0QixDQUFBO0FBRW5DLE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUd6RyxPQUFPLEVBQXFCLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3RGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDdEcsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGVBQWUs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