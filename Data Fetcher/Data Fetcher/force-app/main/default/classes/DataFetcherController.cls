/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 01-26-2023
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public with sharing class DataFetcherController {
    @AuraEnabled
    public static QueryResult getSObjects(String queryString) {
      return new QueryResult(Database.query(queryString));
    }
  
    public class QueryResult {
      public QueryResult(List<SObject> results) {
        this.results = results;
        if (this.results.isEmpty() == false) {
          this.firstResult = this.results.get(0);
        }
      }
  
      @AuraEnabled
      public final List<SObject> results;
      @AuraEnabled
      public final SObject firstResult;
    }
  }