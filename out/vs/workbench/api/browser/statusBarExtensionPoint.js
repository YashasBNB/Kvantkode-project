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
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import { IStatusbarService, } from '../../services/statusbar/browser/statusbar.js';
import { isAccessibilityInformation, } from '../../../platform/accessibility/common/accessibility.js';
import { isMarkdownString } from '../../../base/common/htmlContent.js';
import { getCodiconAriaLabel } from '../../../base/common/iconLabels.js';
import { hash } from '../../../base/common/hash.js';
import { Emitter } from '../../../base/common/event.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { Iterable } from '../../../base/common/iterator.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { asStatusBarItemIdentifier } from '../common/extHostTypes.js';
import { STATUS_BAR_ERROR_ITEM_BACKGROUND, STATUS_BAR_WARNING_ITEM_BACKGROUND, } from '../../common/theme.js';
// --- service
export const IExtensionStatusBarItemService = createDecorator('IExtensionStatusBarItemService');
export var StatusBarUpdateKind;
(function (StatusBarUpdateKind) {
    StatusBarUpdateKind[StatusBarUpdateKind["DidDefine"] = 0] = "DidDefine";
    StatusBarUpdateKind[StatusBarUpdateKind["DidUpdate"] = 1] = "DidUpdate";
})(StatusBarUpdateKind || (StatusBarUpdateKind = {}));
let ExtensionStatusBarItemService = class ExtensionStatusBarItemService {
    constructor(_statusbarService) {
        this._statusbarService = _statusbarService;
        this._entries = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        this._entries.forEach((entry) => entry.accessor.dispose());
        this._entries.clear();
        this._onDidChange.dispose();
    }
    setOrUpdateEntry(entryId, id, extensionId, name, text, tooltip, command, color, backgroundColor, alignLeft, priority, accessibilityInformation) {
        // if there are icons in the text use the tooltip for the aria label
        let ariaLabel;
        let role = undefined;
        if (accessibilityInformation) {
            ariaLabel = accessibilityInformation.label;
            role = accessibilityInformation.role;
        }
        else {
            ariaLabel = getCodiconAriaLabel(text);
            if (typeof tooltip === 'string' || isMarkdownString(tooltip)) {
                const tooltipString = typeof tooltip === 'string' ? tooltip : tooltip.value;
                ariaLabel += `, ${tooltipString}`;
            }
        }
        let kind = undefined;
        switch (backgroundColor?.id) {
            case STATUS_BAR_ERROR_ITEM_BACKGROUND:
            case STATUS_BAR_WARNING_ITEM_BACKGROUND:
                // override well known colors that map to status entry kinds to support associated themable hover colors
                kind = backgroundColor.id === STATUS_BAR_ERROR_ITEM_BACKGROUND ? 'error' : 'warning';
                color = undefined;
                backgroundColor = undefined;
        }
        const entry = {
            name,
            text,
            tooltip,
            command,
            color,
            backgroundColor,
            ariaLabel,
            role,
            kind,
            extensionId,
        };
        if (typeof priority === 'undefined') {
            priority = 0;
        }
        let alignment = alignLeft ? 0 /* StatusbarAlignment.LEFT */ : 1 /* StatusbarAlignment.RIGHT */;
        // alignment and priority can only be set once (at creation time)
        const existingEntry = this._entries.get(entryId);
        if (existingEntry) {
            alignment = existingEntry.alignment;
            priority = existingEntry.priority;
        }
        // Create new entry if not existing
        if (!existingEntry) {
            let entryPriority;
            if (typeof extensionId === 'string') {
                // We cannot enforce unique priorities across all extensions, so we
                // use the extension identifier as a secondary sort key to reduce
                // the likelyhood of collisions.
                // See https://github.com/microsoft/vscode/issues/177835
                // See https://github.com/microsoft/vscode/issues/123827
                entryPriority = { primary: priority, secondary: hash(extensionId) };
            }
            else {
                entryPriority = priority;
            }
            const accessor = this._statusbarService.addEntry(entry, id, alignment, entryPriority);
            this._entries.set(entryId, {
                accessor,
                entry,
                alignment,
                priority,
                disposable: toDisposable(() => {
                    accessor.dispose();
                    this._entries.delete(entryId);
                    this._onDidChange.fire({ removed: entryId });
                }),
            });
            this._onDidChange.fire({ added: [entryId, { entry, alignment, priority }] });
            return 0 /* StatusBarUpdateKind.DidDefine */;
        }
        else {
            // Otherwise update
            existingEntry.accessor.update(entry);
            existingEntry.entry = entry;
            return 1 /* StatusBarUpdateKind.DidUpdate */;
        }
    }
    unsetEntry(entryId) {
        this._entries.get(entryId)?.disposable.dispose();
        this._entries.delete(entryId);
    }
    getEntries() {
        return this._entries.entries();
    }
};
ExtensionStatusBarItemService = __decorate([
    __param(0, IStatusbarService)
], ExtensionStatusBarItemService);
registerSingleton(IExtensionStatusBarItemService, ExtensionStatusBarItemService, 1 /* InstantiationType.Delayed */);
function isUserFriendlyStatusItemEntry(candidate) {
    const obj = candidate;
    return (typeof obj.id === 'string' &&
        obj.id.length > 0 &&
        typeof obj.name === 'string' &&
        typeof obj.text === 'string' &&
        (obj.alignment === 'left' || obj.alignment === 'right') &&
        (obj.command === undefined || typeof obj.command === 'string') &&
        (obj.tooltip === undefined || typeof obj.tooltip === 'string') &&
        (obj.priority === undefined || typeof obj.priority === 'number') &&
        (obj.accessibilityInformation === undefined ||
            isAccessibilityInformation(obj.accessibilityInformation)));
}
const statusBarItemSchema = {
    type: 'object',
    required: ['id', 'text', 'alignment', 'name'],
    properties: {
        id: {
            type: 'string',
            markdownDescription: localize('id', 'The identifier of the status bar entry. Must be unique within the extension. The same value must be used when calling the `vscode.window.createStatusBarItem(id, ...)`-API'),
        },
        name: {
            type: 'string',
            description: localize('name', "The name of the entry, like 'Python Language Indicator', 'Git Status' etc. Try to keep the length of the name short, yet descriptive enough that users can understand what the status bar item is about."),
        },
        text: {
            type: 'string',
            description: localize('text', "The text to show for the entry. You can embed icons in the text by leveraging the `$(<name>)`-syntax, like 'Hello $(globe)!'"),
        },
        tooltip: {
            type: 'string',
            description: localize('tooltip', 'The tooltip text for the entry.'),
        },
        command: {
            type: 'string',
            description: localize('command', 'The command to execute when the status bar entry is clicked.'),
        },
        alignment: {
            type: 'string',
            enum: ['left', 'right'],
            description: localize('alignment', 'The alignment of the status bar entry.'),
        },
        priority: {
            type: 'number',
            description: localize('priority', 'The priority of the status bar entry. Higher value means the item should be shown more to the left.'),
        },
        accessibilityInformation: {
            type: 'object',
            description: localize('accessibilityInformation', 'Defines the role and aria label to be used when the status bar entry is focused.'),
            properties: {
                role: {
                    type: 'string',
                    description: localize('accessibilityInformation.role', 'The role of the status bar entry which defines how a screen reader interacts with it. More about aria roles can be found here https://w3c.github.io/aria/#widget_roles'),
                },
                label: {
                    type: 'string',
                    description: localize('accessibilityInformation.label', "The aria label of the status bar entry. Defaults to the entry's text."),
                },
            },
        },
    },
};
const statusBarItemsSchema = {
    description: localize('vscode.extension.contributes.statusBarItems', 'Contributes items to the status bar.'),
    oneOf: [
        statusBarItemSchema,
        {
            type: 'array',
            items: statusBarItemSchema,
        },
    ],
};
const statusBarItemsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'statusBarItems',
    jsonSchema: statusBarItemsSchema,
});
let StatusBarItemsExtensionPoint = class StatusBarItemsExtensionPoint {
    constructor(statusBarItemsService) {
        const contributions = new DisposableStore();
        statusBarItemsExtensionPoint.setHandler((extensions) => {
            contributions.clear();
            for (const entry of extensions) {
                if (!isProposedApiEnabled(entry.description, 'contribStatusBarItems')) {
                    entry.collector.error(`The ${statusBarItemsExtensionPoint.name} is proposed API`);
                    continue;
                }
                const { value, collector } = entry;
                for (const candidate of Iterable.wrap(value)) {
                    if (!isUserFriendlyStatusItemEntry(candidate)) {
                        collector.error(localize('invalid', 'Invalid status bar item contribution.'));
                        continue;
                    }
                    const fullItemId = asStatusBarItemIdentifier(entry.description.identifier, candidate.id);
                    const kind = statusBarItemsService.setOrUpdateEntry(fullItemId, fullItemId, ExtensionIdentifier.toKey(entry.description.identifier), candidate.name ?? entry.description.displayName ?? entry.description.name, candidate.text, candidate.tooltip, candidate.command ? { id: candidate.command, title: candidate.name } : undefined, undefined, undefined, candidate.alignment === 'left', candidate.priority, candidate.accessibilityInformation);
                    if (kind === 0 /* StatusBarUpdateKind.DidDefine */) {
                        contributions.add(toDisposable(() => statusBarItemsService.unsetEntry(fullItemId)));
                    }
                }
            }
        });
    }
};
StatusBarItemsExtensionPoint = __decorate([
    __param(0, IExtensionStatusBarItemService)
], StatusBarItemsExtensionPoint);
export { StatusBarItemsExtensionPoint };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzQmFyRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvc3RhdHVzQmFyRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFDTixpQkFBaUIsR0FPakIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUd0RCxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtB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