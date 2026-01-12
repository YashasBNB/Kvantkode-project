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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9icmVhZGNydW1icy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFHakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBSzdDLE9BQU8sRUFDTixVQUFVLEdBR1YsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUczRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLDJCQUEyQixDQUFDLENBQUE7QUFVcEcsTUFBTSxPQUFPLGtCQUFrQjtJQUEvQjtRQUdrQixTQUFJLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUE7SUFlN0QsQ0FBQztJQWJBLFFBQVEsQ0FBQyxLQUFhLEVBQUUsTUFBeUI7UUFDaEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLHdCQUF3QixDQUFDLENBQUE7UUFDekQsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM1QixPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztT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