# HubSpot Email Import Feature

## Overview
Automatically create customers and projects from HubSpot deal notification emails. The system parses the email content and extracts all relevant information to create a new project entry.

## How to Use

### Method 1: Via UI (Recommended)
1. Navigate to **Customers & Projects** page
2. Click the **"Import from Email"** button (envelope icon)
3. Paste the entire HubSpot deal notification email into the text area
4. Click **"Import"**
5. The system will automatically create the project with all extracted data

### Method 2: Via API
Send a POST request to the email import endpoint:

```bash
curl -X POST http://localhost:3002/api/import/hubspot-email \
  -H "Content-Type: application/json" \
  -d '{"emailContent": "YOUR_EMAIL_CONTENT_HERE"}'
```

## Email Format Expected

The parser looks for these fields in the email:

### Required Fields
- **Customer**: Company name
- **Deal Name**: Used as project name

### Optional Fields
- **Deal amount**: Stored in metadata
- **Close Date**: Mapped to Activity Close Date
- **Region**: Mapped to system regions (US, UK, Canada, Israel)
- **Product/Service Sold**: Mapped to project type (AI, Software, Hybrid)
- **Account Executive**: Mapped to PMO Contact
- **Lead P&L**: Stored in metadata
- **Other P&Ls involved**: Stored in metadata
- **Estimated work start date**: Stored in metadata
- **Deal Type**: Stored in metadata
- **HubSpot URL**: Stored in metadata for reference

## Example Email

```
Deal Closed Won: Hedros Biotechnology - IoT Assessment - OCT 25

Hi Team,

I'm excited to announce that we've officially closed the deal with Hedros Biotechnology!

Deal Details:
Customer: Hedros Biotechnology
Deal Name: Hedros Biotechnology - IoT Assessment - OCT 25
Deal amount: $10,000
Close Date: 11/20/25
Region: United States
Product/Service Sold: IOT Project
Account Executive: Drew Gallant
Lead P&L: Software
Other P&Ls involved: Cloud / AWS, AI/ML

You can find more details here:
https://app-eu1.hubspot.com/contacts/145492876/record/0-3/311147105469
```

## Field Mapping

### Region Mapping
The parser automatically maps region names to system values:
- "United States", "US", "USA" → **US**
- "United Kingdom", "UK" → **UK**
- "Canada" → **Canada**
- "Israel" → **Israel**

### Project Type Mapping
Based on product/service description:
- Contains "AI" or "ML" → **AI**
- Contains "Hybrid" or both "AI" and "Software" → **Hybrid**
- Default → **Software**

### Date Parsing
Supports multiple date formats:
- MM/DD/YY (e.g., 11/20/25)
- MM/DD/YYYY (e.g., 11/20/2025)
- ISO format (e.g., 2025-11-20)
- Standard date strings

## Created Project Structure

The imported project will have:

```javascript
{
  id: "auto-generated-uuid",
  customerId: "auto-generated-uuid",
  customerName: "Hedros Biotechnology",
  projectName: "Hedros Biotechnology - IoT Assessment - OCT 25",
  projectType: "Software",
  status: "Active",
  region: "US",
  activityCloseDate: "2025-11-20",
  pmoContact: "Drew Gallant",
  isArchived: false,
  metadata: {
    dealAmount: 10000,
    dealType: "New logo",
    leadPL: "Software",
    otherPLs: ["Cloud / AWS", "AI/ML"],
    workStartDate: null,
    hubspotUrl: "https://app-eu1.hubspot.com/contacts/145492876/record/0-3/311147105469",
    importedFrom: "hubspot-email",
    importedAt: "2025-11-23T..."
  }
}
```

## API Response

### Success Response
```json
{
  "success": true,
  "project": { /* full project object */ },
  "parsedData": { /* extracted data from email */ }
}
```

### Error Response
```json
{
  "error": "Could not extract required fields (Customer and Project Name) from email",
  "parsedData": { /* partial data that was extracted */ }
}
```

## Troubleshooting

### "Could not extract required fields"
- Ensure the email contains "Customer:" and "Deal Name:" fields
- Check that the email format matches HubSpot's standard notification format

### Wrong region or project type
- The parser uses keyword matching
- You can manually edit the project after import if needed

### Missing data
- Optional fields that aren't found in the email will be left empty
- All extracted data is stored, even if not displayed in the main UI
- Check the project's metadata for additional information

## Future Enhancements

Potential improvements:
- Email forwarding address (forward@yourapp.com)
- Automatic email polling from inbox
- Support for other CRM systems (Salesforce, Pipedrive, etc.)
- Bulk email import
- Email template customization
- Duplicate detection

## Technical Details

### Files
- `server/emailParser.js` - Email parsing logic
- `server/server.js` - API endpoint (`/api/import/hubspot-email`)
- `src/pages/ProjectManagement.tsx` - UI component

### Testing
Run the test script to verify parsing:
```bash
node server/test-email-parser.js
```

### Dependencies
- No additional dependencies required
- Uses built-in Node.js crypto module
- Pure JavaScript regex parsing
