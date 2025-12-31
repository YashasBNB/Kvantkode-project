/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../base/common/glob.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { joinPath } from '../../../../base/common/resources.js';
class DependencyList {
    constructor(value) {
        this.value = new Set(value);
        this.defined = this.value.size > 0;
    }
    /** Gets whether any of the 'available' dependencies match the ones in this list */
    matches(available) {
        // For now this is simple, but this may expand to support globs later
        // @see https://github.com/microsoft/vscode/issues/119899
        return available.some((v) => this.value.has(v));
    }
}
export class NotebookOutputRendererInfo {
    constructor(descriptor) {
        this.id = descriptor.id;
        this.extensionId = descriptor.extension.identifier;
        this.extensionLocation = descriptor.extension.extensionLocation;
        this.isBuiltin = descriptor.extension.isBuiltin;
        if (typeof descriptor.entrypoint === 'string') {
            this.entrypoint = {
                extends: undefined,
                path: joinPath(this.extensionLocation, descriptor.entrypoint),
            };
        }
        else {
            this.entrypoint = {
                extends: descriptor.entrypoint.extends,
                path: joinPath(this.extensionLocation, descriptor.entrypoint.path),
            };
        }
        this.displayName = descriptor.displayName;
        this.mimeTypes = descriptor.mimeTypes;
        this.mimeTypeGlobs = this.mimeTypes.map((pattern) => glob.parse(pattern));
        this.hardDependencies = new DependencyList(descriptor.dependencies ?? Iterable.empty());
        this.optionalDependencies = new DependencyList(descriptor.optionalDependencies ?? Iterable.empty());
        this.messaging = descriptor.requiresMessaging ?? "never" /* RendererMessagingSpec.Never */;
    }
    matchesWithoutKernel(mimeType) {
        if (!this.matchesMimeTypeOnly(mimeType)) {
            return 3 /* NotebookRendererMatch.Never */;
        }
        if (this.hardDependencies.defined) {
            return 0 /* NotebookRendererMatch.WithHardKernelDependency */;
        }
        if (this.optionalDependencies.defined) {
            return 1 /* NotebookRendererMatch.WithOptionalKernelDependency */;
        }
        return 2 /* NotebookRendererMatch.Pure */;
    }
    matches(mimeType, kernelProvides) {
        if (!this.matchesMimeTypeOnly(mimeType)) {
            return 3 /* NotebookRendererMatch.Never */;
        }
        if (this.hardDependencies.defined) {
            return this.hardDependencies.matches(kernelProvides)
                ? 0 /* NotebookRendererMatch.WithHardKernelDependency */
                : 3 /* NotebookRendererMatch.Never */;
        }
        return this.optionalDependencies.matches(kernelProvides)
            ? 1 /* NotebookRendererMatch.WithOptionalKernelDependency */
            : 2 /* NotebookRendererMatch.Pure */;
    }
    matchesMimeTypeOnly(mimeType) {
        if (this.entrypoint.extends) {
            // We're extending another renderer
            return false;
        }
        return (this.mimeTypeGlobs.some((pattern) => pattern(mimeType)) ||
            this.mimeTypes.some((pattern) => pattern === mimeType));
    }
}
export class NotebookStaticPreloadInfo {
    constructor(descriptor) {
        this.type = descriptor.type;
        this.entrypoint = joinPath(descriptor.extension.extensionLocation, descriptor.entrypoint);
        this.extensionLocation = descriptor.extension.extensionLocation;
        this.localResourceRoots = descriptor.localResourceRoots.map((root) => joinPath(descriptor.extension.extensionLocation, root));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRwdXRSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va091dHB1dFJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQWUvRCxNQUFNLGNBQWM7SUFJbkIsWUFBWSxLQUF1QjtRQUNsQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxtRkFBbUY7SUFDNUUsT0FBTyxDQUFDLFNBQWdDO1FBQzlDLHFFQUFxRTtRQUNyRSx5REFBeUQ7UUFDekQsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2hELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFldEMsWUFBWSxVQVNYO1FBQ0EsSUFBSSxDQUFDLEVBQUUsR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUE7UUFDbEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUE7UUFDL0Qs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