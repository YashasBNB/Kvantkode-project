/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addStandardDisposableListener, getDomNodePagePosition, } from '../../../../../../base/browser/dom.js';
import { Action } from '../../../../../../base/common/actions.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
export class InlineDiffDeletedCodeMargin extends Disposable {
    get visibility() {
        return this._visibility;
    }
    set visibility(_visibility) {
        if (this._visibility !== _visibility) {
            this._visibility = _visibility;
            this._diffActions.style.visibility = _visibility ? 'visible' : 'hidden';
        }
    }
    constructor(_getViewZoneId, _marginDomNode, _modifiedEditor, _diff, _editor, _viewLineCounts, _originalTextModel, _contextMenuService, _clipboardService) {
        super();
        this._getViewZoneId = _getViewZoneId;
        this._marginDomNode = _marginDomNode;
        this._modifiedEditor = _modifiedEditor;
        this._diff = _diff;
        this._editor = _editor;
        this._viewLineCounts = _viewLineCounts;
        this._originalTextModel = _originalTextModel;
        this._contextMenuService = _contextMenuService;
        this._clipboardService = _clipboardService;
        this._visibility = false;
        // make sure the diff margin shows above overlay.
        this._marginDomNode.style.zIndex = '10';
        this._diffActions = document.createElement('div');
        this._diffActions.className = ThemeIcon.asClassName(Codicon.lightBulb) + ' lightbulb-glyph';
        this._diffActions.style.position = 'absolute';
        const lineHeight = this._modifiedEditor.getOption(68 /* EditorOption.lineHeight */);
        this._diffActions.style.right = '0px';
        this._diffActions.style.visibility = 'hidden';
        this._diffActions.style.height = `${lineHeight}px`;
        this._diffActions.style.lineHeight = `${lineHeight}px`;
        this._marginDomNode.appendChild(this._diffActions);
        let currentLineNumberOffset = 0;
        const useShadowDOM = _modifiedEditor.getOption(132 /* EditorOption.useShadowDOM */) && !isIOS; // Do not use shadow dom on IOS #122035
        const showContextMenu = (x, y) => {
            this._contextMenuService.showContextMenu({
                domForShadowRoot: useShadowDOM ? (_modifiedEditor.getDomNode() ?? undefined) : undefined,
                getAnchor: () => ({ x, y }),
                getActions: () => {
                    const actions = [];
                    const isDeletion = _diff.modified.isEmpty;
                    // default action
                    actions.push(new Action('diff.clipboard.copyDeletedContent', isDeletion
                        ? _diff.original.length > 1
                            ? localize('diff.clipboard.copyDeletedLinesContent.label', 'Copy deleted lines')
                            : localize('diff.clipboard.copyDeletedLinesContent.single.label', 'Copy deleted line')
                        : _diff.original.length > 1
                            ? localize('diff.clipboard.copyChangedLinesContent.label', 'Copy changed lines')
                            : localize('diff.clipboard.copyChangedLinesContent.single.label', 'Copy changed line'), undefined, true, async () => {
                        const originalText = this._originalTextModel.getValueInRange(_diff.original.toExclusiveRange());
                        await this._clipboardService.writeText(originalText);
                    }));
                    if (_diff.original.length > 1) {
                        actions.push(new Action('diff.clipboard.copyDeletedLineContent', isDeletion
                            ? localize('diff.clipboard.copyDeletedLineContent.label', 'Copy deleted line ({0})', _diff.original.startLineNumber + currentLineNumberOffset)
                            : localize('diff.clipboard.copyChangedLineContent.label', 'Copy changed line ({0})', _diff.original.startLineNumber + currentLineNumberOffset), undefined, true, async () => {
                            let lineContent = this._originalTextModel.getLineContent(_diff.original.startLineNumber + currentLineNumberOffset);
                            if (lineContent === '') {
                                // empty line -> new line
                                const eof = this._originalTextModel.getEndOfLineSequence();
                                lineContent = eof === 0 /* EndOfLineSequence.LF */ ? '\n' : '\r\n';
                            }
                            await this._clipboardService.writeText(lineContent);
                        }));
                    }
                    const readOnly = _modifiedEditor.getOption(96 /* EditorOption.readOnly */);
                    if (!readOnly) {
                        actions.push(new Action('diff.inline.revertChange', localize('diff.inline.revertChange.label', 'Revert this change'), undefined, true, async () => {
                            this._editor.revert(this._diff);
                        }));
                    }
                    return actions;
                },
                autoSelectFirstItem: true,
            });
        };
        this._register(addStandardDisposableListener(this._diffActions, 'mousedown', (e) => {
            if (!e.leftButton) {
                return;
            }
            const { top, height } = getDomNodePagePosition(this._diffActions);
            const pad = Math.floor(lineHeight / 3);
            e.preventDefault();
            showContextMenu(e.posx, top + height + pad);
        }));
        this._register(_modifiedEditor.onMouseMove((e) => {
            if ((e.target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ ||
                e.target.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */) &&
                e.target.detail.viewZoneId === this._getViewZoneId()) {
                currentLineNumberOffset = this._updateLightBulbPosition(this._marginDomNode, e.event.browserEvent.y, lineHeight);
                this.visibility = true;
            }
            else {
                this.visibility = false;
            }
        }));
        this._register(_modifiedEditor.onMouseDown((e) => {
            if (!e.event.leftButton) {
                return;
            }
            if (e.target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ ||
                e.target.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */) {
                const viewZoneId = e.target.detail.viewZoneId;
                if (viewZoneId === this._getViewZoneId()) {
                    e.event.preventDefault();
                    currentLineNumberOffset = this._updateLightBulbPosition(this._marginDomNode, e.event.browserEvent.y, lineHeight);
                    showContextMenu(e.event.posx, e.event.posy + lineHeight);
                }
            }
        }));
    }
    _updateLightBulbPosition(marginDomNode, y, lineHeight) {
        const { top } = getDomNodePagePosition(marginDomNode);
        const offset = y - top;
        const lineNumberOffset = Math.floor(offset / lineHeight);
        const newTop = lineNumberOffset * lineHeight;
        this._diffActions.style.top = `${newTop}px`;
        if (this._viewLineCounts) {
            let acc = 0;
            for (let i = 0; i < this._viewLineCounts.length; i++) {
                acc += this._viewLineCounts[i];
                if (lineNumberOffset < acc) {
                    return i;
                }
            }
        }
        return lineNumberOffset;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRGlmZkRlbGV0ZWRDb2RlTWFyZ2luLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvY29tcG9uZW50cy9kaWZmRWRpdG9yVmlld1pvbmVzL2lubGluZURpZmZEZWxldGVkQ29kZU1hcmdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLHNCQUFzQixHQUN0QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFPdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBSW5ELE1BQU0sT0FBTywyQkFBNEIsU0FBUSxVQUFVO0lBSzFELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRUQsSUFBSSxVQUFVLENBQUMsV0FBb0I7UUFDbEMsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFBO1lBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO1FBQ3hFLENBQUM7SUFDRixDQUFDO0lBRUQs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