/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { executingStateIcon } from '../notebookIcons.js';
import { CellKind } from '../../common/notebookCommon.js';
import { SymbolKinds } from '../../../../../editor/common/languages.js';
export class OutlineEntry {
    get icon() {
        if (this.symbolKind) {
            return SymbolKinds.toIcon(this.symbolKind);
        }
        return this.isExecuting && this.isPaused
            ? executingStateIcon
            : this.isExecuting
                ? ThemeIcon.modify(executingStateIcon, 'spin')
                : this.cell.cellKind === CellKind.Markup
                    ? Codicon.markdown
                    : Codicon.code;
    }
    constructor(index, level, cell, label, isExecuting, isPaused, range, symbolKind) {
        this.index = index;
        this.level = level;
        this.cell = cell;
        this.label = label;
        this.isExecuting = isExecuting;
        this.isPaused = isPaused;
        this.range = range;
        this.symbolKind = symbolKind;
        this._children = [];
    }
    addChild(entry) {
        this._children.push(entry);
        entry._parent = this;
    }
    get parent() {
        return this._parent;
    }
    get children() {
        return this._children;
    }
    get markerInfo() {
        return this._markerInfo;
    }
    get position() {
        if (this.range) {
            return { startLineNumber: this.range.startLineNumber, startColumn: this.range.startColumn };
        }
        return undefined;
    }
    updateMarkers(markerService) {
        if (this.cell.cellKind === CellKind.Code) {
            // a code cell can have marker
            const marker = markerService.read({
                resource: this.cell.uri,
                severities: MarkerSeverity.Error | MarkerSeverity.Warning,
            });
            if (marker.length === 0) {
                this._markerInfo = undefined;
            }
            else {
                const topSev = marker.find((a) => a.severity === MarkerSeverity.Error)?.severity ??
                    MarkerSeverity.Warning;
                this._markerInfo = { topSev, count: marker.length };
            }
        }
        else {
            // a markdown cell can inherit markers from its children
            let topChild;
            for (const child of this.children) {
                child.updateMarkers(markerService);
                if (child.markerInfo) {
                    topChild = !topChild
                        ? child.markerInfo.topSev
                        : Math.max(child.markerInfo.topSev, topChild);
                }
            }
            this._markerInfo = topChild && { topSev: topChild, count: 0 };
        }
    }
    clearMarkers() {
        this._markerInfo = undefined;
        for (const child of this.children) {
            child.clearMarkers();
        }
    }
    find(cell, parents) {
        if (cell.id === this.cell.id) {
            return this;
        }
        parents.push(this);
        for (const child of this.children) {
            const result = child.find(cell, parents);
            if (result) {
                return result;
            }
        }
        parents.pop();
        return undefined;
    }
    asFlatList(bucket) {
        bucket.push(this);
        for (const child of this.children) {
            child.asFlatList(bucket);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3V0bGluZUVudHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvT3V0bGluZUVudHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFrQixjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsT0FBTyxFQUFjLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBT25GLE1BQU0sT0FBTyxZQUFZO0lBS3hCLElBQUksSUFBSTtRQUNQLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsUUFBUTtZQUN2QyxDQUFDLENBQUMsa0JBQWtCO1lBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVztnQkFDakIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDO2dCQUM5QyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLE1BQU07b0JBQ3ZDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUTtvQkFDbEIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7SUFDbEIsQ0FBQztJQUVELFlBQ1UsS0FBYSxFQUNiLEtBQWEsRUFDYixJQUFvQixFQUNwQixLQUFhLEVBQ2IsV0FBb0IsRUFDcEIsUUFBaUIsRUFDakIsS0FBYyxFQUNkLFVBQXVCO1FBUHZCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsU0FBSSxHQUFKLElBQUksQ0FBZ0I7UUFDcEIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGdCQUFXLEdBQVgsV0FBVyxDQUFTO1FBQ3BCLGFBQVEsR0FBUixRQUFRLENBQVM7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUztRQUNkLGVBQVUsR0FBVixVQUFVLENBQWE7UUF6QnpCLGNBQVMsR0FBbUIsRUFBRSxDQUFBO0lBMEJuQyxDQUFDO0lBRUosUUFBUSxDQUFDLEtBQW1CO1FBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFCLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzVGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsYUFBYSxDQUFDLGFBQTZCO1FBQzFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFDLDhCQUE4QjtZQUM5QixNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHO2dCQUN2QixVQUFVLEVBQUUsY0FBYyxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsT0FBTzthQUN6RCxDQUFDLENBQUE7WUFDRixJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFBO1lBQzdCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE1BQU0sR0FDWCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRO29CQUNqRSxjQUFjLENBQUMsT0FBTyxDQUFBO2dCQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDcEQsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1Asd0RBQXdEO1lBQ3hELElBQUksUUFBb0MsQ0FBQTtZQUN4QyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDbEMsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ3RCLFFBQVEsR0FBRyxDQUFDLFFBQVE7d0JBQ25CLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU07d0JBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUMvQyxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUE7UUFDOUQsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO1FBQ1gsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFDNUIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLElBQW9CLEVBQUUsT0FBdUI7UUFDakQsSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUN4QyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDYixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQXNCO1FBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=