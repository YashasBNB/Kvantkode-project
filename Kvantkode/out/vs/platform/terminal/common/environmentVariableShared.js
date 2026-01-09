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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNoYXJlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL2Vudmlyb25tZW50VmFyaWFibGVTaGFyZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFXaEcsOERBQThEO0FBRTlELE1BQU0sVUFBVSxzQ0FBc0MsQ0FDckQsVUFBNEQ7SUFFNUQsT0FBTyxDQUFDLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7QUFDakMsQ0FBQztBQUVELE1BQU0sVUFBVSxrQ0FBa0MsQ0FDakQsY0FBMEY7SUFFMUYsT0FBTyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO0FBQzNELENBQUM7QUFFRCxNQUFNLFVBQVUsd0NBQXdDLENBQ3ZELG9CQUFnRTtJQUVoRSxPQUFPLElBQUksR0FBRyxDQUFzQyxvQkFBb0IsQ0FBQyxDQUFBO0FBQzFFLENBQUM7QUFFRCxNQUFNLFVBQVUsb0NBQW9DLENBQ25ELGtDQUFzRjtJQUV0RixPQUFPLElBQUksR0FBRyxDQUNiLGtDQUFrQyxJQUFJLEVBQUUsQ0FDeEMsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsdUNBQXVDLENBQ3RELFdBQWdFO0lBRWhFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNsRCxPQUFPO1lBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLHNDQUFzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDaEQsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQztTQUN2RCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLHlDQUF5QyxDQUN4RCxvQkFBaUU7SUFFakUsT0FBTyxJQUFJLEdBQUcsQ0FDYixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUM5QixPQUFPO1lBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKO2dCQUNDLEdBQUcsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELGNBQWMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDMUQ7U0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtBQUNGLENBQUMifQ==