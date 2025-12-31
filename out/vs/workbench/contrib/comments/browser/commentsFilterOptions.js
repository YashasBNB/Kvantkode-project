/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy, matchesFuzzy2 } from '../../../../base/common/filters.js';
import * as strings from '../../../../base/common/strings.js';
export class FilterOptions {
    static { this._filter = matchesFuzzy2; }
    static { this._messageFilter = matchesFuzzy; }
    constructor(filter, showResolved, showUnresolved) {
        this.filter = filter;
        this.showResolved = true;
        this.showUnresolved = true;
        filter = filter.trim();
        this.showResolved = showResolved;
        this.showUnresolved = showUnresolved;
        const negate = filter.startsWith('!');
        this.textFilter = { text: (negate ? strings.ltrim(filter, '!') : filter).trim(), negate };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNGaWx0ZXJPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c0ZpbHRlck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFXLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RixPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRTdELE1BQU0sT0FBTyxhQUFhO2FBQ1QsWUFBTyxHQUFZLGFBQWEsQUFBekIsQ0FBeUI7YUFDaEMsbUJBQWMsR0FBWSxZQUFZLEFBQXhCLENBQXdCO0lBTXRELFlBQ1UsTUFBYyxFQUN2QixZQUFxQixFQUNyQixjQUF1QjtRQUZkLFdBQU0sR0FBTixNQUFNLENBQVE7UUFMZixpQkFBWSxHQUFZLElBQUksQ0FBQTtRQUM1QixtQkFBYyxHQUFZLElBQUksQ0FBQTtRQVF0QyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO1FBRXBDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFBO0lBQzFGLENBQUMifQ==