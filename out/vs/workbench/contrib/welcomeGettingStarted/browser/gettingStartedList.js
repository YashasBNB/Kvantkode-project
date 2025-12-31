/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { $ } from '../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Emitter } from '../../../../base/common/event.js';
import { equals } from '../../../../base/common/arrays.js';
export class GettingStartedIndexList extends Disposable {
    constructor(options) {
        super();
        this.options = options;
        this._onDidChangeEntries = new Emitter();
        this.onDidChangeEntries = this._onDidChangeEntries.event;
        this.isDisposed = false;
        this.contextKeysToWatch = new Set();
        this.contextService = options.contextService;
        this.entries = undefined;
        this.itemCount = 0;
        this.list = $('ul');
        this.scrollbar = this._register(new DomScrollableElement(this.list, {}));
        this._register(this.onDidChangeEntries(() => this.scrollbar.scanDomNode()));
        this.domElement = $('.index-list.' + options.klass, {}, $('h2', {}, options.title), this.scrollbar.getDomNode());
        this._register(this.contextService.onDidChangeContext((e) => {
            if (e.affectsSome(this.contextKeysToWatch)) {
                this.rerender();
            }
        }));
    }
    getDomElement() {
        return this.domElement;
    }
    layout(size) {
        this.scrollbar.scanDomNode();
    }
    onDidChange(listener) {
        this._register(this.onDidChangeEntries(listener));
    }
    register(d) {
        if (this.isDisposed) {
            d.dispose();
        }
        else {
            this._register(d);
        }
    }
    dispose() {
        this.isDisposed = true;
        super.dispose();
    }
    setLimit(limit) {
        this.options.limit = limit;
        this.setEntries(this.entries);
    }
    rerender() {
        this.setEntries(this.entries);
    }
    setEntries(entries) {
        let entryList = entries ?? [];
        this.itemCount = 0;
        const ranker = this.options.rankElement;
        if (ranker) {
            entryList = entryList.filter((e) => ranker(e) !== null);
            entryList.sort((a, b) => ranker(b) - ranker(a));
        }
        const activeEntries = entryList.filter((e) => !e.when || this.contextService.contextMatchesRules(e.when));
        const limitedEntries = activeEntries.slice(0, this.options.limit);
        const toRender = limitedEntries.map((e) => e.id);
        if (this.entries === entries && equals(toRender, this.lastRendered)) {
            return;
        }
        this.entries = entries;
        this.contextKeysToWatch.clear();
        entryList.forEach((e) => {
            const keys = e.when?.keys();
            keys?.forEach((key) => this.contextKeysToWatch.add(key));
        });
        this.lastRendered = toRender;
        this.itemCount = limitedEntries.length;
        while (this.list.firstChild) {
            this.list.firstChild.remove();
        }
        this.itemCount = limitedEntries.length;
        for (const entry of limitedEntries) {
            const rendered = this.options.renderElement(entry);
            this.list.appendChild(rendered);
        }
        if (activeEntries.length > limitedEntries.length && this.options.more) {
            this.list.appendChild(this.options.more);
        }
        else if (entries !== undefined && this.itemCount === 0 && this.options.empty) {
            this.list.appendChild(this.options.empty);
        }
        else if (this.options.footer) {
            this.list.appendChild(this.options.footer);
        }
        this._onDidChangeEntries.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRMaXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRMaXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsQ0FBQyxFQUFhLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBS2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQWMxRCxNQUFNLE9BQU8sdUJBRVgsU0FBUSxVQUFVO0lBbUJuQixZQUFvQixPQUEwQztRQUM3RCxLQUFLLEVBQUUsQ0FBQTtRQURZLFlBQU8sR0FBUCxPQUFPLENBQW1DO1FBbEI3Qyx3QkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQ3pDLHVCQUFrQixHQUFnQixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBWXpFLGVBQVUsR0FBRyxLQUFLLENBQUE7UUFHbEIsdUJBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUs3QyxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUE7UUFFNUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUE7UUFFeEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDbEIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENB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