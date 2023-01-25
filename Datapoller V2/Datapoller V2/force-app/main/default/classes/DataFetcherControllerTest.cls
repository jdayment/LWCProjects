@isTest
public with sharing class DataFetcherControllerTest {
    public DataFetcherControllerTest() {

    }

    @isTest
    static void canQuery() {
        List<Sobject> records = DataFetcherController.getSobjects('SELECT Id FROM Account');
        System.assertNotEquals(null, records);
    }
}