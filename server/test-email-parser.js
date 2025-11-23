// Test script for email parser
import { parseHubSpotEmail, convertToProject } from './emailParser.js';

const testEmail = `Deal Closed Won: Hedros Biotechnology - IoT Assessment - OCT 25Hi Team,I'm excited to announce that we've officially closed the deal with Hedros Biotechnology! This is a significant win for our global operations, and I'd like to take a moment to highlight the collaboration that led to this success.Deal Details:Customer: Hedros BiotechnologyDescription of what the customer does: Deal Name: Hedros Biotechnology - IoT Assessment - OCT 25Deal amount: $10,000TCV: $10,000.00MRR: $0.00Deal Type: New logoClose Date: 11/20/25Region: United StatesProduct/Service Sold: IOT ProjectAccount Executive: Drew GallantEstimated work start date:Lead P&L: SoftwareOther P&Ls involved: Cloud / AWS, AI/ML.Collaboration & Key Contributors:Deal Collaborators:Client Partner (Account level) / CSM: Drew GallantYou can find more details here:https://app-eu1.hubspot.com/contacts/145492876/record/0-3/311147105469Let's celebrate this win and keep pushing forward across all regions. If anyone has questions or needs additional information, feel free to reach out!Best regards, Drew Gallant`;

console.log('Testing Email Parser...\n');
console.log('='.repeat(60));

const parsedData = parseHubSpotEmail(testEmail);
console.log('\nParsed Data:');
console.log(JSON.stringify(parsedData, null, 2));

console.log('\n' + '='.repeat(60));

const project = convertToProject(parsedData);
console.log('\nConverted Project:');
console.log(JSON.stringify(project, null, 2));

console.log('\n' + '='.repeat(60));
console.log('\n✅ Test completed successfully!');
