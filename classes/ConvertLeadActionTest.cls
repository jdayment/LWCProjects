@isTest
public class ConvertLeadActionTest {
    @isTest static void testConvertLeads() {
        // Create a Lead
        Lead testLead = new Lead(LastName='Test Lead', Company='Test Company');
        insert testLead;

        // Create a ConvertLeadActionRequest
        ConvertLeadAction.ConvertLeadActionRequest request = new ConvertLeadAction.ConvertLeadActionRequest();
        request.leadId = testLead.Id;
        request.convertedStatus = 'Closed - Converted';

        // Call the ConvertLeadAction method
        List<ConvertLeadAction.ConvertLeadActionRequest> requests = new List<ConvertLeadAction.ConvertLeadActionRequest>();
        requests.add(request);
        List<ConvertLeadAction.ConvertLeadActionResult> results = ConvertLeadAction.convertLeads(requests);

        // Verify the Lead was converted
        System.assertEquals(1, results.size(), 'Expected one result');
        ConvertLeadAction.ConvertLeadActionResult result = results[0];
        System.assertNotEquals(null, result.accountId, 'Expected an Account ID');
        System.assertNotEquals(null, result.contactId, 'Expected a Contact ID');
        System.assertEquals(null, result.opportunityId, 'Did not expect an Opportunity ID');

        // Verify the Lead is converted
        testLead = [SELECT IsConverted FROM Lead WHERE Id = :testLead.Id];
        System.assertEquals(true, testLead.IsConverted, 'Expected the Lead to be converted');
    }

    @isTest static void testConvertLeadWithInvalidLeadId() {
        // Create a ConvertLeadActionRequest with an invalid leadId
        ConvertLeadAction.ConvertLeadActionRequest request = new ConvertLeadAction.ConvertLeadActionRequest();
        request.leadId = 'invalidLeadId';
        request.convertedStatus = 'Closed - Converted';

        // Call the ConvertLeadAction method
        List<ConvertLeadAction.ConvertLeadActionRequest> requests = new List<ConvertLeadAction.ConvertLeadActionRequest>();
        requests.add(request);
        try {
            ConvertLeadAction.convertLeads(requests);
            System.assert(false, 'Expected an exception to be thrown');
        } catch (ConvertLeadAction.ConvertLeadActionException ex) {
            System.assertEquals('Invalid leadId', ex.getMessage(), 'Expected a specific exception message');
        }
    }

    @isTest static void testConvertLeadWithAlreadyConvertedLead() {
        // Create a Lead and convert it
        Lead testLead = new Lead(LastName='Test Lead', Company='Test Company');
        insert testLead;
        Database.LeadConvert lc = new Database.LeadConvert();
        lc.setLeadId(testLead.Id);
        lc.setConvertedStatus('Closed - Converted');
        Database.LeadConvertResult lcr = Database.convertLead(lc);
        System.assert(lcr.isSuccess(), 'Expected the Lead to be successfully converted');

        // Create a ConvertLeadActionRequest for the already converted Lead
        ConvertLeadAction.ConvertLeadActionRequest request = new ConvertLeadAction.ConvertLeadActionRequest();
        request.leadId = testLead.Id;
        request.convertedStatus = 'Closed - Converted';

        // Call the ConvertLeadAction method
        List<ConvertLeadAction.ConvertLeadActionRequest> requests = new List<ConvertLeadAction.ConvertLeadActionRequest>();
        requests.add(request);
        try {
            ConvertLeadAction.convertLeads(requests);
            System.assert(false, 'Expected an exception to be thrown');
        } catch (ConvertLeadAction.ConvertLeadActionException ex) {
            System.assertEquals('Lead has already been converted', ex.getMessage(), 'Expected a specific exception message');
        }
    }

    @isTest static void testConvertLeadWithInvalidConvertedStatus() {
        // Create a Lead
        Lead testLead = new Lead(LastName='Test Lead', Company='Test Company');
        insert testLead;

        // Create a ConvertLeadActionRequest with an invalid convertedStatus
        ConvertLeadAction.ConvertLeadActionRequest request = new ConvertLeadAction.ConvertLeadActionRequest();
        request.leadId = testLead.Id;
        request.convertedStatus = 'Invalid Status';

        // Call the ConvertLeadAction method
        List<ConvertLeadAction.ConvertLeadActionRequest> requests = new List<ConvertLeadAction.ConvertLeadActionRequest>();
        requests.add(request);
        try {
            ConvertLeadAction.convertLeads(requests);
            System.assert(false, 'Expected an exception to be thrown');
        } catch (ConvertLeadAction.ConvertLeadActionException ex) {
            System.assertEquals('Invalid convertedStatus', ex.getMessage(), 'Expected a specific exception message');
        }
    }

    @isTest static void testConvertLeadsEmptyRequestList() {
        // Call the ConvertLeadAction method with an empty list of requests
        List<ConvertLeadAction.ConvertLeadActionRequest> requests = new List<ConvertLeadAction.ConvertLeadActionRequest>();
        List<ConvertLeadAction.ConvertLeadActionResult> results = ConvertLeadAction.convertLeads(requests);

        // Verify no results are returned
        System.assertEquals(0, results.size(), 'Expected no results');
    }

    @isTest static void testConvertLeadWithOpportunityName() {
        // Create a Lead
        Lead testLead = new Lead(LastName='Test Lead', Company='Test Company');
        insert testLead;

        // Create a ConvertLeadActionRequest with opportunityName
        ConvertLeadAction.ConvertLeadActionRequest request = new ConvertLeadAction.ConvertLeadActionRequest();
        request.leadId = testLead.Id;
        request.convertedStatus = 'Closed - Converted';
        request.opportunityName = 'Test Opportunity';

        // Call the ConvertLeadAction method
        List<ConvertLeadAction.ConvertLeadActionRequest> requests = new List<ConvertLeadAction.ConvertLeadActionRequest>();
        requests.add(request);
        List<ConvertLeadAction.ConvertLeadActionResult> results = ConvertLeadAction.convertLeads(requests);

        // Verify the Lead was converted
        System.assertEquals(1, results.size(), 'Expected one result');
        ConvertLeadAction.ConvertLeadActionResult result = results[0];
        System.assertNotEquals(null, result.accountId, 'Expected an Account ID');
        System.assertNotEquals(null, result.contactId, 'Expected a Contact ID');
        System.assertEquals(null, result.opportunityId, 'Did not expect an Opportunity ID');

        // Verify the Lead is converted and an Opportunity with the specified name is created
        testLead = [SELECT IsConverted FROM Lead WHERE Id = :testLead.Id];
        System.assertEquals(true, testLead.IsConverted, 'Expected the Lead to be converted');
        Opportunity opportunity = [SELECT Name FROM Opportunity WHERE AccountId = :result.accountId];
        System.assertEquals('Test Opportunity', opportunity.Name, 'Expected Opportunity with the specified name');
    }
}