const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
function initFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const defaultKeyPath = path.resolve(__dirname, '../backend/serviceAccountKey.json');
  const envKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
    : null;

  if (fs.existsSync(defaultKeyPath)) {
    const serviceAccount = require(defaultKeyPath);
    initializeApp({ credential: cert(serviceAccount) });
  } else if (envKeyPath && fs.existsSync(envKeyPath)) {
    const serviceAccount = require(envKeyPath);
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    // Attempt default environment initialization
    initializeApp();
  }

  return getFirestore();
}

function formatEventBlock(event, index, total) {
  const divider = '='.repeat(80);
  const subDivider = '-'.repeat(80);

  const coordinators = (event.coordinators || []).map((c, i) => {
    return `    ${i + 1}. ${c.name || 'N/A'} | Phone: ${c.phone || 'N/A'} | Email: ${c.email || 'N/A'}${c.userID ? ` (ID: ${c.userID})` : ''}`;
  }).join('\n') || '    None listed';

  const customFields = (event.customFields || []).map((f, i) => {
    return `    ${i + 1}. [${f.type || 'text'}] ${f.label || f.fieldId || ''} (Required: ${!!f.required})`;
  }).join('\n') || '    None';

  const links = (event.links || []).map((l, i) => {
    const url = typeof l === 'string' ? l : (l.url || JSON.stringify(l));
    return `    ${i + 1}. ${url}`;
  }).join('\n') || '    None';

  const regFeeHost = event.registrationFee?.host ?? 0;
  const regFeeOther = event.registrationFee?.other ?? 0;

  return `
${divider}
EVENT #${index + 1} OF ${total}: ${(event.title || 'Untitled Event').toUpperCase()}
${divider}
Basic Information:
  - Event ID           : ${event.eventId || event.id || 'N/A'}
  - Title              : ${event.title || 'N/A'}
  - Category           : ${event.category || 'N/A'}
  - Event Type         : ${event.eventType || 'N/A'}
  - Is Public          : ${event.isPublic !== false ? 'Yes' : 'No'}
  - Is Featured        : ${event.isFeatured ? 'Yes' : 'No'}
  - Requires Approval  : ${event.requiresApproval ? 'Yes' : 'No'}
  - Same College Only  : ${event.sameCollegeOnly ? 'Yes' : 'No'}
  - Status             : ${event.status || 'N/A'}

Schedule & Location:
  - Venue Name         : ${event.venueName || 'N/A'}
  - Venue ID           : ${event.venueId || 'N/A'}
  - Start Date & Time  : ${event.startDateTime || event.dateTime || 'N/A'}
  - End Date & Time    : ${event.endDateTime || 'N/A'}
  - Registration Due   : ${event.registrationDeadline || 'N/A'}

Participation & Limits:
  - Min Team Size      : ${event.minTeamSize ?? 'N/A'}
  - Max Team Size      : ${event.maxTeamSize ?? 'N/A'}
  - Max Participants   : ${event.maxParticipants ?? 'N/A'}
  - Registered Count   : ${event.registeredCount ?? 0}

Fees & Payment:
  - Payment Required   : ${event.paymentRequired ? 'Yes' : 'No'}
  - Payment Started    : ${event.paymentStarted ? 'Yes' : 'No'}
  - Payment Type       : ${event.paymentType || 'N/A'}
  - Registration Fee   : Host: ₹${regFeeHost} | Other: ₹${regFeeOther}

Short Description:
  ${event.shortDescription || 'N/A'}

Full Description:
${subDivider}
${(event.description || 'N/A').trim()}
${subDivider}

Prizes & Awards:
  - Summary / Short    : ${event.shortPrizes || 'N/A'}
  - Details:
${subDivider}
${(event.prizes || 'N/A').trim()}
${subDivider}

Rules & Regulations:
${subDivider}
${(event.rules || 'N/A').trim()}
${subDivider}

Coordinators:
${coordinators}

Media & Links:
  - Cover Image        : ${event.coverImage || 'N/A'}
  - External URL       : ${event.externalUrl || 'N/A'}
  - Links:
${links}

Custom Registration Fields:
${customFields}

Timestamps & Metadata:
  - Created At         : ${event.createdAt || 'N/A'}
  - Created By         : ${event.createdBy || 'N/A'}
  - Updated At         : ${event.updatedAt || 'N/A'}

Raw JSON Data:
${JSON.stringify(event, null, 2)}
`;
}

async function fetchEventsToTxt() {
  const outputPath = process.argv[2] 
    ? path.resolve(process.argv[2]) 
    : path.resolve(__dirname, '../events.txt');

  console.log('Connecting to Firestore...');
  const db = initFirebase();

  console.log('Fetching events collection...');
  const snapshot = await db.collection('events').get();

  if (snapshot.empty) {
    console.log('No events found in the database.');
    fs.writeFileSync(outputPath, 'No events found in the database.\n');
    return;
  }

  const events = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    events.push({
      id: doc.id,
      ...data,
      eventId: data.eventId || doc.id,
    });
  });

  // Sort events alphabetically by title (or ID)
  events.sort((a, b) => (a.title || a.id || '').localeCompare(b.title || b.id || ''));

  // Calculate statistics
  const categoryCounts = {};
  events.forEach(e => {
    const cat = e.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const now = new Date().toISOString();
  let fileContent = '';

  // Header Summary
  fileContent += '#'.repeat(80) + '\n';
  fileContent += `SATURNALIA EVENTS DATA EXPORT\n`;
  fileContent += `Generated At : ${now}\n`;
  fileContent += `Total Events : ${events.length}\n`;
  fileContent += `Categories   : \n`;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    fileContent += `  - ${cat}: ${count}\n`;
  }
  fileContent += '#'.repeat(80) + '\n\n';

  fileContent += 'TABLE OF CONTENTS / EVENT LIST:\n';
  fileContent += '-'.repeat(80) + '\n';
  events.forEach((e, idx) => {
    const num = String(idx + 1).padStart(2, ' ');
    const title = (e.title || 'Untitled').padEnd(45, ' ');
    const cat = `[${e.category || 'N/A'}]`.padEnd(20, ' ');
    const id = `(ID: ${e.eventId || e.id})`;
    fileContent += `${num}. ${title} ${cat} ${id}\n`;
  });
  fileContent += '-'.repeat(80) + '\n\n';

  // Detailed event blocks
  events.forEach((event, idx) => {
    fileContent += formatEventBlock(event, idx, events.length);
  });

  fs.writeFileSync(outputPath, fileContent, 'utf8');

  const stats = fs.statSync(outputPath);
  console.log(`\nSuccessfully exported ${events.length} events to:`);
  console.log(`  -> ${outputPath}`);
  console.log(`  -> File size: ${(stats.size / 1024).toFixed(2)} KB`);
}

fetchEventsToTxt().catch(err => {
  console.error('Error fetching events:', err);
  process.exit(1);
});
