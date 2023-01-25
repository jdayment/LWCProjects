public with sharing class DataFetcherController {
    @AuraEnabled
    public static List<SObject> getSobjects(String queryString){
        return Database.query(queryString);
    }
}