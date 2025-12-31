/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { getCompressedContent } from '../../../base/common/jsonSchema.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../registry/common/platform.js';
export const Extensions = {
    JSONContribution: 'base.contributions.json',
};
function normalizeId(id) {
    if (id.length > 0 && id.charAt(id.length - 1) === '#') {
        return id.substring(0, id.length - 1);
    }
    return id;
}
class JSONContributionRegistry {
    constructor() {
        this.schemasById = {};
        this.schemaAssociations = {};
        this._onDidChangeSchema = new Emitter();
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this._onDidChangeSchemaAssociations = new Emitter();
        this.onDidChangeSchemaAssociations = this._onDidChangeSchemaAssociations.event;
    }
    registerSchema(uri, unresolvedSchemaContent, store) {
        const normalizedUri = normalizeId(uri);
        this.schemasById[normalizedUri] = unresolvedSchemaContent;
        this._onDidChangeSchema.fire(uri);
        if (store) {
            store.add(toDisposable(() => {
                delete this.schemasById[normalizedUri];
                this._onDidChangeSchema.fire(uri);
            }));
        }
    }
    registerSchemaAssociation(uri, glob) {
        const normalizedUri = normalizeId(uri);
        if (!this.schemaAssociations[normalizedUri]) {
            this.schemaAssociations[normalizedUri] = [];
        }
        if (!this.schemaAssociations[normalizedUri].includes(glob)) {
            this.schemaAssociations[normalizedUri].push(glob);
            this._onDidChangeSchemaAssociations.fire();
        }
        return toDisposable(() => {
            const associations = this.schemaAssociations[normalizedUri];
            if (associations) {
                const index = associations.indexOf(glob);
                if (index !== -1) {
                    associations.splice(index, 1);
                    if (associations.length === 0) {
                        delete this.schemaAssociations[normalizedUri];
                    }
                    this._onDidChangeSchemaAssociations.fire();
                }
            }
        });
    }
    notifySchemaChanged(uri) {
        this._onDidChangeSchema.fire(uri);
    }
    getSchemaContributions() {
        return {
            schemas: this.schemasById,
        };
    }
    getSchemaContent(uri) {
        const schema = this.schemasById[uri];
        return schema ? getCompressedContent(schema) : undefined;
    }
    hasSchemaContent(uri) {
        return !!this.schemasById[uri];
    }
    getSchemaAssociations() {
        return this.schemaAssociations;
    }
}
const jsonContributionRegistry = new JSONContributionRegistry();
platform.Registry.add(Extensions.JSONContribution, jsonContributionRegistry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkNvbnRyaWJ1dGlvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vanNvbnNjaGVtYXMvY29tbW9uL2pzb25Db250cmlidXRpb25SZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG9CQUFvQixFQUFlLE1BQU0sb0NBQW9DLENBQUE7QUFDdEYsT0FBTyxFQUFnQyxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEtBQUssUUFBUSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixnQkFBZ0IsRUFBRSx5QkFBeUI7Q0FDM0MsQ0FBQTtBQTJDRCxTQUFTLFdBQVcsQ0FBQyxFQUFVO0lBQzlCLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBQ0QsT0FBTyxFQUFFLENBQUE7QUFDVixDQUFDO0FBRUQsTUFBTSx3QkFBd0I7SUFBOUI7UUFDa0IsZ0JBQVcsR0FBa0MsRUFBRSxDQUFBO1FBQy9DLHVCQUFrQixHQUFnQyxFQUFFLENBQUE7UUFFcEQsdUJBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQTtRQUNsRCxzQkFBaUIsR0FBa0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQUV4RCxtQ0FBOEIsR0FBRyxJ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