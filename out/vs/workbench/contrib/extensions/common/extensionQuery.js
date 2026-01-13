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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUXVlcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvblF1ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRTNGLE1BQU0sT0FBTyxLQUFLO0lBQ2pCLFlBQ1EsS0FBYSxFQUNiLE1BQWM7UUFEZCxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUVyQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFhLEVBQUUsZUFBaUQ7UUFDbEYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDM0UsSUFDQyxlQUFlLEVBQUUsWUFBWSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUM1RCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUkseUNBQXdCLENBQ3JDLEVBQ0EsQ0FBQztZQUNGLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDMUIsQ0FBQztRQUVELFFBQVEsQ0FBQyxJQUFJLENBQ1osR0FBRztZQUNGLFNBQVM7WUFDVCxhQUFhO1lBQ2IsbUJBQW1CO1lBQ25CLHNCQUFzQjtZQUN0QixZQUFZO1lBQ1osTUFBTTtTQUNOLENBQ0QsQ0FBQTtRQUNELE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxFQUFFLFlBQVksQ0FBQyxjQUFjLEVBQUUsU0FB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