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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamF2YVdvcmtzcGFjZVRhZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RhZ3MvY29tbW9uL2phdmFXb3Jrc3BhY2VUYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUN0Qyx5R0FBeUcsQ0FBQTtBQUMxRyxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FDeEMsMERBQTBELENBQUE7QUFFM0QsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsMkNBQTJDLENBQUE7QUFDakYsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsdUNBQXVDLENBQUE7QUFDM0UsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZ0NBQWdDLENBQUE7QUFDakUsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsc0NBQXNDLENBQUE7QUFFMUUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBRzdCO0lBQ0wsaUJBQWlCO0lBQ2pCO1FBQ0MsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsT0FBTyxLQUFLLHFCQUFxQixJQUFJLFVBQVUsS0FBSyxPQUFPO1FBQy9GLEdBQUcsRUFBRSxPQUFPO0tBQ1o7SUFDRDtRQUNDLFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUNsQyxPQUFPLEtBQUsscUJBQXFCLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7UUFDMUUsR0FBRyxFQUFFLE9BQU87S0FDWjtJQUNEO1FBQ0MsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQ2xDLE9BQU8sQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsSUFBSSxVQUFV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