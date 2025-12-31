/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Widget } from '../widget.js';
import { Emitter } from '../../../common/event.js';
import './radio.css';
import { $ } from '../../dom.js';
import { Button } from '../button/button.js';
import { DisposableMap, DisposableStore } from '../../../common/lifecycle.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
export class Radio extends Widget {
    constructor(opts) {
        super();
        this._onDidSelect = this._register(new Emitter());
        this.onDidSelect = this._onDidSelect.event;
        this.items = [];
        this.buttons = this._register(new DisposableMap());
        this.hoverDelegate = opts.hoverDelegate ?? this._register(createInstantHoverDelegate());
        this.domNode = $('.monaco-custom-radio');
        this.domNode.setAttribute('role', 'radio');
        this.setItems(opts.items);
    }
    setItems(items) {
        this.buttons.clearAndDisposeAll();
        this.items = items;
        this.activeItem = this.items.find((item) => item.isActive) ?? this.items[0];
        for (let index = 0; index < this.items.length; index++) {
            const item = this.items[index];
            const disposables = new DisposableStore();
            const button = disposables.add(new Button(this.domNode, {
                hoverDelegate: this.hoverDelegate,
                title: item.tooltip,
                supportIcons: true,
            }));
            button.enabled = !item.disabled;
            disposables.add(button.onDidClick(() => {
                if (this.activeItem !== item) {
                    this.activeItem = item;
                    this.updateButtons();
                    this._onDidSelect.fire(index);
                }
            }));
            this.buttons.set(button, { item, dispose: () => disposables.dispose() });
        }
        this.updateButtons();
    }
    setActiveItem(index) {
        if (index < 0 || index >= this.items.length) {
            throw new Error('Invalid Index');
        }
        this.activeItem = this.items[index];
        this.updateButtons();
    }
    setEnabled(enabled) {
        for (const [button] of this.buttons) {
            button.enabled = enabled;
        }
    }
    updateButtons() {
        let isActive = false;
        for (const [button, { item }] of this.buttons) {
            const isPreviousActive = isActive;
            isActive = item === this.activeItem;
            button.element.classList.toggle('active', isActive);
            button.element.classList.toggle('previous-active', isPreviousActive);
            button.label = item.text;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFkaW8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvcmFkaW8vcmFkaW8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEQsT0FBTyxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUVoQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDNUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQXlCN0UsTUFBTSxPQUFPLEtBQU0sU0FBUSxNQUFNO0lBZWhDLFlBQVksSUFBbUI7UUFDOUIsS0FBSyxFQUFFLENBQUE7UUFmUyxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFBO1FBQzVELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFNdEMsVUFBSyxHQUFvQyxFQUFFLENBQUE7UUFHbEMsWUFBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hDLElBQUksYUFBYSxFQUF1RCxDQUN4RSxDQUFBO1FBS0EsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFBO1FBRXZGLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZ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