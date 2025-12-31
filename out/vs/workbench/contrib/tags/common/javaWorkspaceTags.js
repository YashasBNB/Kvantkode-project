/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const GradleDependencyLooseRegex = /group\s*:\s*[\'\"](.*?)[\'\"]\s*,\s*name\s*:\s*[\'\"](.*?)[\'\"]\s*,\s*version\s*:\s*[\'\"](.*?)[\'\"]/g;
export const GradleDependencyCompactRegex = /[\'\"]([^\'\"\s]*?)\:([^\'\"\s]*?)\:([^\'\"\s]*?)[\'\"]/g;
export const MavenDependenciesRegex = /<dependencies>([\s\S]*?)<\/dependencies>/g;
export const MavenDependencyRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
export const MavenGroupIdRegex = /<groupId>([\s\S]*?)<\/groupId>/;
export const MavenArtifactIdRegex = /<artifactId>([\s\S]*?)<\/artifactId>/;
export const JavaLibrariesToLookFor = [
    // azure mgmt sdk
    {
        predicate: (groupId, artifactId) => groupId === 'com.microsoft.azure' && artifactId === 'azure',
        tag: 'azure',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.microsoft.azure' && artifactId.startsWith('azure-mgmt-'),
        tag: 'azure',
    },
    {
        predicate: (groupId, artifactId) => groupId.startsWith('com.microsoft.azure') && artifactId.startsWith('azure-mgmt-'),
        tag: 'azure',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure.resourcemanager' && artifactId.startsWith('azure-resourcemanager'),
        tag: 'azure',
    }, // azure track2 sdk
    // java ee
    {
        predicate: (groupId, artifactId) => groupId === 'javax' && artifactId === 'javaee-api',
        tag: 'javaee',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'javax.xml.bind' && artifactId === 'jaxb-api',
        tag: 'javaee',
    },
    // jdbc
    {
        predicate: (groupId, artifactId) => groupId === 'mysql' && artifactId === 'mysql-connector-java',
        tag: 'jdbc',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.microsoft.sqlserver' && artifactId === 'mssql-jdbc',
        tag: 'jdbc',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.oracle.database.jdbc' && artifactId.startsWith('ojdbc'),
        tag: 'jdbc',
    },
    // jpa
    { predicate: (groupId, artifactId) => groupId === 'org.hibernate', tag: 'jpa' },
    {
        predicate: (groupId, artifactId) => groupId === 'org.eclipse.persistence' && artifactId === 'eclipselink',
        tag: 'jpa',
    },
    // lombok
    { predicate: (groupId, artifactId) => groupId === 'org.projectlombok', tag: 'lombok' },
    // redis
    {
        predicate: (groupId, artifactId) => groupId === 'org.springframework.data' && artifactId === 'spring-data-redis',
        tag: 'redis',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'redis.clients' && artifactId === 'jedis',
        tag: 'redis',
    },
    { predicate: (groupId, artifactId) => groupId === 'org.redisson', tag: 'redis' },
    {
        predicate: (groupId, artifactId) => groupId === 'io.lettuce' && artifactId === 'lettuce-core',
        tag: 'redis',
    },
    // spring boot
    { predicate: (groupId, artifactId) => groupId === 'org.springframework.boot', tag: 'springboot' },
    // sql
    { predicate: (groupId, artifactId) => groupId === 'org.jooq', tag: 'sql' },
    { predicate: (groupId, artifactId) => groupId === 'org.mybatis', tag: 'sql' },
    // unit test
    {
        predicate: (groupId, artifactId) => groupId === 'org.junit.jupiter' && artifactId === 'junit-jupiter-api',
        tag: 'unitTest',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'junit' && artifactId === 'junit',
        tag: 'unitTest',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'org.testng' && artifactId === 'testng',
        tag: 'unitTest',
    },
    // cosmos
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId.includes('cosmos'),
        tag: 'azure-cosmos',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure.spring' && artifactId.includes('cosmos'),
        tag: 'azure-cosmos',
    },
    // storage account
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId.includes('azure-storage'),
        tag: 'azure-storage',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure.spring' && artifactId.includes('storage'),
        tag: 'azure-storage',
    },
    // service bus
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-messaging-servicebus',
        tag: 'azure-servicebus',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure.spring' && artifactId.includes('servicebus'),
        tag: 'azure-servicebus',
    },
    // event hubs
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId.startsWith('azure-messaging-eventhubs'),
        tag: 'azure-eventhubs',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure.spring' && artifactId.includes('eventhubs'),
        tag: 'azure-eventhubs',
    },
    // ai related libraries
    { predicate: (groupId, artifactId) => groupId === 'dev.langchain4j', tag: 'langchain4j' },
    { predicate: (groupId, artifactId) => groupId === 'io.springboot.ai', tag: 'springboot-ai' },
    {
        predicate: (groupId, artifactId) => groupId === 'com.microsoft.semantic-kernel',
        tag: 'semantic-kernel',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-anomalydetector',
        tag: 'azure-ai-anomalydetector',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-formrecognizer',
        tag: 'azure-ai-formrecognizer',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-documentintelligence',
        tag: 'azure-ai-documentintelligence',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-translation-document',
        tag: 'azure-ai-translation-document',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-personalizer',
        tag: 'azure-ai-personalizer',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-translation-text',
        tag: 'azure-ai-translation-text',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-contentsafety',
        tag: 'azure-ai-contentsafety',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-vision-imageanalysis',
        tag: 'azure-ai-vision-imageanalysis',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-textanalytics',
        tag: 'azure-ai-textanalytics',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-search-documents',
        tag: 'azure-search-documents',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-documenttranslator',
        tag: 'azure-ai-documenttranslator',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-vision-face',
        tag: 'azure-ai-vision-face',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-openai-assistants',
        tag: 'azure-ai-openai-assistants',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.microsoft.azure.cognitiveservices',
        tag: 'azure-cognitiveservices',
    },
    {
        predicate: (groupId, artifactId) => groupId === 'com.microsoft.cognitiveservices.speech',
        tag: 'azure-cognitiveservices-speech',
    },
    // open ai
    {
        predicate: (groupId, artifactId) => groupId === 'com.theokanning.openai-gpt3-java',
        tag: 'openai',
    },
    // azure open ai
    {
        predicate: (groupId, artifactId) => groupId === 'com.azure' && artifactId === 'azure-ai-openai',
        tag: 'azure-openai',
    },
    // Azure Functions
    {
        predicate: (groupId, artifactId) => groupId === 'com.microsoft.azure.functions' && artifactId === 'azure-functions-java-library',
        tag: 'azure-functions',
    },
    // quarkus
    { predicate: (groupId, artifactId) => groupId === 'io.quarkus', tag: 'quarkus' },
    // microprofile
    {
        predicate: (groupId, artifactId) => groupId.startsWith('org.eclipse.microprofile'),
        tag: 'microprofile',
    },
    // micronaut
    { predicate: (groupId, artifactId) => groupId === 'io.micronaut', tag: 'micronaut' },
    // GraalVM
    { predicate: (groupId, artifactId) => groupId.startsWith('org.graalvm'), tag: 'graalvm' },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamF2YVdvcmtzcGFjZVRhZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YWdzL2NvbW1vbi9qYXZhV29ya3NwYWNlVGFncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FDdEMseUdBQXlHLENBQUE7QUFDMUcsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQ3hDLDBEQUEwRCxDQUFBO0FBRTNELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLDJDQUEyQyxDQUFBO0FBQ2pGLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLHVDQUF1QyxDQUFBO0FBQzNFLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGdDQUFnQyxDQUFBO0FBQ2pFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLHNDQUFzQyxDQUFBO0FBRTFFLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUc3QjtJQUNMLGlCQUFpQjtJQUNqQjtRQUNDLFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxxQkFBcUIsSUFBSSxVQUFVLEtBQUssT0FBTztRQUMvRixHQUFHLEVBQUUsT0FBTztLQUNaO0lBQ0Q7UUFDQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FDbEMsT0FBTyxLQUFLLHFCQUFxQixJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQzFFLEdBQUcsRUFBRSxPQUFPO0tBQ1o7SUFDRDtRQUNDLFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUNsQyxPQUFPLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENB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