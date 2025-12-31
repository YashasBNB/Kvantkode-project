/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EXTENSION_CATEGORIES } from '../../../../platform/extensions/common/extensions.js';
export class Query {
    constructor(value, sortBy) {
        this.value = value;
        this.sortBy = sortBy;
        this.value = value.trim();
    }
    static suggestions(query, galleryManifest) {
        const commands = ['installed', 'updates', 'enabled', 'disabled', 'builtin'];
        if (galleryManifest?.capabilities.extensionQuery?.filtering?.some((c) => c.name === "Featured" /* FilterType.Featured */)) {
            commands.push('featured');
        }
        commands.push(...[
            'popular',
            'recommended',
            'recentlyPublished',
            'workspaceUnsupported',
            'deprecated',
            'sort',
        ]);
        const isCategoriesEnabled = galleryManifest?.capabilities.extensionQuery?.filtering?.some((c) => c.name === "Category" /* FilterType.Category */);
        if (isCategoriesEnabled) {
            commands.push('category');
        }
        commands.push(...['tag', 'ext', 'id', 'outdated', 'recentlyUpdated']);
        const sortCommands = [];
        if (galleryManifest?.capabilities.extensionQuery?.sorting?.some((c) => c.name === "InstallCount" /* SortBy.InstallCount */)) {
            sortCommands.push('installs');
        }
        if (galleryManifest?.capabilities.extensionQuery?.sorting?.some((c) => c.name === "WeightedRating" /* SortBy.WeightedRating */)) {
            sortCommands.push('rating');
        }
        sortCommands.push('name', 'publishedDate', 'updateDate');
        const subcommands = {
            sort: sortCommands,
            category: isCategoriesEnabled ? EXTENSION_CATEGORIES.map((c) => `"${c.toLowerCase()}"`) : [],
            tag: [''],
            ext: [''],
            id: [''],
        };
        const queryContains = (substr) => query.indexOf(substr) > -1;
        const hasSort = subcommands.sort.some((subcommand) => queryContains(`@sort:${subcommand}`));
        const hasCategory = subcommands.category.some((subcommand) => queryContains(`@category:${subcommand}`));
        return commands.flatMap((command) => {
            if ((hasSort && command === 'sort') || (hasCategory && command === 'category')) {
                return [];
            }
            if (command in subcommands) {
                return subcommands[command].map((subcommand) => `@${command}:${subcommand}${subcommand === '' ? '' : ' '}`);
            }
            else {
                return queryContains(`@${command}`) ? [] : [`@${command} `];
            }
        });
    }
    static parse(value) {
        let sortBy = '';
        value = value.replace(/@sort:(\w+)(-\w*)?/g, (match, by, order) => {
            sortBy = by;
            return '';
        });
        return new Query(value, sortBy);
    }
    toString() {
        let result = this.value;
        if (this.sortBy) {
            result = `${result}${result ? ' ' : ''}@sort:${this.sortBy}`;
        }
        return result;
    }
    isValid() {
        return !/@outdated/.test(this.value);
    }
    equals(other) {
        return this.value === other.value && this.sortBy === other.sortBy;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUXVlcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25RdWVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUUzRixNQUFNLE9BQU8sS0FBSztJQUNqQixZQUNRLEtBQWEsRUFDYixNQUFjO1FBRGQsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFdBQU0sR0FBTixNQUFNLENBQVE7UUFFckIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBYSxFQUFFLGVBQWlEO1FBQ2xGLE1BQU0sUUFBUSxHQUFHLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzNFLElBQ0MsZUFBZSxFQUFFLFlBQVksQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FDNUQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLHlDQUF3QixDQUNyQyxFQUNBLENBQUM7WUFDRixRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFCLENBQUM7UUFFRCxRQUFRLENBQUMsSUFBSSxDQUNaLEdBQUc7WUFDRixTQUFTO1lBQ1QsYUFBYTtZQUNiLG1CQUFtQjtZQUNuQixzQkFBc0I7WUFDdEIsWUFBWTtZQUNaLE1BQU07U0FDTixDQUNELENBQUE7UUFDRCxNQUFNLG1CQUFtQixHQUFHLGVBQWUsRUFBRSxZQUFZLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQ3hGLENBQUMs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