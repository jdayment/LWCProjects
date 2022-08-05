import { LightningElement, wire, track } from 'lwc';
import Id from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import CONTACT_ID from '@salesforce/schema/User.ContactId';
import getPartnerProfile from '@salesforce/apex/PartnerPortalSiteController.getPartnerProfile';

export default class PartnerProfile extends LightningElement {
    userId = Id;
    contactId;
    error;
    imageURL;
    hasLoaded = false;
    @track partnerProfileList = [];
    @track partnerProfileGroupList = [];
    dlx_url = 'https://www.deluxe.com/about/strategic-partnerships/';

    @wire(getRecord, { recordId: Id, fields: [CONTACT_ID]}) 
    userDetails({error, data}) {
        if (data) {
            this.contactId = data.fields.ContactId.value;
        } else if (error) {
            this.error = true ;
        }
    }

    @wire(getPartnerProfile, { contactId: '$contactId' })
    profileList({error, data}){
        if (data) {
            this.partnerProfileList = JSON.parse(data);
            this.imageURL = this.partnerProfileList.length > 0 ? this.partnerProfileList[0].logo : '';
            this.partnerProfileList.forEach((data) => {
            const groupModel = this.partnerProfileGroupList.find(element => element.Model == data.programModel);
            if(groupModel == undefined){
                let profile = {
                    Model: data.programModel,
                    Programs : [{
                        Name: data.programName,
                        Level: data.programLevel
                    }]
                };
                this.partnerProfileGroupList.push(profile);
            }else{
                groupModel.Programs.push({
                    Name: data.programName,
                    Level: data.programLevel
                });
            }
            });
        } else if (error) {
            this.error = true ;
        }
        this.hasLoaded = true;
    }
}

/* JSON structure of partnerProfileGroupList
[
    {
        Model: '',
        Programs: [{Name:'',Level:''},{Name:'',Level:''}]
    },
    {
        Model: '',
        Programs: []
    }
]                                   
*/