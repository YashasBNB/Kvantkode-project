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
import { reset } from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, observableFromEvent, } from '../../../../base/common/observable.js';
import { assertType } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableMemento, } from '../../../../platform/observable/common/observableMemento.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ILanguageModelToolsService, ToolDataSource, } from '../common/languageModelToolsService.js';
const storedTools = observableMemento({
    defaultValue: {},
    key: 'chat/selectedTools',
});
let ChatSelectedTools = class ChatSelectedTools extends Disposable {
    constructor(toolsService, instaService, storageService) {
        super();
        this._selectedTools = this._register(storedTools(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, storageService));
        const allTools = observableFromEvent(toolsService.onDidChangeTools, () => Array.from(toolsService.getTools()).filter((t) => t.supportsToolPicker));
        const disabledData = this._selectedTools.map((data) => {
            return ((data.disabledBuckets?.length || data.disabledTools?.length) && {
                buckets: new Set(data.disabledBuckets),
                toolIds: new Set(data.disabledTools),
            });
        });
        this.tools = derived((r) => {
            const disabled = disabledData.read(r);
            const tools = allTools.read(r);
            if (!disabled) {
                return tools;
            }
            return tools.filter((t) => !(disabled.toolIds.has(t.id) || disabled.buckets.has(ToolDataSource.toKey(t.source))));
        });
        const toolsCount = derived((r) => {
            const count = allTools.read(r).length;
            const enabled = this.tools.read(r).length;
            return { count, enabled };
        });
        const onDidRender = this._store.add(new Emitter());
        this.toolsActionItemViewItemProvider = Object.assign((action, options) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instaService.createInstance(class extends MenuEntryActionViewItem {
                render(container) {
                    this.options.icon = false;
                    this.options.label = true;
                    container.classList.add('chat-mcp');
                    super.render(container);
                }
                updateLabel() {
                    this._store.add(autorun((r) => {
                        assertType(this.label);
                        const { enabled, count } = toolsCount.read(r);
                        const message = count === 0
                            ? '$(tools)'
                            : enabled !== count
                                ? localize('tool.1', '{0} {1} of {2}', '$(tools)', enabled, count)
                                : localize('tool.0', '{0} {1}', '$(tools)', count);
                        reset(this.label, ...renderLabelWithIcons(message));
                        if (this.element?.isConnected) {
                            onDidRender.fire();
                        }
                    }));
                }
            }, action, { ...options, keybindingNotRenderedWithLabel: true });
        }, { onDidRender: onDidRender.event });
    }
    update(disableBuckets, disableTools) {
        this._selectedTools.set({
            disabledBuckets: disableBuckets.map(ToolDataSource.toKey),
            disabledTools: disableTools.map((t) => t.id),
        }, undefined);
    }
};
ChatSelectedTools = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInstantiationService),
    __param(2, IStorageService)
], ChatSelectedTools);
export { ChatSelectedTools };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlbGVjdGVkVG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2VsZWN0ZWRUb29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFFMUYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sT0FBTyxFQUNQLE9BQU8sRUFFUCxtQkFBbUIsR0FDbkIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTiwwQkFBMEIsRUFFMUIsY0FBYyxHQUNkLE1BQU0sd0NBQXdDLENBQUE7QUFjL0MsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQWE7SUFDakQsWUFBWSxFQUFFLEVBQUU7SUFDaEIsR0FBRyxFQUFFLG9C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