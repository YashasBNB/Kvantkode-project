/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as nls from '../../../../nls.js';
import { Memento } from '../../../common/memento.js';
import { CustomEditorInfo } from './customEditor.js';
import { customEditorsExtensionPoint } from './extensionPoint.js';
import { RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
export class ContributedCustomEditors extends Disposable {
    static { this.CUSTOM_EDITORS_STORAGE_ID = 'customEditors'; }
    static { this.CUSTOM_EDITORS_ENTRY_ID = 'editors'; }
    constructor(storageService) {
        super();
        this._editors = new Map();
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._memento = new Memento(ContributedCustomEditors.CUSTOM_EDITORS_STORAGE_ID, storageService);
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const info of (mementoObject[ContributedCustomEditors.CUSTOM_EDITORS_ENTRY_ID] ||
            [])) {
            this.add(new CustomEditorInfo(info));
        }
        customEditorsExtensionPoint.setHandler((extensions) => {
            this.update(extensions);
        });
    }
    update(extensions) {
        this._editors.clear();
        for (const extension of extensions) {
            for (const webviewEditorContribution of extension.value) {
                this.add(new CustomEditorInfo({
                    id: webviewEditorContribution.viewType,
                    displayName: webviewEditorContribution.displayName,
                    providerDisplayName: extension.description.isBuiltin
                        ? nls.localize('builtinProviderDisplayName', 'Built-in')
                        : extension.description.displayName || extension.description.identifier.value,
                    selector: webviewEditorContribution.selector || [],
                    priority: getPriorityFromContribution(webviewEditorContribution, extension.description),
                }));
            }
        }
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        mementoObject[ContributedCustomEditors.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._editors.values());
        this._memento.saveMemento();
        this._onChange.fire();
    }
    [Symbol.iterator]() {
        return this._editors.values();
    }
    get(viewType) {
        return this._editors.get(viewType);
    }
    getContributedEditors(resource) {
        return Array.from(this._editors.values()).filter((customEditor) => customEditor.matches(resource));
    }
    add(info) {
        if (this._editors.has(info.id)) {
            console.error(`Custom editor with id '${info.id}' already registered`);
            return;
        }
        this._editors.set(info.id, info);
    }
}
function getPriorityFromContribution(contribution, extension) {
    switch (contribution.priority) {
        case RegisteredEditorPriority.default:
        case RegisteredEditorPriority.option:
            return contribution.priority;
        case RegisteredEditorPriority.builtin:
            // Builtin is only valid for builtin extensions
            return extension.isBuiltin
                ? RegisteredEditorPriority.builtin
                : RegisteredEditorPriority.default;
        default:
            return RegisteredEditorPriority.default;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0ZWRDdXN0b21FZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY3VzdG9tRWRpdG9yL2NvbW1vbi9jb250cmlidXRlZEN1c3RvbUVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBT3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRCxPQUFPLEVBQTBCLGdCQUFnQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDNUUsT0FBTyxFQUFFLDJCQUEyQixFQUFnQyxNQUFNLHFCQUFxQixDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBR25HLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxVQUFVO2FBQy9CLDhCQUF5QixHQUFHLGVBQWUsQUFBbEIsQ0FBa0I7YUFDM0MsNEJBQXVCLEdBQUcsU0FBUyxBQUFaLENBQVk7SUFLM0QsWUFBWSxjQUErQjtRQUMxQyxLQUFLLEVBQUUsQ0FBQTtRQUpTLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQTtRQW1COUMsY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ2hELGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQTtRQWQ5QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLHdCQUF3QixDQUFDLHlCQUF5QixFQUFFLGNBQWMsQ0FBQyxDQUFBO1FB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