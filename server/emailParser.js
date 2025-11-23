// Email parser for HubSpot deal notifications
import crypto from 'crypto';

/**
 * Parse HubSpot deal email content and extract structured data
 * @param {string} emailContent - Raw email content
 * @returns {object} Parsed deal data
 */
function parseHubSpotEmail(emailContent) {
  const data = {
    customer: null,
    projectName: null,
    dealAmount: null,
    closeDate: null,
    region: null,
    projectType: null,
    accountExecutive: null,
    leadPL: null,
    otherPLs: [],
    workStartDate: null,
    dealType: null,
    hubspotUrl: null
  };

  // Extract customer name
  const customerMatch = emailContent.match(/Customer:\s*([^\n]+)/i);
  if (customerMatch) {
    data.customer = customerMatch[1].trim();
  }

  // Extract deal/project name
  const dealNameMatch = emailContent.match(/Deal Name:\s*([^\n]+)/i);
  if (dealNameMatch) {
    data.projectName = dealNameMatch[1].trim();
  }

  // Extract deal amount
  const amountMatch = emailContent.match(/Deal amount:\s*\$?([\d,]+)/i);
  if (amountMatch) {
    data.dealAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Extract close date
  const closeDateMatch = emailContent.match(/Close Date:\s*([^\n]+)/i);
  if (closeDateMatch) {
    data.closeDate = parseDate(closeDateMatch[1].trim());
  }

  // Extract region and map to system values
  const regionMatch = emailContent.match(/Region:\s*([^\n]+)/i);
  if (regionMatch) {
    const region = regionMatch[1].trim();
    data.region = mapRegion(region);
  }

  // Extract product/service and map to project type
  const productMatch = emailContent.match(/Product\/Service Sold:\s*([^\n]+)/i);
  if (productMatch) {
    const product = productMatch[1].trim();
    data.projectType = mapProjectType(product);
  }

  // Extract account executive
  const aeMatch = emailContent.match(/Account Executive:\s*([^\n]+)/i);
  if (aeMatch) {
    data.accountExecutive = aeMatch[1].trim();
  }

  // Extract lead P&L
  const leadPLMatch = emailContent.match(/Lead P&L:\s*([^\n]+)/i);
  if (leadPLMatch) {
    data.leadPL = leadPLMatch[1].trim();
  }

  // Extract other P&Ls
  const otherPLMatch = emailContent.match(/Other P&Ls involved:\s*([^\n]+)/i);
  if (otherPLMatch) {
    data.otherPLs = otherPLMatch[1].split(',').map(pl => pl.trim()).filter(pl => pl);
  }

  // Extract work start date
  const workStartMatch = emailContent.match(/Estimated work start date:\s*([^\n]+)/i);
  if (workStartMatch && workStartMatch[1].trim()) {
    data.workStartDate = parseDate(workStartMatch[1].trim());
  }

  // Extract deal type
  const dealTypeMatch = emailContent.match(/Deal Type:\s*([^\n]+)/i);
  if (dealTypeMatch) {
    data.dealType = dealTypeMatch[1].trim();
  }

  // Extract HubSpot URL
  const urlMatch = emailContent.match(/(https:\/\/app[^\s]+)/i);
  if (urlMatch) {
    data.hubspotUrl = urlMatch[1].trim();
  }

  return data;
}

/**
 * Map region names to system values
 */
function mapRegion(regionText) {
  const regionMap = {
    'united states': 'US',
    'us': 'US',
    'usa': 'US',
    'united kingdom': 'UK',
    'uk': 'UK',
    'canada': 'Canada',
    'israel': 'Israel'
  };

  const normalized = regionText.toLowerCase().trim();
  return regionMap[normalized] || null;
}

/**
 * Map product/service to project type
 */
function mapProjectType(productText) {
  const lower = productText.toLowerCase();
  
  if (lower.includes('ai') || lower.includes('ml') || lower.includes('machine learning')) {
    return 'AI';
  }
  
  if (lower.includes('hybrid') || (lower.includes('ai') && lower.includes('software'))) {
    return 'Hybrid';
  }
  
  return 'Software';
}

/**
 * Parse various date formats
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === '') return null;

  // Try MM/DD/YY format
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    year = year.length === 2 ? `20${year}` : year;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try ISO format or other standard formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Convert parsed data to project format
 */
function convertToProject(parsedData) {
  const project = {
    customerId: crypto.randomUUID(),
    customerName: parsedData.customer,
    projectName: parsedData.projectName,
    projectType: parsedData.projectType || 'Software',
    status: 'Active',
    region: parsedData.region,
    activityCloseDate: parsedData.closeDate,
    pmoContact: parsedData.accountExecutive,
    isArchived: false,
    metadata: {
      dealAmount: parsedData.dealAmount,
      dealType: parsedData.dealType,
      leadPL: parsedData.leadPL,
      otherPLs: parsedData.otherPLs,
      workStartDate: parsedData.workStartDate,
      hubspotUrl: parsedData.hubspotUrl,
      importedFrom: 'hubspot-email',
      importedAt: new Date().toISOString()
    }
  };

  return project;
}

export {
  parseHubSpotEmail,
  convertToProject,
  mapRegion,
  mapProjectType,
  parseDate
};
