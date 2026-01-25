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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzQmFyRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9zdGF0dXNCYXJFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDM0YsT0FBTyxFQUNOLGlCQUFpQixHQU9qQixNQUFNLCtDQUErQyxDQUFBO0FBR3RELE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJCQUEyQixD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