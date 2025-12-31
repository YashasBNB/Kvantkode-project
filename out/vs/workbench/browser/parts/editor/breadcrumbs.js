/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export const IBreadcrumbsService = createDecorator('IEditorBreadcrumbsService');
export class BreadcrumbsService {
    constructor() {
        this._map = new Map();
    }
    register(group, widget) {
        if (this._map.has(group)) {
            throw new Error(`group (${group}) has already a widget`);
        }
        this._map.set(group, widget);
        return {
            dispose: () => this._map.delete(group),
        };
    }
    getWidget(group) {
        return this._map.get(group);
    }
}
registerSingleton(IBreadcrumbsService, BreadcrumbsService, 1 /* InstantiationType.Delayed */);
//#region config
export class BreadcrumbsConfig {
    constructor() {
        // internal
    }
    static { this.IsEnabled = BreadcrumbsConfig._stub('breadcrumbs.enabled'); }
    static { this.UseQuickPick = BreadcrumbsConfig._stub('breadcrumbs.useQuickPick'); }
    static { this.FilePath = BreadcrumbsConfig._stub('breadcrumbs.filePath'); }
    static { this.SymbolPath = BreadcrumbsConfig._stub('breadcrumbs.symbolPath'); }
    static { this.SymbolSortOrder = BreadcrumbsConfig._stub('breadcrumbs.symbolSortOrder'); }
    static { this.Icons = BreadcrumbsConfig._stub('breadcrumbs.icons'); }
    static { this.TitleScrollbarSizing = BreadcrumbsConfig._stub('workbench.editor.titleScrollbarSizing'); }
    static { this.FileExcludes = BreadcrumbsConfig._stub('files.exclude'); }
    static _stub(name) {
        return {
            bindTo(service) {
                const onDidChange = new Emitter();
                const listener = service.onDidChangeConfiguration((e) => {
                    if (e.affectsConfiguration(name)) {
                        onDidChange.fire(undefined);
                    }
                });
                return new (class {
                    constructor() {
                        this.name = name;
                        this.onDidChange = onDidChange.event;
                    }
                    getValue(overrides) {
                        if (overrides) {
                            return service.getValue(name, overrides);
                        }
                        else {
                            return service.getValue(name);
                        }
                    }
                    updateValue(newValue, overrides) {
                        if (overrides) {
                            return service.updateValue(name, newValue, overrides);
                        }
                        else {
                            return service.updateValue(name, newValue);
                        }
                    }
                    dispose() {
                        listener.dispose();
                        onDidChange.dispose();
                    }
                })();
            },
        };
    }
}
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'breadcrumbs',
    title: localize('title', 'Breadcrumb Navigation'),
    order: 101,
    type: 'object',
    properties: {
        'breadcrumbs.enabled': {
            description: localize('enabled', 'Enable/disable navigation breadcrumbs.'),
            type: 'boolean',
            default: true,
        },
        'breadcrumbs.filePath': {
            description: localize('filepath', 'Controls whether and how file paths are shown in the breadcrumbs view.'),
            type: 'string',
            default: 'on',
            enum: ['on', 'off', 'last'],
            enumDescriptions: [
                localize('filepath.on', 'Show the file path in the breadcrumbs view.'),
                localize('filepath.off', 'Do not show the file path in the breadcrumbs view.'),
                localize('filepath.last', 'Only show the last element of the file path in the breadcrumbs view.'),
            ],
        },
        'breadcrumbs.symbolPath': {
            description: localize('symbolpath', 'Controls whether and how symbols are shown in the breadcrumbs view.'),
            type: 'string',
            default: 'on',
            enum: ['on', 'off', 'last'],
            enumDescriptions: [
                localize('symbolpath.on', 'Show all symbols in the breadcrumbs view.'),
                localize('symbolpath.off', 'Do not show symbols in the breadcrumbs view.'),
                localize('symbolpath.last', 'Only show the current symbol in the breadcrumbs view.'),
            ],
        },
        'breadcrumbs.symbolSortOrder': {
            description: localize('symbolSortOrder', 'Controls how symbols are sorted in the breadcrumbs outline view.'),
            type: 'string',
            default: 'position',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            enum: ['position', 'name', 'type'],
            enumDescriptions: [
                localize('symbolSortOrder.position', 'Show symbol outline in file position order.'),
                localize('symbolSortOrder.name', 'Show symbol outline in alphabetical order.'),
                localize('symbolSortOrder.type', 'Show symbol outline in symbol type order.'),
            ],
        },
        'breadcrumbs.icons': {
            description: localize('icons', 'Render breadcrumb items with icons.'),
            type: 'boolean',
            default: true,
        },
        'breadcrumbs.showFiles': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.file', 'When enabled breadcrumbs show `file`-symbols.'),
        },
        'breadcrumbs.showModules': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.module', 'When enabled breadcrumbs show `module`-symbols.'),
        },
        'breadcrumbs.showNamespaces': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.namespace', 'When enabled breadcrumbs show `namespace`-symbols.'),
        },
        'breadcrumbs.showPackages': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.package', 'When enabled breadcrumbs show `package`-symbols.'),
        },
        'breadcrumbs.showClasses': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.class', 'When enabled breadcrumbs show `class`-symbols.'),
        },
        'breadcrumbs.showMethods': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.method', 'When enabled breadcrumbs show `method`-symbols.'),
        },
        'breadcrumbs.showProperties': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.property', 'When enabled breadcrumbs show `property`-symbols.'),
        },
        'breadcrumbs.showFields': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.field', 'When enabled breadcrumbs show `field`-symbols.'),
        },
        'breadcrumbs.showConstructors': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.constructor', 'When enabled breadcrumbs show `constructor`-symbols.'),
        },
        'breadcrumbs.showEnums': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.enum', 'When enabled breadcrumbs show `enum`-symbols.'),
        },
        'breadcrumbs.showInterfaces': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.interface', 'When enabled breadcrumbs show `interface`-symbols.'),
        },
        'breadcrumbs.showFunctions': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.function', 'When enabled breadcrumbs show `function`-symbols.'),
        },
        'breadcrumbs.showVariables': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.variable', 'When enabled breadcrumbs show `variable`-symbols.'),
        },
        'breadcrumbs.showConstants': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.constant', 'When enabled breadcrumbs show `constant`-symbols.'),
        },
        'breadcrumbs.showStrings': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.string', 'When enabled breadcrumbs show `string`-symbols.'),
        },
        'breadcrumbs.showNumbers': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.number', 'When enabled breadcrumbs show `number`-symbols.'),
        },
        'breadcrumbs.showBooleans': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.boolean', 'When enabled breadcrumbs show `boolean`-symbols.'),
        },
        'breadcrumbs.showArrays': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.array', 'When enabled breadcrumbs show `array`-symbols.'),
        },
        'breadcrumbs.showObjects': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.object', 'When enabled breadcrumbs show `object`-symbols.'),
        },
        'breadcrumbs.showKeys': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.key', 'When enabled breadcrumbs show `key`-symbols.'),
        },
        'breadcrumbs.showNull': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.null', 'When enabled breadcrumbs show `null`-symbols.'),
        },
        'breadcrumbs.showEnumMembers': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.enumMember', 'When enabled breadcrumbs show `enumMember`-symbols.'),
        },
        'breadcrumbs.showStructs': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.struct', 'When enabled breadcrumbs show `struct`-symbols.'),
        },
        'breadcrumbs.showEvents': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.event', 'When enabled breadcrumbs show `event`-symbols.'),
        },
        'breadcrumbs.showOperators': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.operator', 'When enabled breadcrumbs show `operator`-symbols.'),
        },
        'breadcrumbs.showTypeParameters': {
            type: 'boolean',
            default: true,
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            markdownDescription: localize('filteredTypes.typeParameter', 'When enabled breadcrumbs show `typeParameter`-symbols.'),
        },
    },
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYnJlYWRjcnVtYnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBR2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUs3QyxPQUFPLEVBQ04sVUFBVSxHQUdWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFHM0UsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQiwyQkFBMkIsQ0FBQyxDQUFBO0FBVXBHLE1BQU0sT0FBTyxrQkFBa0I7SUFBL0I7UUFHa0IsU0FBSSxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFBO0lBZTdELENBQUM7SUFiQSxRQUFRLENBQUMsS0FBYSxFQUFFLE1BQXlCO1FBQ2hELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3pELENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUIsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7U0FDdEMs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