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
import { disposableTimeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { noBreakWhitespace } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import './inlineProgressWidget.css';
import { Range } from '../../../common/core/range.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
const inlineProgressDecoration = ModelDecorationOptions.register({
    description: 'inline-progress-widget',
    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    showIfCollapsed: true,
    after: {
        content: noBreakWhitespace,
        inlineClassName: 'inline-editor-progress-decoration',
        inlineClassNameAffectsLetterSpacing: true,
    },
});
class InlineProgressWidget extends Disposable {
    static { this.baseId = 'editor.widget.inlineProgressWidget'; }
    constructor(typeId, editor, range, title, delegate) {
        super();
        this.typeId = typeId;
        this.editor = editor;
        this.range = range;
        this.delegate = delegate;
        this.allowEditorOverflow = false;
        this.suppressMouseDown = true;
        this.create(title);
        this.editor.addContentWidget(this);
        this.editor.layoutContentWidget(this);
    }
    create(title) {
        this.domNode = dom.$('.inline-progress-widget');
        this.domNode.role = 'button';
        this.domNode.title = title;
        const iconElement = dom.$('span.icon');
        this.domNode.append(iconElement);
        iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.loading), 'codicon-modifier-spin');
        const updateSize = () => {
            const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
            this.domNode.style.height = `${lineHeight}px`;
            this.domNode.style.width = `${Math.ceil(0.8 * lineHeight)}px`;
        };
        updateSize();
        this._register(this.editor.onDidChangeConfiguration((c) => {
            if (c.hasChanged(54 /* EditorOption.fontSize */) || c.hasChanged(68 /* EditorOption.lineHeight */)) {
                updateSize();
            }
        }));
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.CLICK, (e) => {
            this.delegate.cancel();
        }));
    }
    getId() {
        return InlineProgressWidget.baseId + '.' + this.typeId;
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        return {
            position: { lineNumber: this.range.startLineNumber, column: this.range.startColumn },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */],
        };
    }
    dispose() {
        super.dispose();
        this.editor.removeContentWidget(this);
    }
}
let InlineProgressManager = class InlineProgressManager extends Disposable {
    constructor(id, _editor, _instantiationService) {
        super();
        this.id = id;
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        /** Delay before showing the progress widget */
        this._showDelay = 500; // ms
        this._showPromise = this._register(new MutableDisposable());
        this._currentWidget = this._register(new MutableDisposable());
        this._operationIdPool = 0;
        this._currentDecorations = _editor.createDecorationsCollection();
    }
    dispose() {
        super.dispose();
        this._currentDecorations.clear();
    }
    async showWhile(position, title, promise, delegate, delayOverride) {
        const operationId = this._operationIdPool++;
        this._currentOperation = operationId;
        this.clear();
        this._showPromise.value = disposableTimeout(() => {
            const range = Range.fromPositions(position);
            const decorationIds = this._currentDecorations.set([
                {
                    range: range,
                    options: inlineProgressDecoration,
                },
            ]);
            if (decorationIds.length > 0) {
                this._currentWidget.value = this._instantiationService.createInstance(InlineProgressWidget, this.id, this._editor, range, title, delegate);
            }
        }, delayOverride ?? this._showDelay);
        try {
            return await promise;
        }
        finally {
            if (this._currentOperation === operationId) {
                this.clear();
                this._currentOperation = undefined;
            }
        }
    }
    clear() {
        this._showPromise.clear();
        this._currentDecorations.clear();
        this._currentWidget.clear();
    }
};
InlineProgressManager = __decorate([
    __param(2, IInstantiationService)
], InlineProgressManager);
export { InlineProgressManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lUHJvZ3Jlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVQcm9ncmVzcy9icm93c2VyL2lubGluZVByb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyw0QkFBNEIsQ0FBQTtBQVNuQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHckQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsTUFBTSx3QkFBd0IsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7SUFDaEUsV0FBVyxFQUFFLHdCQUF3QjtJQUNyQyxVQUFVLDREQUFvRDtJQUM5RCxlQUFlLEVBQUUsSUFBSTtJQUNyQixLQUFLLEVBQUU7UUFDTixPQUFPLEVBQUUsaUJBQWlCO1FBQzFCLGVBQWUsRUFBRSxtQ0FBbUM7UUFDcEQsbUNBQW1DLEVBQUUsSUFBSTtLQUN6QztDQUNELENBQUMsQ0FBQTtBQUVGLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTthQUNwQixXQUFNLEdBQUcsb0NBQW9DLEFBQXZDLENBQXVDO0lBT3JFLFlBQ2tCLE1BQWMsRUFDZCxNQUFtQixFQUNuQixLQUFZLEVBQzdCLEtBQWEsRUFDSSxRQUFnQztRQUVqRCxLQUFLLEVBQUUsQ0FBQTtRQU5VLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLFVBQUssR0FBTCxLQUFLLENBQU87UUFFWixhQUFRLEdBQVIsUUFBUSxDQUF3QjtRQVZsRCx3QkFBbUIsR0FBRyxLQUFLLENBQUE7UUFDM0Isc0JBQWlCLEdBQUcsSUFBSSxDQUFBO1FBYXZCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFTyxNQUFNLENBQUMsS0FBYTtRQUMzQixJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUE7UUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBRTFCLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFaEMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQ3hCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFDOUMsdUJBQXVCLENBQ3ZCLENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxHQUFHLEVBQUU7WUFDdkIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLGtDQUF5QixDQUFBO1lBQ2pFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLFVBQVUsSUFBSSxDQUFBO1lBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFDOUQsQ0FBQyxDQUFBO1FBQ0QsVUFBVSxFQUFFLENBQUE7UUFFWixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsQ0FBQyxVQUFVLGdDQUF1QixJQUFJLENBQUMsQ0FBQyxVQUFVLGtDQUF5QixFQUFFLENBQUM7Z0JBQ2xGLFVBQVUsRUFBRSxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUN2QixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUN2RCxDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBRUQsV0FBVztRQUNWLE9BQU87WUFDTixRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3BGLFVBQVUsRUFBRSwrQ0FBdUM7U0FDbkQsQ0FBQTtJQUNGLENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN0QyxDQUFDOztBQU9LLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQVdwRCxZQUNrQixFQUFVLEVBQ1YsT0FBb0IsRUFDZCxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFKVSxPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ1YsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNHLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFickYsK0NBQStDO1FBQzlCLGVBQVUsR0FBRyxHQUFHLENBQUEsQ0FBQyxLQUFLO1FBQ3RCLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUd0RCxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBd0IsQ0FBQyxDQUFBO1FBRXZGLHFCQUFnQixHQUFHLENBQUMsQ0FBQTtRQVUzQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixFQUFFLENBQUE7SUFDakUsQ0FBQztJQUVlLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFTSxLQUFLLENBQUMsU0FBUyxDQUNyQixRQUFtQixFQUNuQixLQUFhLEVBQ2IsT0FBbUIsRUFDbkIsUUFBZ0MsRUFDaEMsYUFBc0I7UUFFdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDM0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFdBQVcsQ0FBQTtRQUVwQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFWixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7WUFDaEQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMzQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDO2dCQUNsRDtvQkFDQyxLQUFLLEVBQUUsS0FBSztvQkFDWixPQUFPLEVBQUUsd0JBQXdCO2lCQUNqQzthQUNELENBQUMsQ0FBQTtZQUVGLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDcEUsb0JBQW9CLEVBQ3BCLElBQUksQ0FBQyxFQUFFLEVBQ1AsSUFBSSxDQUFDLE9BQU8sRUFDWixLQUFLLEVBQ0wsS0FBSyxFQUNMLFFBQVEsQ0FDUixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsRUFBRSxhQUFhLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRXBDLElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxPQUFPLENBQUE7UUFDckIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDWixJQUFJLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFBO1lBQ25DLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUs7UUFDWixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQzVCLENBQUM7Q0FDRCxDQUFBO0FBMUVZLHFCQUFxQjtJQWMvQixXQUFBLHFCQUFxQixDQUFBO0dBZFgscUJBQXFCLENBMEVqQyJ9