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
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { createCancelablePromise, disposableTimeout, } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/resources.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IMarkerDecorationsService } from '../../../common/services/markerDecorations.js';
import { ApplyCodeActionReason, getCodeActions, quickFixCommandId, } from '../../codeAction/browser/codeAction.js';
import { CodeActionController } from '../../codeAction/browser/codeActionController.js';
import { CodeActionKind, CodeActionTriggerSource, } from '../../codeAction/common/types.js';
import { MarkerController, NextMarkerAction } from '../../gotoError/browser/gotoError.js';
import { RenderedHoverParts, } from './hoverTypes.js';
import * as nls from '../../../../nls.js';
import { IMarkerData, MarkerSeverity, } from '../../../../platform/markers/common/markers.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
const $ = dom.$;
export class MarkerHover {
    constructor(owner, range, marker) {
        this.owner = owner;
        this.range = range;
        this.marker = marker;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */ &&
            this.range.startColumn <= anchor.range.startColumn &&
            this.range.endColumn >= anchor.range.endColumn);
    }
}
const markerCodeActionTrigger = {
    type: 1 /* CodeActionTriggerType.Invoke */,
    filter: { include: CodeActionKind.QuickFix },
    triggerAction: CodeActionTriggerSource.QuickFixHover,
};
let MarkerHoverParticipant = class MarkerHoverParticipant {
    constructor(_editor, _markerDecorationsService, _openerService, _languageFeaturesService) {
        this._editor = _editor;
        this._markerDecorationsService = _markerDecorationsService;
        this._openerService = _openerService;
        this._languageFeaturesService = _languageFeaturesService;
        this.hoverOrdinal = 1;
        this.recentMarkerCodeActionsInfo = undefined;
    }
    computeSync(anchor, lineDecorations) {
        if (!this._editor.hasModel() ||
            (anchor.type !== 1 /* HoverAnchorType.Range */ && !anchor.supportsMarkerHover)) {
            return [];
        }
        const model = this._editor.getModel();
        const lineNumber = anchor.range.startLineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        const result = [];
        for (const d of lineDecorations) {
            const startColumn = d.range.startLineNumber === lineNumber ? d.range.startColumn : 1;
            const endColumn = d.range.endLineNumber === lineNumber ? d.range.endColumn : maxColumn;
            const marker = this._markerDecorationsService.getMarker(model.uri, d);
            if (!marker) {
                continue;
            }
            const range = new Range(anchor.range.startLineNumber, startColumn, anchor.range.startLineNumber, endColumn);
            result.push(new MarkerHover(this, range, marker));
        }
        return result;
    }
    renderHoverParts(context, hoverParts) {
        if (!hoverParts.length) {
            return new RenderedHoverParts([]);
        }
        const renderedHoverParts = [];
        hoverParts.forEach((hoverPart) => {
            const renderedMarkerHover = this._renderMarkerHover(hoverPart);
            context.fragment.appendChild(renderedMarkerHover.hoverElement);
            renderedHoverParts.push(renderedMarkerHover);
        });
        const markerHoverForStatusbar = hoverParts.length === 1
            ? hoverParts[0]
            : hoverParts.sort((a, b) => MarkerSeverity.compare(a.marker.severity, b.marker.severity))[0];
        const disposables = this._renderMarkerStatusbar(context, markerHoverForStatusbar);
        return new RenderedHoverParts(renderedHoverParts, disposables);
    }
    getAccessibleContent(hoverPart) {
        return hoverPart.marker.message;
    }
    _renderMarkerHover(markerHover) {
        const disposables = new DisposableStore();
        const hoverElement = $('div.hover-row');
        const markerElement = dom.append(hoverElement, $('div.marker.hover-contents'));
        const { source, message, code, relatedInformation } = markerHover.marker;
        this._editor.applyFontInfo(markerElement);
        const messageElement = dom.append(markerElement, $('span'));
        messageElement.style.whiteSpace = 'pre-wrap';
        messageElement.innerText = message;
        if (source || code) {
            // Code has link
            if (code && typeof code !== 'string') {
                const sourceAndCodeElement = $('span');
                if (source) {
                    const sourceElement = dom.append(sourceAndCodeElement, $('span'));
                    sourceElement.innerText = source;
                }
                const codeLink = dom.append(sourceAndCodeElement, $('a.code-link'));
                codeLink.setAttribute('href', code.target.toString(true));
                disposables.add(dom.addDisposableListener(codeLink, 'click', (e) => {
                    this._openerService.open(code.target, { allowCommands: true });
                    e.preventDefault();
                    e.stopPropagation();
                }));
                const codeElement = dom.append(codeLink, $('span'));
                codeElement.innerText = code.value;
                const detailsElement = dom.append(markerElement, sourceAndCodeElement);
                detailsElement.style.opacity = '0.6';
                detailsElement.style.paddingLeft = '6px';
            }
            else {
                const detailsElement = dom.append(markerElement, $('span'));
                detailsElement.style.opacity = '0.6';
                detailsElement.style.paddingLeft = '6px';
                detailsElement.innerText =
                    source && code ? `${source}(${code})` : source ? source : `(${code})`;
            }
        }
        if (isNonEmptyArray(relatedInformation)) {
            for (const { message, resource, startLineNumber, startColumn } of relatedInformation) {
                const relatedInfoContainer = dom.append(markerElement, $('div'));
                relatedInfoContainer.style.marginTop = '8px';
                const a = dom.append(relatedInfoContainer, $('a'));
                a.innerText = `${basename(resource)}(${startLineNumber}, ${startColumn}): `;
                a.style.cursor = 'pointer';
                disposables.add(dom.addDisposableListener(a, 'click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (this._openerService) {
                        const editorOptions = {
                            selection: { startLineNumber, startColumn },
                        };
                        this._openerService
                            .open(resource, {
                            fromUserGesture: true,
                            editorOptions,
                        })
                            .catch(onUnexpectedError);
                    }
                }));
                const messageElement = dom.append(relatedInfoContainer, $('span'));
                messageElement.innerText = message;
                this._editor.applyFontInfo(messageElement);
            }
        }
        const renderedHoverPart = {
            hoverPart: markerHover,
            hoverElement,
            dispose: () => disposables.dispose(),
        };
        return renderedHoverPart;
    }
    _renderMarkerStatusbar(context, markerHover) {
        const disposables = new DisposableStore();
        if (markerHover.marker.severity === MarkerSeverity.Error ||
            markerHover.marker.severity === MarkerSeverity.Warning ||
            markerHover.marker.severity === MarkerSeverity.Info) {
            const markerController = MarkerController.get(this._editor);
            if (markerController) {
                context.statusBar.addAction({
                    label: nls.localize('view problem', 'View Problem'),
                    commandId: NextMarkerAction.ID,
                    run: () => {
                        context.hide();
                        markerController.showAtMarker(markerHover.marker);
                        this._editor.focus();
                    },
                });
            }
        }
        if (!this._editor.getOption(96 /* EditorOption.readOnly */)) {
            const quickfixPlaceholderElement = context.statusBar.append($('div'));
            if (this.recentMarkerCodeActionsInfo) {
                if (IMarkerData.makeKey(this.recentMarkerCodeActionsInfo.marker) ===
                    IMarkerData.makeKey(markerHover.marker)) {
                    if (!this.recentMarkerCodeActionsInfo.hasCodeActions) {
                        quickfixPlaceholderElement.textContent = nls.localize('noQuickFixes', 'No quick fixes available');
                    }
                }
                else {
                    this.recentMarkerCodeActionsInfo = undefined;
                }
            }
            const updatePlaceholderDisposable = this.recentMarkerCodeActionsInfo && !this.recentMarkerCodeActionsInfo.hasCodeActions
                ? Disposable.None
                : disposableTimeout(() => (quickfixPlaceholderElement.textContent = nls.localize('checkingForQuickFixes', 'Checking for quick fixes...')), 200, disposables);
            if (!quickfixPlaceholderElement.textContent) {
                // Have some content in here to avoid flickering
                quickfixPlaceholderElement.textContent = String.fromCharCode(0xa0); // &nbsp;
            }
            const codeActionsPromise = this.getCodeActions(markerHover.marker);
            disposables.add(toDisposable(() => codeActionsPromise.cancel()));
            codeActionsPromise.then((actions) => {
                updatePlaceholderDisposable.dispose();
                this.recentMarkerCodeActionsInfo = {
                    marker: markerHover.marker,
                    hasCodeActions: actions.validActions.length > 0,
                };
                if (!this.recentMarkerCodeActionsInfo.hasCodeActions) {
                    actions.dispose();
                    quickfixPlaceholderElement.textContent = nls.localize('noQuickFixes', 'No quick fixes available');
                    return;
                }
                quickfixPlaceholderElement.style.display = 'none';
                let showing = false;
                disposables.add(toDisposable(() => {
                    if (!showing) {
                        actions.dispose();
                    }
                }));
                context.statusBar.addAction({
                    label: nls.localize('quick fixes', 'Quick Fix...'),
                    commandId: quickFixCommandId,
                    run: (target) => {
                        showing = true;
                        const controller = CodeActionController.get(this._editor);
                        const elementPosition = dom.getDomNodePagePosition(target);
                        // Hide the hover pre-emptively, otherwise the editor can close the code actions
                        // context menu as well when using keyboard navigation
                        context.hide();
                        controller?.showCodeActions(markerCodeActionTrigger, actions, {
                            x: elementPosition.left,
                            y: elementPosition.top,
                            width: elementPosition.width,
                            height: elementPosition.height,
                        });
                    },
                });
                const aiCodeAction = actions.validActions.find((action) => action.action.isAI);
                if (aiCodeAction) {
                    context.statusBar.addAction({
                        label: aiCodeAction.action.title,
                        commandId: aiCodeAction.action.command?.id ?? '',
                        run: () => {
                            const controller = CodeActionController.get(this._editor);
                            controller?.applyCodeAction(aiCodeAction, false, false, ApplyCodeActionReason.FromProblemsHover);
                        },
                    });
                }
            }, onUnexpectedError);
        }
        return disposables;
    }
    getCodeActions(marker) {
        return createCancelablePromise((cancellationToken) => {
            return getCodeActions(this._languageFeaturesService.codeActionProvider, this._editor.getModel(), new Range(marker.startLineNumber, marker.startColumn, marker.endLineNumber, marker.endColumn), markerCodeActionTrigger, Progress.None, cancellationToken);
        });
    }
};
MarkerHoverParticipant = __decorate([
    __param(1, IMarkerDecorationsService),
    __param(2, IOpenerService),
    __param(3, ILanguageFeaturesService)
], MarkerHoverParticipant);
export { MarkerHoverParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VySG92ZXJQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvbWFya2VySG92ZXJQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLGlCQUFpQixHQUNqQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUcvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHckQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDekYsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixjQUFjLEVBQ2QsaUJBQWlCLEdBQ2pCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDdkYsT0FBTyxFQUNOLGNBQWMsRUFHZCx1QkFBdUIsR0FDdkIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RixPQUFPLEVBUU4sa0JBQWtCLEdBQ2xCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBRU4sV0FBVyxFQUNYLGNBQWMsR0FDZCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUVmLE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLFlBQ2lCLEtBQTJDLEVBQzNDLEtBQVksRUFDWixNQUFlO1FBRmYsVUFBSyxHQUFMLEtBQUssQ0FBc0M7UUFDM0MsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLFdBQU0sR0FBTixNQUFNLENBQVM7SUFDN0IsQ0FBQztJQUVHLHFCQUFxQixDQUFDLE1BQW1CO1FBQy9DLE9BQU8sQ0FDTixNQUFNLENBQUMsSUFBSSxrQ0FBMEI7WUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXO1lBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUM5QyxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSx1QkFBdUIsR0FBc0I7SUFDbEQsSUFBSSxzQ0FBOEI7SUFDbEMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUU7SUFDNUMsYUFBYSxFQUFFLHVCQUF1QixDQUFDLGFBQWE7Q0FDcEQsQ0FBQTtBQUVNLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBTWxDLFlBQ2tCLE9BQW9CLEVBRXJDLHlCQUFxRSxFQUNyRCxjQUErQyxFQUNyQyx3QkFBbUU7UUFKNUUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUVwQiw4QkFBeUIsR0FBekIseUJBQXlCLENBQTJCO1FBQ3BDLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUNwQiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBVjlFLGlCQUFZLEdBQVcsQ0FBQyxDQUFBO1FBRWhDLGdDQUEyQixHQUNsQyxTQUFTLENBQUE7SUFRUCxDQUFDO0lBRUcsV0FBVyxDQUFDLE1BQW1CLEVBQUUsZUFBbUM7UUFDMUUsSUFDQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ3hCLENBQUMsTUFBTSxDQUFDLElBQUksa0NBQTBCLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsRUFDckUsQ0FBQztZQUNGLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDckMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUE7UUFDL0MsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sTUFBTSxHQUFrQixFQUFFLENBQUE7UUFDaEMsS0FBSyxNQUFNLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNqQyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEYsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBRXRGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FDdEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQzVCLFdBQVcsRUFDWCxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDNUIsU0FBUyxDQUNULENBQUE7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sZ0JBQWdCLENBQ3RCLE9BQWtDLEVBQ2xDLFVBQXlCO1FBRXpCLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFDRCxNQUFNLGtCQUFrQixHQUFzQyxFQUFFLENBQUE7UUFDaEUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ2hDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzlELE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzlELGtCQUFrQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSx1QkFBdUIsR0FDNUIsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQ3RCLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5RixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDakYsT0FBTyxJQUFJLGtCQUFrQixDQUFDLGtCQUFrQixFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxTQUFzQjtRQUNqRCxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFBO0lBQ2hDLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxXQUF3QjtRQUNsRCxNQUFNLFdBQVcsR0FBb0IsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUMxRCxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDdkMsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQTtRQUM5RSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO1FBRXhFLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzNELGNBQWMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QyxjQUFjLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQTtRQUVsQyxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNwQixnQkFBZ0I7WUFDaEIsSUFBSSxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN0QyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7b0JBQ2pFLGFBQWEsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFBO2dCQUNqQyxDQUFDO2dCQUNELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7Z0JBQ25FLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7Z0JBRXpELFdBQVcsQ0FBQyxHQUFHLENBQ2QsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDbEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO29CQUM5RCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7b0JBQ2xCLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFFRCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtnQkFDbkQsV0FBVyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO2dCQUVsQyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO2dCQUN0RSxjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7Z0JBQ3BDLGNBQWMsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtZQUN6QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7Z0JBQzNELGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtnQkFDcEMsY0FBYyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO2dCQUN4QyxjQUFjLENBQUMsU0FBUztvQkFDdkIsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFBO1lBQ3ZFLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxlQUFlLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1lBQ3pDLEtBQUssTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxJQUFJLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3RGLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQ2hFLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFBO2dCQUM1QyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxDQUFDLENBQUMsU0FBUyxHQUFHLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLGVBQWUsS0FBSyxXQUFXLEtBQUssQ0FBQTtnQkFDM0UsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO2dCQUMxQixXQUFXLENBQUMsR0FBRyxDQUNkLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzNDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtvQkFDbkIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO29CQUNsQixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDekIsTUFBTSxhQUFhLEdBQXVCOzRCQUN6QyxTQUFTLEVBQUUsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFO3lCQUMzQyxDQUFBO3dCQUNELElBQUksQ0FBQyxjQUFjOzZCQUNqQixJQUFJLENBQUMsUUFBUSxFQUFFOzRCQUNmLGVBQWUsRUFBRSxJQUFJOzRCQUNyQixhQUFhO3lCQUNiLENBQUM7NkJBQ0QsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7b0JBQzNCLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFDRCxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFvQixvQkFBb0IsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtnQkFDckYsY0FBYyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUE7Z0JBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzNDLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBb0M7WUFDMUQsU0FBUyxFQUFFLFdBQVc7WUFDdEIsWUFBWTtZQUNaLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFO1NBQ3BDLENBQUE7UUFDRCxPQUFPLGlCQUFpQixDQUFBO0lBQ3pCLENBQUM7SUFFTyxzQkFBc0IsQ0FDN0IsT0FBa0MsRUFDbEMsV0FBd0I7UUFFeEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxJQUNDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQyxLQUFLO1lBQ3BELFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQyxPQUFPO1lBQ3RELFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQyxJQUFJLEVBQ2xELENBQUM7WUFDRixNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDM0QsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztvQkFDM0IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQztvQkFDbkQsU0FBUyxFQUFFLGdCQUFnQixDQUFDLEVBQUU7b0JBQzlCLEdBQUcsRUFBRSxHQUFHLEVBQUU7d0JBQ1QsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO3dCQUNkLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7d0JBQ2pELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQ3JCLENBQUM7aUJBQ0QsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUF1QixFQUFFLENBQUM7WUFDcEQsTUFBTSwwQkFBMEIsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNyRSxJQUFJLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO2dCQUN0QyxJQUNDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQztvQkFDNUQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQ3RDLENBQUM7b0JBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDdEQsMEJBQTBCLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3BELGNBQWMsRUFDZCwwQkFBMEIsQ0FDMUIsQ0FBQTtvQkFDRixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsMkJBQTJCLEdBQUcsU0FBUyxDQUFBO2dCQUM3QyxDQUFDO1lBQ0YsQ0FBQztZQUNELE1BQU0sMkJBQTJCLEdBQ2hDLElBQUksQ0FBQywyQkFBMkIsSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxjQUFjO2dCQUNuRixDQUFDLENBQUMsVUFBVSxDQUFDLElBQUk7Z0JBQ2pCLENBQUMsQ0FBQyxpQkFBaUIsQ0FDakIsR0FBRyxFQUFFLENBQ0osQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDckQsdUJBQXVCLEVBQ3ZCLDZCQUE2QixDQUM3QixDQUFDLEVBQ0gsR0FBRyxFQUNILFdBQVcsQ0FDWCxDQUFBO1lBQ0osSUFBSSxDQUFDLDBCQUEwQixDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM3QyxnREFBZ0Q7Z0JBQ2hELDBCQUEwQixDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUMsU0FBUztZQUM3RSxDQUFDO1lBQ0QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNsRSxXQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDaEUsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ25DLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNyQyxJQUFJLENBQUMsMkJBQTJCLEdBQUc7b0JBQ2xDLE1BQU0sRUFBRSxXQUFXLENBQUMsTUFBTTtvQkFDMUIsY0FBYyxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUM7aUJBQy9DLENBQUE7Z0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDdEQsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO29CQUNqQiwwQkFBMEIsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDcEQsY0FBYyxFQUNkLDBCQUEwQixDQUMxQixDQUFBO29CQUNELE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtnQkFFakQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO2dCQUNuQixXQUFXLENBQUMsR0FBRyxDQUNkLFlBQVksQ0FBQyxHQUFHLEVBQUU7b0JBQ2pCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDZCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7b0JBQ2xCLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFFRCxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztvQkFDM0IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQztvQkFDbEQsU0FBUyxFQUFFLGlCQUFpQjtvQkFDNUIsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7d0JBQ2YsT0FBTyxHQUFHLElBQUksQ0FBQTt3QkFDZCxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO3dCQUN6RCxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUE7d0JBQzFELGdGQUFnRjt3QkFDaEYsc0RBQXNEO3dCQUN0RCxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7d0JBQ2QsVUFBVSxFQUFFLGVBQWUsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLEVBQUU7NEJBQzdELENBQUMsRUFBRSxlQUFlLENBQUMsSUFBSTs0QkFDdkIsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxHQUFHOzRCQUN0QixLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUs7NEJBQzVCLE1BQU0sRUFBRSxlQUFlLENBQUMsTUFBTTt5QkFDOUIsQ0FBQyxDQUFBO29CQUNILENBQUM7aUJBQ0QsQ0FBQyxDQUFBO2dCQUVGLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM5RSxJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNsQixPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQzt3QkFDM0IsS0FBSyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSzt3QkFDaEMsU0FBUyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFO3dCQUNoRCxHQUFHLEVBQUUsR0FBRyxFQUFFOzRCQUNULE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7NEJBQ3pELFVBQVUsRUFBRSxlQUFlLENBQzFCLFlBQVksRUFDWixLQUFLLEVBQ0wsS0FBSyxFQUNMLHFCQUFxQixDQUFDLGlCQUFpQixDQUN2QyxDQUFBO3dCQUNGLENBQUM7cUJBQ0QsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUN0QixDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVPLGNBQWMsQ0FBQyxNQUFlO1FBQ3JDLE9BQU8sdUJBQXVCLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFO1lBQ3BELE9BQU8sY0FBYyxDQUNwQixJQUFJLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLEVBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLEVBQ3hCLElBQUksS0FBSyxDQUNSLE1BQU0sQ0FBQyxlQUFlLEVBQ3RCLE1BQU0sQ0FBQyxXQUFXLEVBQ2xCLE1BQU0sQ0FBQyxhQUFhLEVBQ3BCLE1BQU0sQ0FBQyxTQUFTLENBQ2hCLEVBQ0QsdUJBQXVCLEVBQ3ZCLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsaUJBQWlCLENBQ2pCLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBelNZLHNCQUFzQjtJQVFoQyxXQUFBLHlCQUF5QixDQUFBO0lBRXpCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSx3QkFBd0IsQ0FBQTtHQVhkLHNCQUFzQixDQXlTbEMifQ==