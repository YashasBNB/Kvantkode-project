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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlbGVjdGVkVG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNlbGVjdGVkVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRTFGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLE9BQU8sRUFDUCxPQUFPLEVBRVAsbUJBQW1CLEdBQ25CLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sMEJBQTBCLEVBRTFCLGNBQWMsR0FDZCxNQUFNLHdDQUF3QyxDQUFBO0FBYy9DLE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFhO0lBQ2pELFlBQVksRUFBRSxFQUFFO0lBQ2hCLEdBQUcsRUFBRSxvQkFBb0I7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