import { getFieldValue } from './src/store/index.ts';

const org = { name: 'DELHI PUBLIC SCHOOL INDIRAPURAM', address: '526/1, AHINSA KHAND-II, INDIRAPURAM', phone: '01204660000', email: 'info@dpsindirapuram.com' };
const cardData = { name: 'MS. SHALOO TANDAN', role: 'SENIOR MISTRESS', contact: '9811748518' };
const el = { qrFields: ['name', 'role', 'orgName', 'orgAddress', 'contact', 'orgPhone', 'orgEmail'] };

const fields = el.qrFields;
const fieldLabelMap = {
    name: 'Name', role: 'Role', code: 'ID', dob: 'DOB', blood: 'Blood',
    contact: 'Contact', address: 'Address', issued: 'Issued', valid: 'Valid',
    emergency: 'Emergency', orgName: 'Org', orgAddress: 'Address', orgPhone: 'OrgPhone',
    orgEmail: 'OrgEmail', orgWebsite: 'Website', orgTagline: 'Tagline', orgEmergency: 'OrgEmergency',
    custom1: 'Custom1', custom2: 'Custom2', custom3: 'Custom3'
};

const lines = [];
for (const f of fields) {
    const label = fieldLabelMap[f] || f;
    const value = getFieldValue(cardData, f, org);
    if (value) lines.push(`${label}: ${value}`);
}

const result = lines.join(' / ');
console.log("QR Data:", result || cardData.code || cardData.name || 'ID');
