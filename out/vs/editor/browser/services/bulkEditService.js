/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../base/common/uri.js';
import { isObject } from '../../../base/common/types.js';
export const IBulkEditService = createDecorator('IWorkspaceEditService');
export class ResourceEdit {
    constructor(metadata) {
        this.metadata = metadata;
    }
    static convert(edit) {
        return edit.edits.map((edit) => {
            if (ResourceTextEdit.is(edit)) {
                return ResourceTextEdit.lift(edit);
            }
            if (ResourceFileEdit.is(edit)) {
                return ResourceFileEdit.lift(edit);
            }
            throw new Error('Unsupported edit');
        });
    }
}
export class ResourceTextEdit extends ResourceEdit {
    static is(candidate) {
        if (candidate instanceof ResourceTextEdit) {
            return true;
        }
        return (isObject(candidate) &&
            URI.isUri(candidate.resource) &&
            isObject(candidate.textEdit));
    }
    static lift(edit) {
        if (edit instanceof ResourceTextEdit) {
            return edit;
        }
        else {
            return new ResourceTextEdit(edit.resource, edit.textEdit, edit.versionId, edit.metadata);
        }
    }
    constructor(resource, textEdit, versionId = undefined, metadata) {
        super(metadata);
        this.resource = resource;
        this.textEdit = textEdit;
        this.versionId = versionId;
    }
}
export class ResourceFileEdit extends ResourceEdit {
    static is(candidate) {
        if (candidate instanceof ResourceFileEdit) {
            return true;
        }
        else {
            return (isObject(candidate) &&
                (Boolean(candidate.newResource) ||
                    Boolean(candidate.oldResource)));
        }
    }
    static lift(edit) {
        if (edit instanceof ResourceFileEdit) {
            return edit;
        }
        else {
            return new ResourceFileEdit(edit.oldResource, edit.newResource, edit.options, edit.metadata);
        }
    }
    constructor(oldResource, newResource, options = {}, metadata) {
        super(metadata);
        this.oldResource = oldResource;
        this.newResource = newResource;
        this.options = options;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvc2VydmljZXMvYnVsa0VkaXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUd6RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBSXhELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsdUJBQXVCLENBQUMsQ0FBQTtBQUUxRixNQUFNLE9BQU8sWUFBWTtJQUN4QixZQUErQixRQUFnQztRQUFoQyxhQUFRLEdBQVIsUUFBUSxDQUF3QjtJQUFHLENBQUM7SUFFbkUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFtQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDOUIsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkMsQ0FBQztZQUVELElBQUksZ0JBQWdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ25DLENBQUM7WUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsWUFBWTtJQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQWM7UUFDdkIsSUFBSSxTQUFTLFlBQVksZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLENBQ04sUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUNuQixHQUFHLENBQUMsS0FBSyxDQUFzQixTQUFVLENBQUMsUUFBUSxDQUFDO1lBQ25ELFFBQVEsQ0FBc0IsU0FBVSxDQUFDLFFBQVEsQ0FBQyxDQUNsRCxDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBd0I7UUFDbkMsSUFBSSxJQUFJLFlBQVksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN6RixDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQ1UsUUFBYSxFQUNiLFFBQTRFLEVBQzVFLFlBQWdDLFNBQVMsRUFDbEQsUUFBZ0M7UUFFaEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBTE4sYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNiLGFBQVEsR0FBUixRQUFRLENBQW9FO1FBQzVFLGNBQVMsR0FBVCxTQUFTLENBQWdDO0lBSW5ELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxZQUFZO0lBQ2pELE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBYztRQUN2QixJQUFJLFNBQVMsWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQ04sUUFBUSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsQ0FBQyxPQUFPLENBQXNCLFNBQVUsQ0FBQyxXQUFXLENBQUM7b0JBQ3BELE9BQU8sQ0FBc0IsU0FBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQ3RELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBd0I7UUFDbkMsSUFBSSxJQUFJLFlBQVksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM3RixDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQ1UsV0FBNEIsRUFDNUIsV0FBNEIsRUFDNUIsVUFBb0MsRUFBRSxFQUMvQyxRQUFnQztRQUVoQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFMTixnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7UUFDNUIsZ0JBQVcsR0FBWCxXQUFXLENBQWlCO1FBQzVCLFlBQU8sR0FBUCxPQUFPLENBQStCO0lBSWhELENBQUM7Q0FDRCJ9