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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRwdXRSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL25vdGVib29rT3V0cHV0UmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBZS9ELE1BQU0sY0FBYztJQUluQixZQUFZLEtBQXVCO1FBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELG1GQUFtRjtJQUM1RSxPQUFPLENBQUMsU0FBZ0M7UUFDOUMscUVBQXFFO1FBQ3JFLHlEQUF5RDtRQUN6RCxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDBCQUEwQjtJQWV0QyxZQUFZLFVBU1g7UUFDQSxJQUFJLENBQUMsRUFBRSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUE7UUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQTtRQUNsRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsVUFBVSxDQUFDLFNBQVMs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