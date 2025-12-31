/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// This file is shared between the renderer and extension host
export function serializeEnvironmentVariableCollection(collection) {
    return [...collection.entries()];
}
export function serializeEnvironmentDescriptionMap(descriptionMap) {
    return descriptionMap ? [...descriptionMap.entries()] : [];
}
export function deserializeEnvironmentVariableCollection(serializedCollection) {
    return new Map(serializedCollection);
}
export function deserializeEnvironmentDescriptionMap(serializableEnvironmentDescription) {
    return new Map(serializableEnvironmentDescription ?? []);
}
export function serializeEnvironmentVariableCollections(collections) {
    return Array.from(collections.entries()).map((e) => {
        return [
            e[0],
            serializeEnvironmentVariableCollection(e[1].map),
            serializeEnvironmentDescriptionMap(e[1].descriptionMap),
        ];
    });
}
export function deserializeEnvironmentVariableCollections(serializedCollection) {
    return new Map(serializedCollection.map((e) => {
        return [
            e[0],
            {
                map: deserializeEnvironmentVariableCollection(e[1]),
                descriptionMap: deserializeEnvironmentDescriptionMap(e[2]),
            },
        ];
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNoYXJlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi9lbnZpcm9ubWVudFZhcmlhYmxlU2hhcmVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLDhEQUE4RDtBQUU5RCxNQUFNLFVBQVUsc0NBQXNDLENBQ3JELFVBQTREO0lBRTVELE9BQU8sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0FBQ2pDLENBQUM7QUFFRCxNQUFNLFVBQVUsa0NBQWtDLENBQ2pELGNBQTBGO0lBRTFGLE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtBQUMzRCxDQUFDO0FBRUQsTUFBTSxVQUFVLHdDQUF3QyxDQUN2RCxvQkFBZ0U7SUFFaEUsT0FBTyxJQUFJLEdBQUcsQ0FBc0Msb0JBQW9CLENBQUMsQ0FBQTtBQUMxRSxDQUFDO0FBRUQsTUFBTSxVQUFVLG9DQUFvQyxDQUNuRCxrQ0FBc0Y7SUFFdEYsT0FBTyxJQUFJLEdBQUcsQ0FDYixrQ0FBa0MsSUFBSSxFQUFFLENBQ3hDLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLHVDQUF1QyxDQUN0RCxXQUFnRTtJQUVoRSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDbEQsT0FBTztZQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixzQ0FBc0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ2hELGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUM7U0FDdkQsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSx5Q0FBeUMsQ0FDeEQsb0JBQWlFO0lBRWpFLE9BQU8sSUFBSSxHQUFHLENBQ2Isb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDOUIsT0FBTztZQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSjtnQkFDQyxHQUFHLEVBQUUsd0NBQXdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxjQUFjLEVBQUUsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzFEO1NBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7QUFDRixDQUFDIn0=