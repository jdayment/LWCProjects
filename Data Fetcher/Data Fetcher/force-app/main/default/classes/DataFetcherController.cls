/**
 * @description       : 
 * @author            : Josh Dayment
 * @group             : 
 * @last modified on  : 02-14-2023
 * @last modified by  : Josh Dayment
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
