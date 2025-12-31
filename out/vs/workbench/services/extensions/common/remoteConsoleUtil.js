/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse } from '../../../../base/common/console.js';
export function logRemoteEntry(logService, entry, label = null) {
    const args = parse(entry).args;
    let firstArg = args.shift();
    if (typeof firstArg !== 'string') {
        return;
    }
    if (!entry.severity) {
        entry.severity = 'info';
    }
    if (label) {
        if (!/^\[/.test(label)) {
            label = `[${label}]`;
        }
        if (!/ $/.test(label)) {
            label = `${label} `;
        }
        firstArg = label + firstArg;
    }
    switch (entry.severity) {
        case 'log':
        case 'info':
            logService.info(firstArg, ...args);
            break;
        case 'warn':
            logService.warn(firstArg, ...args);
            break;
        case 'error':
            logService.error(firstArg, ...args);
            break;
    }
}
export function logRemoteEntryIfError(logService, entry, label) {
    const args = parse(entry).args;
    const firstArg = args.shift();
    if (typeof firstArg !== 'string' || entry.severity !== 'error') {
        return;
    }
    if (!/^\[/.test(label)) {
        label = `[${label}]`;
    }
    if (!/ $/.test(label)) {
        label = `${label} `;
    }
    logService.error(label + firstArg, ...args);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQ29uc29sZVV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vcmVtb3RlQ29uc29sZVV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFxQixLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUc3RSxNQUFNLFVBQVUsY0FBYyxDQUM3QixVQUF1QixFQUN2QixLQUF3QixFQUN4QixRQUF1QixJQUFJO0lBRTNCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDOUIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQzNCLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbEMsT0FBTTtJQUNQLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3JCLEtBQUssQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ1gsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QixLQUFLLEdBQUcsSUFBSSxLQUFLLEdBQUcsQ0FBQTtRQUNyQixDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixLQUFLLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQTtRQUNwQixDQUFDO1FBQ0QsUUFBUSxHQUFHLEtBQUssR0FBRyxRQUFRLENBQUE7SUFDNUIsQ0FBQztJQUVELFFBQVEsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hCLEtBQUssS0FBSyxDQUFDO1FBQ1gsS0FBSyxNQUFNO1lBQ1YsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxNQUFLO1FBQ04sS0FBSyxNQUFNO1lBQ1YsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxNQUFLO1FBQ04sS0FBSyxPQUFPO1lBQ1gsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNuQyxNQUFLO0lBQ1AsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQ3BDLFVBQXVCLEVBQ3ZCLEtBQXdCLEVBQ3hCLEtBQWE7SUFFYixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQzlCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM3QixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQ2hFLE9BQU07SUFDUCxDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN4QixLQUFLLEdBQUcsSUFBSSxLQUFLLEdBQUcsQ0FBQTtJQUNyQixDQUFDO0lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixLQUFLLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQTtJQUNwQixDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7QUFDNUMsQ0FBQyJ9