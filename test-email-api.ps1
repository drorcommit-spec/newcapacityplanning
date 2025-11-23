# PowerShell script to test HubSpot email import API

$emailContent = @"
Deal Closed Won: Hedros Biotechnology - IoT Assessment - OCT 25
Hi Team,
I'm excited to announce that we've officially closed the deal with Hedros Biotechnology! This is a significant win for our global operations, and I'd like to take a moment to highlight the collaboration that led to this success.

Deal Details:
Customer: Hedros Biotechnology
Description of what the customer does: 
Deal Name: Hedros Biotechnology - IoT Assessment - OCT 25
Deal amount: `$10,000
TCV: `$10,000.00
MRR: `$0.00
Deal Type: New logo
Close Date: 11/20/25
Region: United States
Product/Service Sold: IOT Project
Account Executive: Drew Gallant
Estimated work start date:
Lead P&L: Software
Other P&Ls involved: Cloud / AWS, AI/ML.

Collaboration & Key Contributors:
Deal Collaborators:
Client Partner (Account level) / CSM: Drew Gallant

You can find more details here:
https://app-eu1.hubspot.com/contacts/145492876/record/0-3/311147105469

Let's celebrate this win and keep pushing forward across all regions. If anyone has questions or needs additional information, feel free to reach out!

Best regards, 
Drew Gallant
"@

$body = @{
    emailContent = $emailContent
} | ConvertTo-Json

Write-Host "Testing HubSpot Email Import API..." -ForegroundColor Cyan
Write-Host "Endpoint: http://localhost:3002/api/import/hubspot-email" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/import/hubspot-email" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body

    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Make sure the server is running on port 3002" -ForegroundColor Gray
}
