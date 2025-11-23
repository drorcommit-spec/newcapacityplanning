# Quick Start: HubSpot Email Import

## 🚀 Get Started in 3 Steps

### Step 1: Open the App
Navigate to **Customers & Projects** page in your Product Capacity Platform.

### Step 2: Click "Import from Email"
Look for the button with the envelope icon (📧) next to "Import CSV/Excel".

### Step 3: Paste & Import
1. Copy your HubSpot deal notification email
2. Paste it into the text area
3. Click "Import"
4. Done! Your project is created automatically

## 📧 Example Email to Test

```
Deal Closed Won: Hedros Biotechnology - IoT Assessment - OCT 25

Hi Team,

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

https://app-eu1.hubspot.com/contacts/145492876/record/0-3/311147105469
```

## ✅ What Gets Created

The system automatically extracts and creates:
- **Customer**: Hedros Biotechnology
- **Project**: Hedros Biotechnology - IoT Assessment - OCT 25
- **Type**: Software (auto-detected from "IOT Project")
- **Region**: US (auto-mapped from "United States")
- **Close Date**: November 20, 2025
- **PMO Contact**: Drew Gallant
- **Status**: Active (default)

Plus additional metadata like deal amount, P&Ls, and HubSpot link!

## 🎯 What You Need

**Required in Email:**
- Customer name
- Deal/Project name

**Optional (but recommended):**
- Close Date
- Region
- Product/Service type
- Account Executive
- Deal amount

## 💡 Tips

1. **Copy the entire email** - Don't worry about extra text, the parser will find what it needs
2. **Check the result** - After import, you'll see a summary of what was created
3. **Edit if needed** - You can always edit the project after import
4. **Test it first** - Use the example email above to see how it works

## 🔧 Troubleshooting

**"Could not extract required fields"**
→ Make sure your email has "Customer:" and "Deal Name:" fields

**Wrong region or type**
→ No problem! Just edit the project after import

**Server not responding**
→ Make sure the backend server is running (port 3002)

## 📚 More Info

- Full documentation: `HUBSPOT_EMAIL_IMPORT.md`
- Implementation details: `EMAIL_IMPORT_IMPLEMENTATION.md`
- Test the API: Open `test-email-import.html` in your browser

---

**That's it!** Start importing your HubSpot deals with just a copy-paste. 🎉
